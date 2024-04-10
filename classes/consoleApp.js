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

        data.character = this.getName("$user")
        data.inputVal = this._inputVal
        this.getTemplate(data)
        this.options.title = data.name
        this.data = data

        return data
    }

    _getHeaderButtons() {
        let buttons = [{
            class: "close",
            icon: "fas fa-times",
            label: "",
            onclick: () => this.close(),
            tooltip: "Close"
        }]
        if (game.user.isGM) {
            buttons.unshift({
                class: "share-image",
                icon: "fas fa-eye",
                label: "",
                onclick: () => this.shareApp(),
                tooltip: "Show to Players"
            })
        }
        return buttons
    }

    getName(str) {
        let name = ""
        if (game.user.isGM) {
            name = game.user.character ? `${game.user.character.name}` : str
        } else {
            name = game.user.character ? `${game.user.character.name}` : `${game.user.name}`
        }
        return name
    }

    getTemplate(data) {
        const GM = game.user.isGM
        let template = ""
        if (data.styling.messengerStyle) {
            template = GM ? Console.TEMPLATES.APP_IM : Console.TEMPLATES.APP_IM_PLAYER
        } else {
            template = GM ? Console.TEMPLATES.APP_TERM : Console.TEMPLATES.APP_TERM_PLAYER
        }
        return this.options.template = template
    }

    activateListeners(html) {
        super.activateListeners(html)
        html.on('click', "[data-action]", this._handleButtonClick)
    }

    async close(...args) {
        delete this._document.apps[this.appId]
        delete this._represents.apps[this.appId]
        return super.close(...args)
    }

    _handleButtonClick = (event) => {
        const clickedElement = $(event.currentTarget)
        const action = clickedElement.data().action
        const id = clickedElement.data().consoleId
        const index = clickedElement.data().messageIndex

        switch (action) {
            case 'message-interact':
                const newData = ConsoleData.getConsoles().find((obj) => obj.id === id)
                // newData.content.body.splice(index, 1)
                // ConsoleData.updateConsole(newData.id, newData)
                new MessageMenu(newData).render(true)
                break;
            default:
                ui.notifications.error('Console | ConsoleApp has encountered and invalid button data action in _handleButtonClick')
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
        const name = this.getName("")
        const message = {
            "text": this.truncateMessage(formData.consoleInputText, console.limits),
            "username": name
        }
        this._inputVal = ""
        messageLog.push(message)
        console.content.body = messageLog
        ConsoleData.updateConsole(console.id, console)
    }
}

globalThis.ConsoleApp = ConsoleApp

class MessageMenu extends ContextMenu {

    constructor(message) {
        super()
        this._data = message
    }



}

