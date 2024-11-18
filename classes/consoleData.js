import Console from "../console.js"
import DefaultConfig from "./defaultConfig.js"

export default class ConsoleData {

    static name = "_console-data"

    static ID = "Rk3WTT9Rvm0smJKg"

    static async createDataPool() {
        if (game.user.isGM) {
            await JournalEntry.create({
                "flags": {
                    "console": {
                        "consoles": {},
                        "version": game.modules.get(Console.ID).version
                    }
                },
                "name": this.name,
                "ownership": {
                    "default": 3
                }
            })
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

    static getAllConsoles() {
        // return {Array} 
        const data = this.getDataPool()
        if (data?.flags?.console?.consoles) {
            return Array.from(Object.values(data.flags.console.consoles))
        } else {
            Console.print(true, 'error', `flags for journal entry ${this.name} are not set correctly`)
        }
    }

    static getConsole(id) {
        // @param {String} id
        // @return {Object} console
        return this.getAllConsoles().find((obj) => obj.id === id)
    }

    static getConsoleName(name) {
        // @param {String} name
        // @return {Object} console
        // returns the first match of console with that name
        return this.getAllConsoles().find((obj) => obj.name === name)
    }

    static async createJournalPage(console) {
        const newEntry = new JournalEntryPage({ "name": console.name })
        await this.getDataPool().createEmbeddedDocuments(newEntry.constructor.name, [newEntry])
    }

    static async createConsole() {
        if (game.user.isGM) {
            const customDefault = game.settings.get(Console.ID, 'defaultConfig')
            const validDefault = Object.keys(customDefault).length > 0

            const newConsole = validDefault ? customDefault : DefaultConfig._defaultData
            newConsole.id = foundry.utils.randomID(Console.IDLENGTH)

            const newConsoles = {
                [newConsole.id]: newConsole
            }
            this.getDataPool().setFlag(Console.ID, Console.FLAGS.CONSOLE, newConsoles)
        }
    }

    static async deleteConsole(id) {
        // @param {string} id
        if (game.user.isGM) {
            const idDeletion = {
                [`-=${id}`]: null
            }
            this.getDataPool().setFlag(Console.ID, Console.FLAGS.CONSOLE, idDeletion)
        }
    }

    static async duplicateConsole(id) {
        // @param {string} id
        const consoleToCopy = this.getConsole(id)
        const clonedConsole = structuredClone(consoleToCopy)
        clonedConsole.id = foundry.utils.randomID(16)
        clonedConsole.name = `${consoleToCopy.name} (copy)`
        const newConsoles = {
            [clonedConsole.id]: clonedConsole
        }
        this.getDataPool().setFlag(Console.ID, Console.FLAGS.CONSOLE, newConsoles)
    }

    static hexValidator(hexstring) {
        if (typeof hexstring != "string") {
            Console.print(true, 'warn', ` HexValidator: ${hexstring} is an invalid type`)
            ui.notifications.warn(`Console | HexValidator: ${hexstring} is an invalid type`)
            return false
        }

        const hex = hexstring.split('')
        if (hex[0] != '#') {
            Console.print(true, 'warn', ` HexValidator: ${hexstring} missing '#'`)
            ui.notifications.warn(`Console | HexValidator: ${hexstring} missing '#'`)
            return false
        }
        if (hex.length != 7) {
            Console.print(true, 'warn', ` HexValidator: ${hexstring} incorrect length ${hexstring.length}`)
            ui.notifications.warn(`Console | HexValidator: ${hexstring} incorrect length ${hexstring.length}`)
            return false
        }

        const alpha = '#01234567889abcedfABCDEF'
        const charChecker = hex.map((character) => alpha.includes(character) ? true : false)
        if (charChecker.includes(false)) {
            Console.print(true, 'warn', ` HexValidator: ${hexstring} contains an invalid character that is not a hexidecimal character`)
            ui.notifications.warn(`Console | HexValidator: ${hexstring} contains an invalid character that is not a hexidecimal character`)
            return false
        }

        return true
    }

    static async removeFromPlayerFlags(context, idList, data) {
        // @param {string} context
        // @param {Array of strings}} idList
        // @pararm {any} data

        idList.forEach(async (id) => {
            const user = await game.users.get(id)
            switch (context) {
                case 'messageNotification':
                    const flags = await user.getFlag(Console.ID, Console.FLAGS.UNREAD)
                    const filteredFlags = flags.filter(i => i !== data)
                    await user.setFlag(Console.ID, Console.FLAGS.UNREAD, filteredFlags)
                    break;
                default:
                    Console.print(true, 'error', 'encountered invalid switch case in consoleData.removeFromPlayerFlags')
            }
        })

    }

    static async setPlayerFlags(opts, idList, data) {
        // @param {Object} opts
        //     opts.context {string} --> operation to perform
        //     opts.operation {Boolean} --> true = add data , false = remove data
        // @param {Array of strings}} idList
        // @pararm {any} data

        idList.forEach(async (id) => {
            const user = await game.users.get(id)
            switch (opts.context) {
                case 'messageNotification':
                    const unreadList = await user.getFlag(Console.ID, Console.FLAGS.UNREAD) ? [...user.getFlag(Console.ID, Console.FLAGS.UNREAD)] : []
                    opts.addition ? unreadList.push(data) : unreadList.splice(unreadList.indexOf(data), 1)
                    await user.setFlag(Console.ID, Console.FLAGS.UNREAD, unreadList)
                    break;
                default:
                    Console.print(true, 'error', 'encountered invalid switch case in consoleData.setPlayerFlags')
            }

        })

    }

    static async toggleBoolean(id, action) {
        // @param {String} id
        // @param {String} action
        const console = this.getConsole(id)

        switch (action) {
            case 'lock':
                console.locked = console.locked ? false : true
                break;
            case 'mute':
                console.styling.mute = console.styling.mute ? false : true
                break;
            case 'notifications':
                console.notifications = console.notifications ? false : true
                break;
            case 'show':
                console.public = console.public ? false : true
                break;
            case 'timestamps':
                console.timestamps = console.timestamps ? false : true
                break;
            default:
        }

        const update = {
            [id]: console
        }
        this.getDataPool().setFlag(Console.ID, Console.FLAGS.CONSOLE, update)
    }

    static async updateConsole(id, updateData) {
        // @param {string} id
        // @param {object} updateData
        const update = {
            [id]: updateData
        }
        this.getDataPool().setFlag(Console.ID, Console.FLAGS.CONSOLE, update)
    }

    static async updateJournalPage(console) {
        // @param {object} console
        let html = `
            <div style="background-color:${console.styling.bg};
            border:2px solid ${console.styling.fg};
            color:${console.styling.fg};
            padding: 5px">
            <p style="background-color:${console.styling.fg};color:${console.styling.bg}"><strong>${console.content.title}</strong></p>`

        if (console.content.body.length > 0) {
            console.content.body.forEach((message) => {
                if (message.user.name.length === 0) {
                    html += `<p>${message.text}`
                } else {
                    html += `<p><strong>${message.user.name}</strong>: ${message.text}</p>`
                }
            })
        }
        html += `</div>`

        const doc = ConsoleData.getDataPool().pages._source.find((obj) => obj.name === console.name)
        const data = ConsoleData.getDataPool()
        await data.updateEmbeddedDocuments('JournalEntryPage', [{
            _id: doc._id,
            flags: {
                [Console.ID]: {
                    [Console.FLAGS.CONSOLE]: console
                }
            },
            sort: data._source.pages.length > 0 ? data._source.pages[data._source.pages.length - 1].sort + 100000 : 0,
            text: {
                content: html,
                format: 1,
                markdown: ""
            },
        }])


    }

    static async versionControl(data, version) {
        const consoles = Array.from(Object.values(data.getFlag(Console.ID, Console.FLAGS.CONSOLE)))

        // update version number
        if (!version || !version !== game.modules.get(Console.ID).version) {
            version = game.modules.get(Console.ID).version
            Console.print(true, 'update', `changed stored version number to current version: '${game.modules.get(Console.ID).version}'`)
            await data.setFlag(Console.ID, Console.FLAGS.MOD_VERSION, version)
        }

        // iterate through each console and add missing key:value pairs
        const updatedConsoles = {}
        const df = DefaultConfig._defaultData

        consoles.push(game.settings.get(Console.ID, 'defaultConfig')) // add the default config setting to list of consoles to modify
        consoles.forEach((console, index) => {

            Console.print(true, 'update', `Data for ${console.id} (${console.name}) is being scanned for changes from the new module version)`)
            !console.id ? console.id = foundry.utils.randomID(Console.IDLENGTH) : null
            !console.content ? console.content = df.content : null
            !console.content.body ? console.content.body = df.content.body : null
            !console.content.title ? console.content.title = df.content.title : null
            !console.defaultAnchor ? console.defaultAnchor = df.defaultAnchor : null
            !console.description ? console.description = df.description : null
            !console.gmInfo ? console.gmInfo = df.gmInfo : null
            !console.name ? console.name = df.name : null
            !console.limits ? console.limits = df.limits : null
            !console.limits.hardLimit ? console.limits.hardLimit = df.limits.hardLimit : null
            !console.limits.marker ? console.limits.marker = df.limits.marker : null
            !console.limits.type ? console.limits.type = df.limits.type : null
            !console.limits.value ? console.limits.value = df.limits.value : null
            !console.linkedActor ? console.linkedActor = df.linkedActor : null
            !console.locked ? console.locked = df.locked : null
            !console.notifications ? console.notifications = df.notifications : null
            !console.playerOwnership ? console.playerOwnership = df.playerOwnership : null
            !console.playerPermissions ? console.playerPermissions = console.playerOwnership : null
            !console.public ? console.public = df.public : null
            !console.scenes ? console.scenes = df.scenes : null
            !console.styling ? console.styling = df.styling : null
            !console.styling.bg ? console.styling.bg = df.styling.bg : null
            !console.styling.bgImg ? console.styling.bgImg = df.styling.bgImg : null
            !console.styling.fg ? console.styling.fg = df.styling.fg : null
            !console.styling.height ? console.styling.height = df.styling.height : null
            !console.styling.messengerStyle ? console.styling.messengerStyle = df.styling.messengerStyle : null
            !console.styling.mute ? console.styling.mute = df.styling.mute : null
            !console.styling.notificationSound ? console.styling.notificationSound = df.styling.notificationSound : null
            !console.styling.width ? console.styling.width = df.styling.width : null
            !console.timestamps ? console.timestamps = df.timestamps : null

            if (index !== consoles.length - 1) {
                updatedConsoles[console.id] = console
            }
        })

        const newDefault = consoles.pop()
        await game.settings.set(Console.ID, 'defaultConfig', newDefault)
        await data.setFlag(Console.ID, Console.FLAGS.CONSOLE, updatedConsoles)
        Console.print(true, 'update', 'Version migration complete. Return -->', updatedConsoles)

    }
}

globalThis.ConsoleData = ConsoleData

