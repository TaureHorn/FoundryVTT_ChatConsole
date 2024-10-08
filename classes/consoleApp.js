import Console from "../console.js"
import ConsoleConfig from "./consoleConfig.js"
import ConsoleData from "./consoleData.js"
import ConsoleManager from "./consoleManager.js"

export default class ConsoleApp extends FormApplication {

    constructor(id, managerId) {
        super()
        this.consoleId = id
        this._document = ConsoleData.getDataPool()
        this._represents = game.user
    }

    // _inputVal keeps a record of the text in an input so unsent messages can persist between renders
    _inputVal = ""

    static get defaultOptions() {
        const defaults = super.defaultOptions;
        const overrides = {
            anchored: true,
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
        const data = { ...ConsoleData.getConsole(this.consoleId) }
        data.character = this.getName("$user").name
        data.inputVal = this._inputVal

        this.data = data

        // apply defaults
        this.options.anchored = this.data.defaultAnchor
        this.options.height = this.data.styling.height
        this.options.id = this.data.id
        this.options.template = this.data.styling.messengerStyle ? Console.TEMPLATES.APP_IM : Console.TEMPLATES.APP_TERM
        this.options.title = this.data.name
        this.options.width = this.data.styling.width

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
                    const anchor = this._element[0].getElementsByClassName('fas fa-anchor anchorButton')[0]
                    this.options.anchored ? anchor.classList.add('invert') : anchor.classList.remove('invert')
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

    // called when a message is sent to clear the input box
    #clearInput() {
        document.getElementById(`consoleInputText${this.data.id}`).value = ""
        return this._inputVal = ""
    }

    // called when a message is left clicked
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
                const newData = ConsoleData.getConsole(data.consoleId)
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
        // link app to documents so it re-renders normally
        this._document.apps[this.appId] = this
        this._represents.apps[this.appId] = this

        super.render(...args)

        // set sizes and styles
        this.position.height = this.options.height
        this.position.width = this.options.width
        this.updateAppClasses(this.consoleId)
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
                            event: "shareApp",
                            id: this.options.id,
                            users: users
                        })
                    }
                },
                owners: {
                    label: "Owners only", callback: () => {
                        game.socket.emit('module.console', {
                            event: "shareApp",
                            id: this.options.id,
                            users: this.data.playerOwnership
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

    static _handleShareApp(id) {
        const data = ConsoleData.getConsole(id)
        const console = new ConsoleApp(ConsoleData.getDataPool(), game.user)
        return console.render(true, { "id": data.id, "height": data.styling.height, "width": data.styling.width })
    }

    static async notifyRecieve(console) {
        // Play sound if not muted by console or globally muted in module settings.
        if (!console.styling.mute && !game.settings.get(Console.ID, 'globalNotificationSounds')) {
            const customCtx = game.settings.get(Console.ID, 'notificationContext') || 'interface'
            const notifContext = game.audio[customCtx]
            const audioFile =
                console.styling.notificationSound ||
                game.settings.get(Console.ID, 'defaultConfig').styling.notificationSound ||
                "modules/console/resources/msgNotification.ogg"
            const bloop = new foundry.audio.Sound(`./${audioFile}`, { "context": notifContext })
            await bloop.load()
            await bloop.play()
        }

        // Update UI to show notification pip if console manager not already open.
        const mainButton = document.getElementById('console-manager-launcher')
        const manager = document.getElementById('console-manager')
        if (mainButton) {
            if (!manager) {
                ConsoleManager.renderLauncherButton(true)
            }
            mainButton.classList.add('strobe')
            setTimeout(() => {
                mainButton.classList.remove('strobe')
            }, 1000)
        }
    }

    async notifySend(context, console) {
        const users = [...console.playerOwnership]
        if (users.includes(game.userId)) {
            // remove self from list of notification recipients
            users.splice(users.indexOf(game.userId), 1)
        }
        if (!game.user.isGM) {
            // if not GM, add GM to list of notification recipients
            users.push(game.users.find((usr) => usr.role === 4).id)
        }

        // send
        if (game.user.isGM) {
            // if GM set all messageNotification flags for all relevant players
            switch (context) {
                case 'clear':
                    users.push(game.userId)
                    await ConsoleData.removeFromPlayerFlags('messageNotification', users, console.id)
                    break;
                case 'messageNotification':
                    await ConsoleData.setPlayerFlags({ context: 'messageNotification', addition: true }, users, console.id)
                    await game.socket.emit('module.console', { event: "messageNotification", users: users, console: console })
                    break;
                default:
                    Console.print(true, 'error', `encountered invalid switch case '${context}' in consoleApp.notifySend`)
            }
        } else {
            if (game.users.activeGM) {
                // if not GM send notifications data to GM to set messageNotification flags for all players
                await game.socket.emit('module.console', { event: "gmPropagateNotifications", users: users, console: console })
                await game.socket.emit('module.console', { event: "messageNotification", users: users, console: console })
            } else {
                // if not GM and no GM online send messageNotifications to be handled by online players only
                await game.socket.emit('module.console', { event: "userPropagateNotifications", users: users, console: console })
                await game.socket.emit('module.console', { event: "messageNotification", users: users, console: console })
            }
        }


    }

    #stringifyArguments(arr) {
        let args = [...arr]
        args.shift()
        return args.join(" ")
    }

    // process timestamp data extracted from the SimpleCalendar api
    #stringifyTimestamp(time) {
        const verbosity = game.settings.get(Console.ID, 'timestampVerbosity')
        switch (verbosity) {
            case 'time':
                return time.time.slice(0, 5)
            case 'time-date':
                return `${time.time.slice(0, 5)} ${time.day}/${time.month}/${time.year}`
            case 'date':
                return `${time.day}/${time.month}/${time.year}`
            case 'date-string':
                return `${time.day}${time.daySuffix} ${time.monthName} ${time.year}`
            case 'full':
                return `${time.time.slice(0, 5)} ${time.day}${time.daySuffix} ${time.monthName} ${time.year}`
            default:
                Console.print(true, 'error', `encountered an incorrect verbosity string '${verbosity}' in consoleApp.#stringifyTimestamp`)
        }
    }

    #truncateMessage(msg, limits) {
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
                ui.notifications.error(`Console | ConsoleApp has encountered an invalid limitType ('${limits.type}') in truncateMessage`)
        }
    }

    updateAppClasses(id) {

        // scroll to the bottom of the messages div on re-render
        //      set appart from the other due to the needed speed
        setTimeout(() => {
            const messages = $(`#console-messages${this.data.id}`)
            messages.scrollTop(messages.prop('scrollHeight'))
        })

        setTimeout(() => {

            // apply console specific styling to elements of the app window not available until after the app has rendered to the DOM
            if (document.getElementById(id)) {
                const element = document.getElementById(id)
                element.className = `app window-app form console-app`
                element.style.color = this.data.styling.fg
                element.style.background = this.data.styling.bg
                element.style.border = `2px solid ${this.data.styling.fg}`
                element.style.borderRadius = "0px";
            }

            // if user had text in input box when the app re-rendered focus the cursor at the end of the input box
            const input = ui.activeWindow._element.find(`#consoleInputText${ui.activeWindow.options.id}`)
            input.focus()
            const len = input.val().length
            input[0].setSelectionRange(len, len)

            // style the anchor header buttons, invert when console anchored
            if (this._element) {
                const anchor = this._element[0].getElementsByClassName('fas fa-anchor anchorButton')[0]
                this.options.anchored ? anchor.classList.add('invert') : anchor.classList.remove('invert')
            }

        }, 200)
    }

    async _updateObject(event, formData) {
        const cmdMode = formData.consoleInputText.substring(0, 1) === "/" ? true : false
        const console = this.getData()

        const cmd = formData.consoleInputText.substring(1).split(' ')
        if (cmdMode && game.user.isGM) {
            // process commands for GMs
            switch (cmd[0]) {
                case "alias":
                    let alias = this.#stringifyArguments(cmd)
                    const character = game.actors.getName(alias) ? game.actors.getName(alias) : null
                    character ? game.user.update({ "character": character }) : ui.notifications.warn(`Console | An actor with the name '${alias}' does not exist`)
                    break;
                case "clear":
                    console.content.body = []
                    ConsoleData.updateConsole(console.id, console)
                    this.notifySend('clear', console)
                    break;
                case "close":
                case "exit":
                    this.close()
                    break;
                case "duplicate":
                    ConsoleData.duplicateConsole(console.id)
                    break;
                case "edit":
                    this.close()
                    new ConsoleConfig(console.id).render(true, { "id": `console-config-${console.id}` })
                    break;
                case "incognito":
                    if (game.user.character) {
                        game.user.update({ "character": null })
                    } else {
                        ui.notifications.warn(" Console | You are not currently represented by a character and are therefore already incognito")
                    }
                    break;
                case "invite":
                    let nameToInvite = this.#stringifyArguments(cmd)
                    const user = game.users.getName(nameToInvite) ? game.users.getName(nameToInvite) : null
                    if (user) {
                        console.playerOwnership.push(user._id)
                        ConsoleData.updateConsole(console.id, console)
                    } else {
                        ui.notifications.warn(`Console | A user with the name '${nameToInvite}' does not exist`)
                    }
                    break;
                case "kick":
                    let nameToKick = this.#stringifyArguments(cmd)
                    const player = game.users.getName(nameToKick) ? game.users.getName(nameToKick) : null
                    if (player) {
                        console.playerOwnership.splice(console.playerOwnership.indexOf(player._id), 1)
                        await ConsoleData.updateConsole(console.id, console)
                        await ConsoleData.removeFromPlayerFlags('messageNotification', [player._id], console.id)
                    } else {
                        ui.notifications.warn(`Console | A user with the name '${nameToKick}' does not exist`)
                    }
                    break;
                case "lock":
                    ConsoleData.toggleBoolean(console.id, 'lock')
                    break;
                case "name":
                    console.name = this.#stringifyArguments(cmd)
                    ConsoleData.updateConsole(console.id, console)
                    break;
                case 'notif':
                case "notifications":
                    ConsoleData.toggleBoolean(console.id, 'notifications')
                    break;
                case "mute":
                    ConsoleData.toggleBoolean(console.id, 'mute')
                    break;
                case "share":
                    this.shareApp()
                    break;
                case "show":
                    ConsoleData.toggleBoolean(console.id, 'show')
                    break;
                case "timelog":
                    const simpleCalendar = game.modules.get('foundryvtt-simple-calendar').active ? true : false
                    if (simpleCalendar) {
                        const data = {
                            consoleInputText: `${this.#stringifyTimestamp(SimpleCalendar.api.currentDateTimeDisplay())} | ${this.#stringifyArguments(cmd)}`
                        }
                        this._updateObject(null, data)
                    } else {
                        ui.notifications.warn("Console | This command requires the module 'SimpleCalendar' to function")
                    }
                    break;
                case "timestamps":
                case "time":
                    ConsoleData.toggleBoolean(console.id, 'timestamps')
                    break;
                case "title":
                    console.content.title = this.#stringifyArguments(cmd)
                    ConsoleData.updateConsole(console.id, console)
                    break;
                default:
                    Console.print(true, 'warn', `/${cmd.join(" ")} is not a recongised command`)
                    ui.notifications.warn(`Console | '/${cmd.join(" ")}' is not a recognised command`)
            }

            this.#clearInput()
        } else if (cmdMode && !game.user.isGM) {
            // process commands for non gm users
            switch (cmd[0]) {
                case "alias":
                    let alias = this.#stringifyArguments(cmd)
                    const character = game.actors.getName(alias) ? game.actors.getName(alias) : null
                    if (character) {
                        const ownership = character.isOwner ? true : false
                        ownership ? game.user.update({ "character": character }) : ui.notifications.warn(`Console | You do not have ownership over the character '${alias}'`)
                    } else {
                        ui.notifications.warn(`Console | An actor with the name '${alias}' does not exist`)
                    }
                    break;
                case "close":
                case "exit":
                    this.close()
                    break;
                case "incognito":
                    if (game.user.character) {
                        game.user.update({ "character": null })
                    } else {
                        ui.notifications.warn(" Console | You are not currently represented by a character and are therefore already incognito")
                    }
                    break;
                default:
                    ui.notifications.warn(`Console | '/${cmd.join(" ")}' is not a recognised command`)
            }
            this.#clearInput()
        } else {
            if (!this.data.locked) {
                // update with message as normal
                const messageLog = [...console.content.body]

                // timestamp integrations
                let useTimestamps = false
                let timestamp = ""
                if (game.modules.get('foundryvtt-simple-calendar')) {
                    if (game.modules.get('foundryvtt-simple-calendar').active && console.timestamps) {
                        useTimestamps = true
                        timestamp = this.#stringifyTimestamp(SimpleCalendar.api.currentDateTimeDisplay())
                    }
                }

                const message = {
                    "text": this.#truncateMessage(formData.consoleInputText, console.limits),
                    ...(useTimestamps && { "timestamp": timestamp }),
                    "user": this.getName("")
                }


                this.#clearInput()
                messageLog.push(message)
                console.content.body = messageLog
                ConsoleData.updateConsole(console.id, console)
                if (console.public && console.notifications) {
                    this.notifySend('messageNotification', console)
                }
            } else {
                ui.notifications.warn(`Console | The console '${this.data.name}' is currently locked and cannot be edited`)
            }
        }
    }
}


globalThis.ConsoleApp = ConsoleApp

