// load module
console.log("Cconsole module | module loaded")

class Console {
    static ID = 'console';

    static FLAGS = {
        "CONSOLE": "consoles"
    }

    static TEMPLATES = {
        APP: `modules/${this.ID}/templates/console.hbs`,
        APP_PLAYER: `modules/${this.ID}/templates/console_player.hbs`,
        CONFIG: `modules/${this.ID}/templates/config.hbs`,
        MANAGER: `modules/${this.ID}/templates/manager.hbs`,
        MANAGER_PLAYER: `modules/${this.ID}/templates/manager_player.hbs`
    }

    static log(force, ...args) {
        const shouldLog = force || game.modules.get('_dev-mode')?.api?.getPackageDebugValue(this.ID);

        if (shouldLog) {
            console.log(this.ID + " debug", '|', ...args);
        }
    }

}

// add button to chats
Hooks.on('renderSidebarTab', (chatLog, html) => {
    const controlButtons = html.find(`[id="chat-log"]`)
    const tooltip = game.i18n.localize('CONSOLE.button-title')
    controlButtons.prepend(
        `<button class="console-manage-button " type='button'><i class='fa-solid fa-terminal' title='${tooltip}' ></i> Consoles</button>`
    )

    html.on('click', '.console-manage-button', (event) => {
        new ConsoleManager().render(true)
    })
})

Hooks.once('devModeReady', ({ registerPackageDebugFlag }) => {
    registerPackageDebugFlag(Console.ID)
});

// custom helper for ConsoleConfig config.hbs
Handlebars.registerHelper('inArray', function(data, otherArray, options) {
    if (otherArray.includes(data)) {
        return options.fn(this)
    } else {
        return options.inverse(this)
    }
})

class ConsoleData {

    static name = "_console-data"

    static ID = "Rk3WTT9Rvm0smJKg"

    static createDataPool() {
        if (game.user.isGM) {
            JournalEntry.create({ "name": this.name })
        } else {
            ui.notifications.error(`Console | No data storage Document of name '${this.name}' exists and you lack the permissions to create one. Consult your GM.`)
        }
    }

    static getDataPool() {
        // return {Object}
        const dataPool = game.journal.getName(this.name)
        if (dataPool) {
            if (!dataPool.flags.console?.consoles) {
                dataPool.setFlag(Console.ID, Console.FLAGS.CONSOLE, {})
            }
            return dataPool
        } else {
            this.createDataPool()
            ui.notifications.notify(`Console | Created JournalEntry '${this.name}' to store module data`)
        }
    }

    static getConsoles() {
        // return {Array} 
        const data = this.getDataPool()
        let arr = []
        if (data.flags.console.consoles) {
            Array.from(Object.entries(data.flags.console.consoles)).forEach((entry) => {
                arr.push(entry[1])
            })
        }
        return arr
    }

    // TODO: Implement custom object schema for newConsole data
    static async createConsole(name) {
        if (game.user.isGM) {
            const newConsole = {
                content: {
                    body: [],
                    title: `${name} console`,
                },
                description: "",
                id: foundry.utils.randomID(16),
                name: name,
                public: false,
                scenes: [],
                styling: {
                    bg: "#120b10",
                    bgImg: "",
                    fg: "#ff0055"
                }
            }
            const data = this.getDataPool()
            const newConsoles = {
                [newConsole.id]: newConsole
            }
            data.setFlag(Console.ID, Console.FLAGS.CONSOLE, newConsoles)
        }
    }

    static async deleteConsole(id) {
        // @param {string} id
        if (game.user.isGM) {
            const data = this.getDataPool()
            const idDeletion = {
                [`-=${id}`]: null
            }
            data.setFlag(Console.ID, Console.FLAGS.CONSOLE, idDeletion)
        }
    }

    static async duplicateConsole(id) {
        // @param {string} id
        const consoleToCopy = this.getConsoles().find((obj) => obj.id === id)
        const clonedConsole = structuredClone(consoleToCopy)
        clonedConsole.id = foundry.utils.randomID(16)
        clonedConsole.name = `${consoleToCopy.name} (copy)`
        const newConsoles = {
            [clonedConsole.id]: clonedConsole
        }
        this.getDataPool().setFlag(Console.ID, Console.FLAGS.CONSOLE, newConsoles)
    }

