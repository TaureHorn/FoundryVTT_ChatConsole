import Console from "../console.js"
import ConsoleConfig from "./consoleConfig.js"
import ConsoleData from "./consoleData.js"
import ConsoleManager from "./consoleManager.js"

// taken from base ImagePopout
function getImageSize(path) {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = function() {
            resolve([this.width, this.height]);
        };
        img.onerror = reject;
        img.src = path;
    });
}

// taken from base ImagePopout
function getVideoSize(src) {
    return new Promise((resolve, reject) => {
        const video = document.createElement("video");
        video.onloadedmetadata = () => {
            video.onloadedmetadata = null;
            resolve([video.videoWidth, video.videoHeight]);
        };
        video.onerror = reject;
        video.src = src;
    });
}

// modified from base ImagePopout
async function getPopoutSize(src, type) {
    const [width, height] = type === 'image' ? await getImageSize(src) : await getVideoSize(src)

    const viewportAspectRatio = window.innerWidth / window.innerWidth
    const videoAspectRatio = width / height

    const dimensions = {}
    if (videoAspectRatio > viewportAspectRatio) {
        dimensions.width = Math.min(width, window.innerWidth - 200)
        dimensions.height = dimensions.width / videoAspectRatio
    } else {
        dimensions.height = Math.min(height, window.innerHeight - 200);
        dimensions.width = dimensions.height * videoAspectRatio
    }
    return dimensions
}

export default class ConsoleApp extends FormApplication {

    constructor(id) {
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

        data.canBrowseFiles = game.user.hasPermission('FILES_BROWSE')

        return data
    }

    _getHeaderButtons() {
        let buttons = [
            {
                class: "info",
                icon: "fas fa-circle-info",
                label: "",
                onclick: () => ui.notifications.notify(`Console | ${game.i18n.localize("CONSOLE.console.app-info")}`),
                tooltip: game.i18n.localize("CONSOLE.console.message-info")
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
                    class: "become-actor",
                    icon: "fas fa-user",
                    label: "",
                    onclick: async () => {
                        if (this.data.linkedActor) {
                            const character = game.actors.get(this.data.linkedActor)
                            character ?
                                await game.user.update({ "character": character })
                                : ui.notifications.error(`Console | No actor with id '${this.data.linkedActor}' found.`)
                        } else {
                            if (game.user.character) {
                                this.data.linkedActor = game.user.character._id
                                await ConsoleData.updateConsole(this.consoleId, this.data)
                            } else {
                                ui.notifications.warn(`Console | Unable to link an actor to this console. You are not currently represented by an actor.`)
                            }
                        }
                    },
                    tooltip: this.data.linkedActor ? game.i18n.localize("CONSOLE.console.become-actor") : game.i18n.localize("CONSOLE.console.link-actor")
                },
                {
                    class: 'copy-id',
                    icon: "fas fa-id-badge",
                    label: "",
                    onclick: () => { this.copyToClipboard(this.options.id) },
                    tooltip: `ID: ${this.options.id}`
                },
                {
                    class: 'pin',
                    icon: "fas fa-thumbtack",
                    label: "",
                    onclick: () => {
                        const newData = ConsoleData.getConsole(this.consoleId)
                        newData.styling.height = this.position.height
                        newData.styling.width = this.position.width
                        ConsoleData.updateConsole(newData.id, newData)
                    },
                    tooltip: game.i18n.localize("CONSOLE.console.pin")
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

        // create context menues for each message in a console ap
        Array.from(html.find('.console-message-interact')).forEach(msg => this.#buildContextMenu(msg))

        // create on click event for opening file picker
        html.find('#mediaFilePicker').on('click', [html], () => this._handleImagePicker(html))

        // open ImagePopout when clicking on image/video in console app
        html.on('click', "#consoleMedia", (ev) => {
            const data = $(ev.currentTarget).data()
            this._handleImageZoom(data)
        })
    }

    #buildContextMenu(msg) {
        const id = game.user.character ? game.user.character._id : game.userId

        // apply console styling to new css class for context menu entries
        const style = $(`<style>.console-menu-styling${this.id} { 
                background-color: ${this.data.styling.bg}; 
                color: ${this.data.styling.fg};
                text-align:left
                }
            </style>`)
        $('html > head').append(style)

        const contextMenuOptions = [
            {
                classes: `console-menu-styling${this.id}`,
                condition: msg.dataset.text ? true : false,
                name: game.i18n.localize("CONSOLE.console.copy-message"),
                icon: '<i class="fas fa-copy"></i>',
                callback: () => {
                    this.copyToClipboard(msg.dataset.text)
                }
            },
            {
                classes: `console-menu-styling${this.id}`,
                condition: msg.dataset.mediaPath && msg.dataset.mediaType === 'img' ? true : false,
                name: game.i18n.localize("CONSOLE.console.zoom-image"),
                icon: '<i class="fas fa-magnifying-glass"></i>',
                callback: () => {
                    this._handleImageZoom(msg.dataset)
                }
            },
            {
                classes: `console-menu-styling${this.id}`,
                condition: msg.dataset.mediaPath && msg.dataset.mediaType === 'video' ? true : false,
                name: game.i18n.localize("CONSOLE.console.zoom-video"),
                icon: '<i class="fas fa-magnifying-glass-play"></i>',
                callback: () => {
                    this._handleImageZoom(msg.dataset)
                }
            },
            {
                classes: `console-menu-styling${this.id}`,
                condition: id === msg.dataset.userid || game.user.isGM ? true : false,
                name: game.i18n.localize("CONSOLE.console.delete-message"),
                icon: '<i class="fas fa-trash"></i>',
                callback: async () => {
                    this.#deleteConfirmation('message', {
                        'consoleId': msg.dataset.consoleId,
                        'messageIndex': msg.dataset.messageIndex
                    })
                }
            }
        ]
        ContextMenu.create(this, msg, '.console-message-interact', contextMenuOptions, {
            onOpen: () => {
                msg.style.zIndex = 900
            },
            onClose: () => {
                msg.style.zIndex = 100
            }
        })
    }


