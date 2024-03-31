// load module
console.log("console module | Hello World")

class Console {
    static ID = 'console';

    static FLAGS = {
        "CONSOLE": "consoles"
    }

    static TEMPLATES = {
        CONFIG: `modules/${this.ID}/templates/config.hbs`,
        CONSOLELAYOUT: `modules/${this.ID}/templates/console.hbs`,
        MANAGER: `modules/${this.ID}/templates/manager.hbs`
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
    if (game.user.isGM) {
        const controlButtons = html.find(`[id="chat-log"]`)
        const tooltip = game.i18n.localize('CONSOLE.button-title')
        controlButtons.prepend(
            `<button class="console-manage-button " type='button'><i class='fa-solid fa-terminal' title='${tooltip}'></i> Manage Consoles</button>`
        )

        html.on('click', '.console-manage-button', (event) => {
            new ConsoleManager().render(true)
        })
    }
})

Hooks.once('devModeReady', ({ registerPackageDebugFlag }) => {
    registerPackageDebugFlag(Console.ID)
});

// custom helper for ConsoleConfig config.hbs
Handlebars.registerHelper('inArray', function(data, otherArray, options) {
    if (otherArray.includes(data)){
        return options.fn(this)
    } else {
        return options.inverse(this)
    }
})

class ConsoleData {

    static name = "Console Data"

    static ID = "Rk3WTT9Rvm0smJKg"

    static createDataPool() {
        if (game.user.isGM) {
            const newDataPool = new JournalEntry({
                "name": this.name
            })
            JournalEntry.create(newDataPool)
        } else {
            ui.notifications.error(`Console | No data storage Document of name '${this.name}' exists and you lack the permissions to create one. Consult your GM.`)
        }
    }

    static getDataPool() {
        // return {Object}
        const dataPool = game.journal.getName(this.name)
        if (dataPool) {
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
        Array.from(Object.entries(data.flags.console.consoles)).forEach((entry) => {
            arr.push(entry[1])
        })
        return arr
    }

    // TODO: Implement custom object schema for newConsole data
    static createConsole(name) {
        if (game.user.isGM) {
            const newConsole = {
                content: {
                    body: "",
                    inputPlaceholder: "...",
                    title: `${name} console`,
                },
                description: "",
                id: foundry.utils.randomID(16),
                name: name,
                scenes: [],
                styling: {
                    fg: "#bbb",
                    bg: "#111"
                }
            }
            const data = this.getDataPool()
            const newConsoles = {
                [newConsole.id]: newConsole
            }
            data.setFlag(Console.ID, Console.FLAGS.CONSOLE, newConsoles)
        }
    }

    static deleteConsole(id) {
        // @param {string} id
        if (game.user.isGM) {
            const data = this.getDataPool()
            const idDeletion = {
                [`-=${id}`]: null
            }
            data.setFlag(Console.ID, Console.FLAGS.CONSOLE, idDeletion)
        }
    }

    static updateConsole(id, updateData) {
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
            template: Console.TEMPLATES.MANAGER,
            title: "Console Manager",
            top: 40,
            width: 500,
        }

        const mergedOptions = foundry.utils.mergeObject(defaults, overrider)
        return mergedOptions
    }

    getData() {
        return {
            consoles: ConsoleData.getConsoles()
        }
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

    getData() {
        const scenesData = []
        game.scenes._source.forEach((scene) => {
            scenesData.push({
                "name": scene.name,
                "id": scene._id,
                "thumbnail": scene.thumb
            })
        })
        return {
            console: ConsoleData.getConsoles()[1],
            scenes: scenesData
        }
    }
}

