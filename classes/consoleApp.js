import Console from "../console.js"
import ConsoleData from "./consoleData.js"

export default class ConsoleApp extends FormApplication {
    static get defaultOptions() {
        const defaults = super.defaultOptions;
        const overrides = {
            closeOnSubmit: false,
            height: 880,
            id: `${Console.ID}`,
            popOut: true,
            maximizable: true,
            minimizable: true,
            resizable: true,
            submitOnChange: true,
            width: 850
        }
        return foundry.utils.mergeObject(defaults, overrides)
    }

    activateListeners(html) {
        super.activateListeners(html)
        html.on('click', "[data-action]", this._handleButtonClick)
    }

    getData() {
        const console = ConsoleData.getConsoles().find((obj) => obj.id === this.options.id)
        let data = {
            ...console
        }
        data.character = game.user.character?.name || "$user"
        this.getTemplate(data)
        return data
    }

    getTemplate(data) {
        const GM = game.user.isGM ? true : false
        // Console.log(true, "getTemplate", data)
        let template = ""
        if (data.styling.messengerStyle) {
            template = GM ? Console.TEMPLATES.APP_IM : Console.TEMPLATES.APP_IM_PLAYER
        } else {
            template = GM ? Console.TEMPLATES.APP_TERM : Console.TEMPLATES.APP_TERM_PLAYER
        }
        Console.log(true, this)
        return this.options.template = template
    }

    _handleButtonClick = (event) => {
        const clickedElement = $(event.currentTarget)
        const action = clickedElement.data().action
        const id = clickedElement.data().consoleId
        const index = clickedElement.data().messageIndex

        switch (action) {
            case 'delete-message':
                const newData = ConsoleData.getConsoles().find((obj) => obj.id === id)
                newData.content.body.splice(index, 1)
                ConsoleData.updateConsole(newData.id, newData)
                break;
        }
        this.render()
    }

    _updateObject(event, formData) {
        const console = this.getData()
        const messageLog = [...console.content.body]
        let name = ""
        if (game.user.isGM) {
            name = game.user.character ? `${game.user.character.name}` : ""
        } else {
            name = game.user.character ? `${game.user.character.name}` : `${game.user.name}`
        }
        const message = {
            "text": formData.consoleInputText,
            "username": name
        }
        messageLog.push(message)
        console.content.body = messageLog
        ConsoleData.updateConsole(console.id, console)
        this.render()
    }
}

