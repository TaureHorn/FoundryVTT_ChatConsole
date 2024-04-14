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
                tooltip: game.i18n.localize("CONSOLE.console.app-info")
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
            buttons.unshift({
                class: "share-image",
                icon: "fas fa-eye",
                label: "",
                onclick: () => this.shareApp(),
                tooltip: game.i18n.localize("CONSOLE.console.show-players")
            })
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
        delete this._document.apps[this.appId]
        delete this._represents.apps[this.appId]
        return super.close(...args)
    }

    // left clicking a message copies it to clipboard
    _handleLeftClick = (event) => {
        if ($(event.currentTarget).data().action === "message-interact") {
            navigator.clipboard.writeText($(event.currentTarget).data().messageText)
                .then(() => {
                    (ui.notifications.notify("Console | copied message to clipboard"))
                }, (err) => {
                    ui.notifications.warn("Console | unable to copy message to clipboard. Check browsers console for more details")
                    console.error('Unable to copy to clipboard: ', err)
                })
        }
    }

    // right-clicking a message deletes it
    _handleRightClick = (event) => {
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
        game.socket.emit('module.console', {
            id: this.options.id
        })
    }

    static _handleShareApp(id) {
        const data = ConsoleData.getConsoles().find((obj) => obj.id === id.id)
        const console = new ConsoleApp(ConsoleData.getDataPool(), game.user)
        return console.render(true, { "id": data.id, "height": data.styling.height, "width": data.styling.width }).updateAppClasses()
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
        }, 100)
    }

    _updateObject(event, formData) {
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
    }
}

globalThis.ConsoleApp = ConsoleApp

