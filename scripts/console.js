// load module
console.log("console module | Hello World")

class Console {
    static ID = 'console';

    static FLAGS = {
        "CONSOLE": "console" 
    }

    static TEMPLATES = {
        CONSOLELAYOUT: `modules/${this.ID}/templates/console.hbs`
    }

    static log(force, ...args) {
        const shouldLog = force || game.modules.get('_dev-mode')?.api?.getPackageDebugValue(this.ID);

        if (shouldLog) {
            console.log(this.ID + " debug", '|', ...args);
        }
    }

}

class ConsoleData {

    static name = "Console Data"

    static ID = "Rk3WTT9Rvm0smJKg"

    static createDataPool() {
        // @return {Object} <Promise>
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
        const dataPool = game.journal.getName(this.name)
        if (dataPool) {
            return dataPool
        } else {
            this.createDataPool()
            ui.notifications.notify(`Console | Created JournalEntry '${this.name}' to store module data`)
        }
    }

    static get allConsoles() {

    }

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

    static deleteConsole(name) {
        if (game.user.isGM) {
            const data = this.getDataPool()
            const index = data.flags.Console.instances.indexOf()
            Console.log(true, "index", index)

        }
    }

    static updateConsole() {
    }

}
Hooks.once('devModeReady', ({ registerPackageDebugFlag }) => {
    registerPackageDebugFlag(Console.ID)
});

