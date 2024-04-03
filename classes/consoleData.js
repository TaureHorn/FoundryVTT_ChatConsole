import Console from "../console.js"

export default class ConsoleData {

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
        if (data?.flags?.console?.consoles) {
            Array.from(Object.entries(data.flags.console.consoles)).forEach((entry) => {
                arr.push(entry[1])
            })
        }
        return arr
    }

    static async createConsole(name) {
        if (game.user.isGM) {
            const newConsole = {
                content: {
                    body: [],
                    title: name,
                },
                description: "description",
                gmInfo: "GM info",
                id: foundry.utils.randomID(Console.IDLENGTH),
                name: name,
                public: false,
                scenes: [],
                styling: {
                    bg: "#120b10",
                    bgImg: "",
                    fg: "#ff0055",
                    messengerStyle: true
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