    static async toggleVisibility(id) {
        // @param {string} id
        const consoleToCopy = this.getConsoles().find((obj) => obj.id === id)
        consoleToCopy.public = consoleToCopy.public ? false : true
        const update = {
            [id]: consoleToCopy
        }
        this.getDataPool().setFlag(Console.ID, Console.FLAGS.CONSOLE, update)
    }

    static async updateConsole(id, updateData) {
        // @param {string} id
        // @param {object} updateData
        const data = this.getDataPool()
        const update = {
            [id]: updateData
        }
        data.setFlag(Console.ID, Console.FLAGS.CONSOLE, update)
    }

}

// autoruns on load, should premake a data pool for first time users
// ConsoleData.getDataPool()

class ConsoleManager extends FormApplication {
    static get defaultOptions() {
        const defaults = super.defaultOptions

        const overrider = {
            height: 'auto',
            id: 'console-manager',
            left: 1700,
            template: game.user.isGM ? Console.TEMPLATES.MANAGER : Console.TEMPLATES.MANAGER_PLAYER,
            title: "Console Manager",
            top: 40,
            width: 500,
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
        })
        return {
            consoles: consoles
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

        switch (action) {
            case 'create':
                await ConsoleData.createConsole("new console")
                break;
            case 'open-console':
                new ConsoleApp().render(true, { id })
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
            case 'toggle-visibility':
                await ConsoleData.toggleVisibility(id)
                break;
            default:
                ui.notifications.error("ConsoleManager encountered an invalid button data-action in _handleButtonClick")
        }
        setTimeout(() => {
            this.render()
        }, "250")
    }

}

class ConsoleApp extends FormApplication {
    static get defaultOptions() {
        const defaults = super.defaultOptions;
        const overrides = {
            closeOnSubmit: false,
            height: 670,
            id: `${Console.ID}`,
            popOut: true,
            maximizable: true,
            minimizable: true,
            resizable: true,
            submitOnChange: true,
            template: game.user.isGM ? Console.TEMPLATES.APP : Console.TEMPLATES.APP_PLAYER,
            width: 640
        }
        return foundry.utils.mergeObject(defaults, overrides)
    }

    activateListeners(html) {
        super.activateListeners(html)
        html.on('click', "[data-action]", this._handleButtonClick)
    }

    getData() {
        Console.log(true, this.options.id)
        const console = ConsoleData.getConsoles().find((obj) => obj.id === this.options.id)
        let data = {
            ...console
        }
        data.character = game.user.character?.name || "$user"
        return data
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
            name = game.user.character ? `${game.user.character.name}:` : ""
        } else {
            name = game.user.character ? `${game.user.character.name}:` : `${game.user.name}`
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

class ConsoleConfig extends FormApplication {
    static get defaultOptions() {
        const defaults = super.defaultOptions

        const overrider = {
            height: 'auto',
            id: 'console-config',
            left: 1340,
            resizable: true,
            template: Console.TEMPLATES.CONFIG,
            title: "Console Config",
            top: 40,
            width: 350
        }

        const mergedOptions = foundry.utils.mergeObject(defaults, overrider)
        return mergedOptions
    }

    getData(options) {
        const scenesData = []
        game.scenes._source.forEach((scene) => {
            scenesData.push({
                "name": scene.name,
                "id": scene._id,
                "thumbnail": scene.thumb
            })
        })
        return {
            console: ConsoleData.getConsoles().find((obj) => obj.id === options.id),
            scenes: scenesData
        }
    }

    _updateObject(event, formData) {
        const oldData = this.getData(this.options).console
        const newData = {
            content: {
                body: oldData.content.body,
                title: formData.title
            },
            description: formData.description === "" ? oldData.description : formData.description,
            id: oldData.id,
            name: formData.name,
            scenes: [],
            styling: {
                bg: formData.bgCol,
                bgImg: formData.bgImg,
                fg: formData.fgCol
            }
        }
        for (const property in formData) {
            if (formData[property]) {
                if (property.length === 16 && formData[property] === property) {
                    newData.scenes.push(property)
                }
            }
        }

        ConsoleData.updateConsole(oldData.id, newData)
    }
}

