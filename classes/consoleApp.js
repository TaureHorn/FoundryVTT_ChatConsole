import Console from "../console.js"
import ConsoleData from "./consoleData.js"

export default class ConsoleApp extends FormApplication {

    constructor(getDocument, getUser) {
        super()
        this._document = getDocument
        this._represents = getUser
    }

    _inputVal = ""

    static get defaultOptions() {
        const defaults = super.defaultOptions;
        const overrides = {
            classes: ['console-app'],
            closeOnSubmit: false,
            anchored: true,
            popOut: true,
            maximizable: true,
            minimizable: true,
            resizable: true,
        }
        return foundry.utils.mergeObject(defaults, overrides)
    }

    getData() {
        const console = ConsoleData.getConsoles().find((obj) => obj.id === this.options.id)
        let data = {
            ...console
        }

        data.character = this.getName("$user").name
        data.inputVal = this._inputVal
        this.getTemplate(data)
        this.options.anchored = data.defaultAnchor
        this.options.title = data.name
        this.data = data

        return data
    }

    _getHeaderButtons() {
        let buttons = [
            {
                class: "info",
                icon: "fas fa-circle-info",
                label: "",
                onclick: () => ui.notifications.notify(`Console | ${game.i18n.localize("CONSOLE.console.app-info")}`),
                tooltip: game.i18n.localize("CONSOLE.console.app-info")
            },
            {
                class: "anchor",
                icon: "fas fa-anchor anchorButton",
                label: "",
                onclick: () => {
                    this.options.anchored = this.options.anchored ? false : true
                    const header = this._element.find('.window-title')[0]
                    header.innerHTML = this.options.anchored ? `<i class="fas fa-anchor"></i>${header.innerText}` : `${header.innerText}`
                },
                tooltip: game.i18n.localize("CONSOLE.console.anchor-app")
            },
            {
                class: "close",
                icon: "fas fa-times",
                label: "",
                onclick: () => this.close(),
                tooltip: game.i18n.localize("CONSOLE.console.close")
            }
        ]
        if (game.user.isGM) {
            buttons.unshift(

                {
                    class: "share-image",
                    icon: "fas fa-eye",
                    label: "",
                    onclick: () => this.shareApp(),
                    tooltip: game.i18n.localize("CONSOLE.console.show-players")
                },
                {
                    class: 'copy-id',
                    icon: "fas fa-id-badge",
                    label: "",
                    onclick: () => { this.copyToClipboard(this.options.id) },
                    tooltip: `ID: ${this.options.id}`
                }
            )
        }
        return buttons
    }

    getName(str) {
        let name = ""
        const id = game.user.character?._id || game.userId
        if (game.user.isGM) {
            name = game.user.character ? `${game.user.character.name}` : str
        } else {
            name = game.user.character ? `${game.user.character.name}` : `${game.user.name}`
        }
        return {
            "id": id,
            "name": name
        }
    }

    getTemplate(data) {
        return this.options.template = data.styling.messengerStyle ? Console.TEMPLATES.APP_IM : Console.TEMPLATES.APP_TERM
    }

    activateListeners(html) {
        super.activateListeners(html)
        html.on('click', "[data-action]", this._handleLeftClick)
        html.on('contextmenu', "[data-action]", this._handleRightClick)
    }

    async close(...args) {
        if (!this.options.anchored) {
            delete this._document.apps[this.appId]
            delete this._represents.apps[this.appId]
            return super.close(...args)
        } else {
            const anchorButton = this._element[0].getElementsByClassName('fas fa-anchor anchorButton')[0]
            anchorButton.classList.add("wiggle")
            setTimeout(() => {
                anchorButton.classList.remove("wiggle")
            }, 500)
        }
    }

    copyToClipboard(text) {
        // @param {string} text
        if (typeof text === 'string') {
            try {
                if (navigator.clipboard && window.isSecureContext) {
                    navigator.clipboard.writeText(text)
                } else {
                    // fallback in case not in HTTPS - the jankiest method to copy text know to man, like wtf
                    const copyText = document.createElement('textarea')
                    copyText.value = text
                    copyText.style.position = 'absolute';
                    copyText.style.left = '-99999px'

                    document.body.prepend(copyText)
                    copyText.select()

                    try {
                        document.execCommand('copy')
                    } catch (err) {
                        console.error(err)
                    } finally {
                        copyText.remove()
                    }
                }
            } catch (err) {
                console.error(err)
                ui.notifications.error("Console | Copying to clipboard was unsuccessful. Idk. Maybe this site doesn't have clipboard access?")
            }
        } else {
            ui.notifications.error('Console | The element being attempted to copy is not a string!')
            console.error('TypeError: element to copy is not a string', text, this)
        }
    }