    // build a timestamp based on game setting and SimpleCalendar data
    #buildTimestamp() {
        const data = SimpleCalendar.api.currentDateTimeDisplay()
        data.timeShort = data.time.slice(0, 5)

        let timestamp = ``
        const obj = game.settings.get(Console.ID, 'timestampBuilder')

        obj.stringArray.forEach((str) => {
            switch (str) {
                case 'time-hm':
                    timestamp += `${data.timeShort}`
                    break;
                case 'time-hms':
                    timestamp += `${data.time}`
                    break;
                case 'day-numeric':
                    timestamp += `${data.day}`
                    break;
                case 'day-string':
                    timestamp += `${data.day}${data.daySuffix}`
                    break;
                case 'month-numeric':
                    timestamp += `${data.month}`
                    break;
                case 'month-string':
                    timestamp += `${data.monthName}`
                    break;
                case 'year':
                    timestamp += `${data.year}`
                    break;
                case 'year-name':
                    timestamp += `${data.yearName}`
                    break;
                case 'year-prefix':
                    timestamp += `${data.yearPrefix}`
                    break;
                case 'year-postfix':
                    timestamp += `${data.yearPostfix}`
                    break;
                case 'space':
                    timestamp += ` `
                    break;
                case 'custom-1':
                    timestamp += `${obj.customs.custom1}`
                    break;
                case 'custom-2':
                    timestamp += `${obj.customs.custom2}`
                    break;
                case 'custom-3':
                    timestamp += `${obj.customs.custom3}`
                    break;
                default:
                    Console.print(true, 'error', `ConsoleApp.#buildTimestamp encountered an invalid string '${str}'`)
            }
        })
        return timestamp
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
                ui.notifications.info("Console | copied text to clipboard!")
            } catch (err) {
                console.error(err)
                ui.notifications.error("Console | Copying to clipboard was unsuccessful. Idk. Maybe this site doesn't have clipboard access?")
            }
        } else {
            ui.notifications.error('Console | The element being attempted to copy is not a string!')
            console.error('TypeError: element to copy is not a string', text, this)
        }
    }

    #deleteConfirmation(context, data) {
        let confirmed = null
        const confirm = new Dialog({
            buttons: {
                yes: { label: 'YES', callback: () => confirmed = true },
                no: { label: 'NO', callback: () => confirmed = false }
            },
            title: `Delete ${context}`,
            close: () => {
                (async () => {
                    if (confirmed) {

                        switch (context) {
                            case 'message':
                                const newData = ConsoleData.getConsole(data.consoleId)
                                newData.content.body.splice(data.messageIndex, 1)
                                await ConsoleData.updateConsole(newData.id, newData)
                                break;
                            case 'all messages':
                                data.content.body = []
                                await ConsoleData.updateConsole(data.id, data)
                                break;
                            default:
                                Console.print(true, 'error', `encountered an invalid context - ${context} - in ConsoleApp.#deleteConfirmation`)
                        }

                    }
                })();
            }

        })

        // apply classes to dialog
        confirm.options.classes.push(
            `console-app-${this.consoleId}`,
            'console-delete-dialog',
            `console-delete-dialog-${this.consoleId}`
        )

        // override button styles
        const dialogButton = $(`<style>.console-delete-dialog .dialog-buttons button {
            background: none;
            border: 2px solid ${this.data.styling.fg};
            border-radius: 0px;
            color: ${this.data.styling.fg};
            font-weight: bold;
        }
        </style>`)

        const dialogButtonHover = $(`<style>.console-delete-dialog .dialog-buttons button:hover {
            background-color: ${this.data.styling.fg};
            color: ${this.data.styling.bg};
        }
        </style>`)

        $('html > head').append(dialogButton, dialogButtonHover)

        // check if not already rendered and render if not
        const alreadyOpen = $('body').find(`.console-delete-dialog-${this.consoleId}`)[0]
        alreadyOpen ? ui.windows[alreadyOpen.dataset.appid].bringToTop() : confirm.render(true)
        setTimeout(() => {
            $('[data-button="yes"]')[0].focus()
        }, 100)
    }

    _handleImagePicker = (html) => {
        if (!this.data.locked) {
            const mediaPicker = new FilePicker({
                callback: async (mediaPath) => {
                    // find type of file and create thumbnail
                    let isImage, thumbnail = null
                    if (VideoHelper.hasVideoExtension(mediaPath)) {
                        isImage = false
                        thumbnail = await game.video.createThumbnail(mediaPath, {
                            'height': 32,
                            'width': 32
                        })
                    }
                    if (ImageHelper.hasImageExtension(mediaPath)) isImage = true
                    if (!isImage && !thumbnail) return

                    // create element to notify of file ready to send and insert element into DOM
                    const node = this.element.find(`#consoleInputText${this.id}`)
                    const fileNotifier = `
                        <div id="fileNotifier" style="background:${this.data.styling.bg};border:1px solid ${this.data.styling.fg};border-radius:0;color:${this.data.styling.fg}">
                            <input style="display:none" type="text" name="mediaFilePath" value=${mediaPath} />
                            <img src="${isImage ? mediaPath : thumbnail}" />
                            <span>${game.i18n.localize('CONSOLE.console.sending-file')} "${mediaPath}"</span>
                            <span id="cancelFileSend"><i class="fas fa-circle-xmark"></i></span>
                        </div>
                        `
                    $('body').on('click', '#cancelFileSend', function() {
                        html.find('#fileNotifier').remove()
                    })
                    node.before(fileNotifier)
                }
            })
            mediaPicker.extensions = [".avif", ".jpg", ".jpeg", ".png", ".svg", ".webp", ".webm", ".mp4", ".m4v"]
            mediaPicker.displayMode = 'thumbs'
            mediaPicker.browse()
        } else {
            ui.notifications.warn(`Console | The console '${this.data.name}' is currently locked and cannot be edited`)
        }
    }

    _handleImageZoom = async (data) => {
        let dimensions
        const popout = new ImagePopout(data.mediaPath, {
            title: `${data.userName} >>> ${this.data.name}`,
        })
        popout.options.classes.push('console-popout')
        if (data.mediaType === 'img') {
            dimensions = await getPopoutSize(data.mediaPath, 'image')
        }
        if (data.mediaType === 'video') {
            popout.options.template = Console.TEMPLATES.VIDEO_POPOUT
            dimensions = await getPopoutSize(data.mediaPath, 'video')
        }
        popout.render(true, { 'height': dimensions.height + 36, 'width': dimensions.width })
    }

    render(...args) {
        this.getData()

        // link app to documents so it re-renders normally
        this._document.apps[this.appId] = this
        this._represents.apps[this.appId] = this

        // apply personalised stylings to '.console-app-${this.consoleId}'
        const style = $(`<style>.console-app-${this.consoleId} {
            background: ${this.data.styling.bg};
            border: 2px solid ${this.data.styling.fg};
            border-radius: 0px;
            color: ${this.data.styling.fg};
            }
        </style>`)
        $('html > head').append(style)
        this.options.classes.push(`console-app-${this.consoleId}`)

        super.render(...args)

        // set sizes and styles
        this.position.height = this.options.height
        this.position.width = this.options.width
        this.updateAppClasses()
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

    toggle() {
        if (document.getElementById(this.consoleId)) {
            Object.values(ui.windows).find((obj) => obj.consoleId === this.consoleId).close()
        } else {
            this.render(true)
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

    updateAppClasses() {

        // scroll to the bottom of the messages div on re-render
        //      set appart from the other due to the needed speed
        setTimeout(() => {
            const messages = $(`#console-messages${this.data.id}`)
            messages.scrollTop(messages.prop('scrollHeight'))
        })

        setTimeout(() => {

            // apply console specific styling to elements of the app window not available until after the app has rendered to the DOM
            if (this.rendered) {

                // if user had text in input box when the app re-rendered focus the cursor at the end of the input box
                if (ui.activeWindow._element) {
                    const input = ui.activeWindow._element.find(`#consoleInputText${ui.activeWindow.options.id}`)
                    input.focus()
                    if (!input.val()) return
                    const len = input.val().length
                    input[0].setSelectionRange(len, len)
                }

                // style the anchor header buttons, invert when console anchored
                if (this._element) {
                    const anchor = this._element[0].getElementsByClassName('fas fa-anchor anchorButton')[0]
                    this.options.anchored ? anchor.classList.add('invert') : anchor.classList.remove('invert')
                }

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
                case "bg":
                    let bg = this.#stringifyArguments(cmd)
                    if (ConsoleData.hexValidator(bg)) {
                        console.styling.bg = bg
                        ConsoleData.updateConsole(console.id, console)
                    }
                    break;
                case "clear":
                    this.#deleteConfirmation('all messages', console)
                    this.notifySend('clear', console)
                    break;
                case "close":
                case "exit":
                    this.close()
                    break;
                case "desc":
                case "description":
                    let desc = this.#stringifyArguments(cmd)
                    console.description = desc
                    ConsoleData.updateConsole(console.id, console)
                    break;
                case "duplicate":
                    ConsoleData.duplicateConsole(console.id)
                    break;
                case "edit":
                    this.close()
                    new ConsoleConfig(console.id).render(true, { "id": `console-config-${console.id}` })
                    break;
                case "fg":
                    let fg = this.#stringifyArguments(cmd)
                    if (ConsoleData.hexValidator(fg)) {
                        console.styling.fg = fg
                        ConsoleData.updateConsole(console.id, console)
                    }
                    break;
                case "gm":
                case "gmInfo":
                    let gm = this.#stringifyArguments(cmd)
                    console.gmInfo = gm
                    ConsoleData.updateConsole(console.id, console)
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
                case "linkActor":
                    if (game.user.character) {
                        console.linkedActor = game.user.character._id
                        ConsoleData.updateConsole(console.id, console)
                    } else {
                        ui.notifications.warn(`Console | Unable to link an actor to this console. You are not currently represented by an actor.`)
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
                case "permit":
                    let nameToPermit = this.#stringifyArguments(cmd)
                    const permitee = game.users.getName(nameToPermit) ? game.users.getName(nameToPermit) : null
                    if (permitee) {
                        if (!console.playerPermissions.includes(permitee._id)) {
                            console.playerPermissions.push(permitee._id)
                            await ConsoleData.updateConsole(console.id, console)
                        }
                    } else {
                        ui.notifications.warn(`Console | A user with the name '${nameToPermit}' does not exist`)
                    }
                    break;
                case "rmPermit":
                    let nameToRemove = this.#stringifyArguments(cmd)
                    const removee = game.users.getName(nameToRemove) ? game.users.getName(nameToRemove) : null
                    if (removee) {
                        if (console.playerPermissions.includes(removee._id)) {
                            console.playerPermissions.splice(console.playerPermissions.indexOf(removee._id), 1)
                            await ConsoleData.updateConsole(console.id, console)
                        }
                    } else {
                        ui.notifications.warn(`Console | A user with the name '${nameToPermit}' does not exist`)
                    }
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
                            consoleInputText: `${this.#buildTimestamp()} | ${this.#stringifyArguments(cmd)}`
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
                case "unlinkActor":
                    console.linkedActor = ''
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
                if (this.data.playerPermissions.includes(game.userId) || game.user.isGM) {

                    // update with message as normal
                    const messageLog = [...console.content.body]

                    // timestamp integrations
                    let useTimestamps = false
                    let timestamp = ""
                    if (game.modules.get('foundryvtt-simple-calendar')) {
                        if (game.modules.get('foundryvtt-simple-calendar').active && console.timestamps) {
                            useTimestamps = true
                            timestamp = this.#buildTimestamp()
                        }
                    }

                    let message = {
                        ...(useTimestamps && { "timestamp": timestamp }),
                        "user": this.getName("")

                    }

                    if (formData.consoleInputText) {
                        message.text = this.#truncateMessage(formData.consoleInputText, console.limits)
                    }

                    if (formData.mediaFilePath) {
                        message.media = {
                            'filePath': formData.mediaFilePath
                        }
                        if (ImageHelper.hasImageExtension(formData.mediaFilePath)) message.media.fileType = 'img'
                        if (VideoHelper.hasVideoExtension(formData.mediaFilePath)) message.media.fileType = 'video'
                    }

                    this.#clearInput()
                    messageLog.push(message)
                    console.content.body = messageLog
                    ConsoleData.updateConsole(console.id, console)
                    if (console.public && console.notifications) {
                        this.notifySend('messageNotification', console)
                    }
                } else {
                    ui.notifications.warn(`Console | You are not permitted to send messages in '${this.data.name}'`)
                }

            } else {
                ui.notifications.warn(`Console | The console '${this.data.name}' is currently locked and cannot be edited`)
            }
        }
    }
}


globalThis.ConsoleApp = ConsoleApp

