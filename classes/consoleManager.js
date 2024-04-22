import Console from "../console.js"
import ConsoleApp from "./consoleApp.js"
import ConsoleConfig from "./consoleConfig.js"
import ConsoleData from "./consoleData.js"

export default class ConsoleManager extends FormApplication {

    constructor(getDocument, getUser) {
        super()
        this._document = getDocument
        this._represents = getUser
    }

    static get defaultOptions() {
        const defaults = super.defaultOptions
        const overrider = {
            height: 'auto',
            id: 'console-manager',
            left: canvas.app.screen.width - 712,
            template: game.user.isGM ? Console.TEMPLATES.MANAGER : Console.TEMPLATES.MANAGER_PLAYER,
            title: "Console Manager",
            top: 10,
            width: 400,
        }

        const mergedOptions = foundry.utils.mergeObject(defaults, overrider)
        return mergedOptions
    }

    getData() {
        const consoles = ConsoleData.getConsoles().sort((a, b) => a.name.localeCompare(b.name))
        consoles.forEach((console) => {
            console.sceneNames = []
            console.scenes.forEach((id) => {
                console.sceneNames.push(this.getSceneName(id))
            })
            this.versionMigration(console)
        })
        return {
            consoles: consoles,
            manager: this,
            user: game.user._id
        }
    }

    activateListeners(html) {
        super.activateListeners(html)

        html.on('click', "[data-action]", this._handleButtonClick)
    }

    getSceneName(id) {
        return game.scenes._source.find((obj) => obj._id === id).name
    }

    _handleButtonClick = async (event) => {
        const clickedElement = $(event.currentTarget)
        const action = clickedElement.data().action
        const id = clickedElement.data().consoleId

        const console = ConsoleData.getConsoles().find((obj) => obj.id === id)

        switch (action) {
            case 'create':
                await ConsoleData.createConsole("new console")
                break;
            case 'open-console':
                new ConsoleApp(ConsoleData.getDataPool(), game.user).render(true, { "id": console.id, "height": console.styling.height, "width": console.styling.width }).updateAppClasses()
                break;
            case 'edit-console':
                new ConsoleConfig().render(true, { id })
                break;
            case 'delete-console':
                await ConsoleData.deleteConsole(id)
                break;
            case 'duplicate-console':
                await ConsoleData.duplicateConsole(id)
                break;
            case 'toggle-lock':
                await ConsoleData.toggleLock(id)
                break;
            case 'toggle-visibility':
                await ConsoleData.toggleVisibility(id)
                break;
            default:
                ui.notifications.error(`ConsoleManager encountered an invalid button data-action '${action}' in _handleButtonClick`)
        }
    }

    render(...args) {
        this._document.apps[this.appId] = this
        if (this._represents) {
            this._represents.apps[this.appId] = this
        }
        return super.render(...args)
    }

    async close(...args) {
        delete this._document.apps[this.appId]
        delete this._represents.apps[this.appId]
        return super.close(...args)
    }

    versionMigration(console) {
        if (!console.public) {
            console.public = false
            ConsoleData.updateConsole(console.id, console)
        }
        if (!console.locked) {
            console.locked = false
            ConsoleData.updateConsole(console.id, console)
        }
        if (!console.defaultAnchor) {
            console.defaultAnchor = false
            ConsoleData.updateConsole(console.id, console)
        }
    }

}