    // left clicking a message copies it to clipboard
    _handleLeftClick = (event) => {
        if ($(event.currentTarget).data().action === "message-interact") {
            const text = $(event.currentTarget).data().messageText
            this.copyToClipboard(text)
        }

    }

    // right-clicking a message deletes it
    _handleRightClick = (event) => {
        if (!this.data.locked) {
            const data = $(event.currentTarget).data()
            const id = game.user.character ? game.user.character._id : game.userId
            const permission = id === data.userid || game.user.isGM ? true : false
            if (data.action === "message-interact" && permission) {
                const newData = ConsoleData.getConsoles().find((obj) => obj.id === data.consoleId)
                newData.content.body.splice(data.messageIndex, 1)
                ConsoleData.updateConsole(newData.id, newData)
            } else if (data.action === "message-interact" && !permission) {
                ui.notifications.warn("Console | You lack the permissions to delete a message that is not yours")
            }
        } else {
            ui.notifications.warn(`Console | The console '${this.data.name}' is currently locked and cannot be edited`)
        }
    }

    render(...args) {
        if (typeof this._priorState === "object") {
            this._inputVal = this._priorState.inputVal
        }
        this._document.apps[this.appId] = this
        if (this._represents) {
            this._represents.apps[this.appId] = this
        }
        return super.render(...args)
    }

    shareApp() {
        let html =
            `<p>Who do you want to show this app to?</p>
            <p><strong>Owners:</strong></p>
            <div style="padding-left:10px">`

        this.data.playerOwnership.forEach((id) => {
            const user = game.users.get(id)
            html += `<p style="color:${user.color}"><em>${user.name}</em></p>`
        })
        html += `</div>`

        const showPlayersDialog = new Dialog({
            buttons: {
                all: {
                    label: "All Players", callback: () => {
                        const users = []
                        game.users._source.forEach((obj) => {
                            users.push(obj._id)
                        })
                        game.socket.emit('module.console', {
                            users: users,
                            id: this.options.id
                        })
                    }
                },
                owners: {
                    label: "Owners only", callback: () => {
                        game.socket.emit('module.console', {
                            users: this.data.playerOwnership,
                            id: this.options.id
                        })
                    }
                }
            },
            content: html,
            default: "owners",
            title: `Show ${this.data.name}`,
        })
        showPlayersDialog.render(true)

    }

    static _handleShareApp(users, id) {
        if (users.includes(game.userId)) {
            const data = ConsoleData.getConsoles().find((obj) => obj.id === id)
            const console = new ConsoleApp(ConsoleData.getDataPool(), game.user)
            return console.render(true, { "id": data.id, "height": data.styling.height, "width": data.styling.width }).updateAppClasses()
        }
    }

    truncateMessage(msg, limits) {
        switch (limits.type) {
            case "characters":
                if (msg.length > limits.value) {
                    let trunc = msg.slice(0, limits.value)
                    trunc += limits.marker
                    return trunc
                } else {
                    return msg
                }
            case "none":
                return msg
            case "words":
                let trunc = msg.split(' ')
                if (trunc.length > limits.value) {
                    trunc.splice(limits.value)
                    trunc.push(limits.marker)
                    trunc = trunc.join(' ')
                    return trunc
                } else {
                    return msg
                }
            default:
                ui.notifications.error("Console | ConsoleApp has encountered an invalid limitType in truncateMessage")
        }
    }

    async updateAppClasses() {
        setTimeout(() => {
            const element = this._element[0]
            element.className = `app window-app form console-app`
            element.style.color = this.data.styling.fg
            element.style.background = this.data.styling.bg
            element.style.border = `2px solid ${this.data.styling.fg}`
            element.style.borderRadius = "0px";

            const header = this._element.find('.window-title')[0]
            header.innerHTML = this.options.anchored ? `<i class="fas fa-anchor"></i>${header.innerText}` : `${header.innerText}`

        }, 100)
    }

    _updateObject(event, formData) {
        if (!this.data.locked) {
            const console = this.getData()
            const messageLog = [...console.content.body]
            const message = {
                "text": this.truncateMessage(formData.consoleInputText, console.limits),
                "user": this.getName("")
            }
            this._inputVal = ""
            messageLog.push(message)
            console.content.body = messageLog
            ConsoleData.updateConsole(console.id, console)
        } else {
            ui.notifications.warn(`Console | The console '${this.data.name}' is currently locked and cannot be edited`)
        }
    }
}


globalThis.ConsoleApp = ConsoleApp

