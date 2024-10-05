import ConsoleApp from "./classes/consoleApp.js";
import DefaultConfig from "./classes/defaultConfig.js";
import ConsoleData from "./classes/consoleData.js";
import ConsoleManager from "./classes/consoleManager.js"

// load module
console.log("Console module | module load init")

export default class Console {
    static ID = 'console';

    static IDLENGTH = 16

    static FLAGS = {
        "CONSOLE": "consoles",
        "MOD_VERSION": "version",
        "UNREAD": "unread"
    }

    static TEMPLATES = {
        APP_IM: `modules/${this.ID}/templates/console-im.hbs`,
        APP_TERM: `modules/${this.ID}/templates/console-term.hbs`,
        APP_TERM_PLAYER: `modules/${this.ID}/templates/console-term_player.hbs`,
        CONFIG: `modules/${this.ID}/templates/config.hbs`,
        MANAGER: `modules/${this.ID}/templates/manager.hbs`,
        MANAGER_PLAYER: `modules/${this.ID}/templates/manager_player.hbs`
    }

    static print(force, action, ...args) {
        const shouldLog = force || game.modules.get('_dev-mode')?.api?.getPackageDebugValue(this.ID);
        if (shouldLog) {
            switch (action) {
                case 'error':
                    console.error("Module: Console --> error", '|', ...args)
                    break;
                case 'log':
                    console.log("Module: Console --> debug", '|', ...args);
                    break;
                case 'update':
                    console.log("Module: Console --> updating", '|', ...args)
                    break;
                case 'warn':
                    console.warn("Module: Console --> warning!", '|', ...args)
                    break;
                default:
                    console.error("Module: Console --> Console.print encountered an invalid switch case '" + action + "'")
            }
        }
    }


    static getRename(append, fallback) {
        const rename = game.settings.get(Console.ID, 'moduleElementsName')
        if (!rename || rename === '') {
            return fallback
        } else {
            return append ? `${rename} ${append}` : rename
        }
    }

}

Hooks.on('init', function() {

    game.settings.register(Console.ID, 'moduleElementsName', {
        name: "Module elements name",
        hint: "If you don't like them being called 'Consoles', if it doesn't fit with your fantasy setting, rename it to something else. REQUIRES RELOAD",
        scope: 'world',
        config: true,
        type: String,
        requiresReload: true

    }),

    game.settings.registerMenu(Console.ID, 'defaultConfigMenu', {
        name: "Default console configuration",
        label: "Open config",
        hint: "Configure the default console appearance and functionality",
        scope: "world",
        config: true,
        type: DefaultConfig,
        restricted: true,
        requiresReload: false
    }),

    game.settings.register(Console.ID, 'defaultConfig', {
        scope: "world",
        config: false,
        type: Object,
        default: {},
    }),

    game.settings.register(Console.ID, 'notificationContext', {
        name: "Notification volume control context",
        hint: "Which volume control context would you like to use for console notifications? Interface, environent or music",
        scope: 'client',
        config: true,
        requiresReload: false,
        type: new foundry.data.fields.StringField({
            choices: {
                'interface': 'interface',
                'environment': 'environent',
                'music': 'music'
            }
        }),
        default: 'interface'
    })

    game.settings.register(Console.ID, 'globalNotificationSounds', {
        name: "Mute notification sounds",
        hint: "Globally mute notification sounds. Volume is controlled using either the music, environent or interface slider on the audio tab. Default is set to interface",
        scope: 'client',
        config: true,
        requiresReload: false,
        type: Boolean,
        default: false
    })

    game.settings.register(Console.ID, 'timestampVerbosity', {
        name: "Timestamp verbosity",
        hint: "Choose what data to show in chat timestamps",
        scope: 'world',
        config: true,
        requiresReload: false,
        restricted: true,
        type: new foundry.data.fields.StringField({
            choices: {
                'time': 'Time: 18:23',
                'time-date': 'Time & Date: 18:23 19/04/2024',
                'date': 'Date: 19/04/2024',
                'date-string': 'Datestring: 19th April 2024',
                'full': 'Time & Datestring: 18:23 19th April 2024'
            }
        }),
        default: 'time-date'
    })

})

// add button to chat
Hooks.on('renderSidebarTab', (chatLog, html) => {
    const id = 'console-manager-launcher'
    const tooltip = game.i18n.localize('CONSOLE.button-title')
    const name = Console.getRename("", game.i18n.localize('CONSOLE.consoles'))
    const inner = `<i class="fas fa-terminal"></i> ${name}`
    html.find('#chat-controls').after(`<button id=${id} data-tooltip="${tooltip}">${inner}</button>`)

    html.on('click', '#console-manager-launcher', (event) => {
        new ConsoleManager(ConsoleData.getDataPool(), game.user).render(true)
        const btn = document.getElementById(id)
        if (btn.innerHTML != inner) {
            btn.innerHTML = inner
        }
    })
})

// tracks the input of an app and records its value in the object as part of preventing an input being cleared in the document update cycle
Hooks.on('renderConsoleApp', (...args) => {
    document.querySelector(`#consoleInputText${args[0].id}`).addEventListener('keyup', (event) => {
        args[0]._inputVal = event.target.value
    })
})

// runs automatically on load
//      register socket to share apps with players
//      to pre-create a document to store module data 
Hooks.once('ready', async function() {
    game.socket.on("module.console", async (data) => {
        // @param {Object} data
        // check if user in id array of shared clients
        if (data.users.includes(game.userId)) {
            switch (data.event) {
                case 'gmPropagateNotifications':
                    if (game.user.isGM) {
                        await ConsoleData.setPlayerFlags({ context: 'messageNotification', addition: true }, data.users, data.console.id)
                    }
                    break;
                case 'messageNotification':
                    await ConsoleApp.notifyRecieve(data.console)
                    break;
                case 'shareApp':
                    ConsoleApp._handleShareApp(data.id)
                    break;
                case 'userPropagateNotifications':
                    if (!game.user.isGM) {
                        await ConsoleData.setPlayerFlags({ context: 'messageNotification', addition: true }, [game.userId], data.console.id)
                    }
                    break;
                default:
                    Console.print(true, 'error', `encountered an incorrect socket event string '${data.event}' in console.socket.on`)
            }
        }
    })

    if (!game.user.getFlag(Console.ID, 'unread')) {
        await ConsoleData.setPlayerFlags({ "context": "messageNotification", "addition": true }, [game.userId], {})
    }

    if (game.user.isGM) {
        const data = ConsoleData.getDataPool()
        const version = data.getFlag(Console.ID, Console.FLAGS.MOD_VERSION)
        if (!version || version !== game.modules.get(Console.ID).version) {
            // check version and update data if not current version
            ui.notifications.notify(`Console | ${game.i18n.localize("CONSOLE.version-migration")}`)
            await ConsoleData.versionControl(data, version)
        }

        const defaultSetting = game.settings.get(Console.ID, 'defaultConfig')
        if (Object.keys(defaultSetting).length === 0) {
            const defaultConfig = new DefaultConfig
            game.settings.set(Console.ID, 'defaultConfig', defaultConfig._defaultData)
        }
    }



})

Hooks.once('devModeReady', ({ registerPackageDebugFlag }) => {
    registerPackageDebugFlag(Console.ID)
});

Handlebars.registerHelper('countInArray', function(data, arr) {
    // @param {any} data
    // @param {Array} arr
    // @return {Number} number of times @data appears in @arr
    let number = 0
    arr.forEach((id) => {
        if (id === data) {
            number = ++number
        }
    })
    return number
})

// custom helper for ConsoleApp console.hbs
Handlebars.registerHelper('equal', function(input1, input2, options) {
    // @param {any} input1 
    // @param {any} input2
    // params must be same type, and able to be deepEquals'ed
    // @return {bool} --> boolean informs which blocks are rendered in handlebars file
    if (input1 === input2) {
        return options.fn(this)
    } else {
        return options.inverse(this)
    }
})

// custom helper for ConsoleConfig config.hbs
Handlebars.registerHelper('inArray', function(data, otherArray, options) {
    // @param {any} data
    // @param {Array} otherArray
    // @return {bool} --> boolean informs which blocks are rendered in handlebars file
    if (otherArray.includes(data)) {
        return options.fn(this)
    } else {
        return options.inverse(this)
    }
})

Handlebars.registerHelper('isGM', function(options) {
    return game.user.isGM ? options.fn(this) : options.inverse(this)
})

Handlebars.registerHelper('isNotLastIndex', function(arr, index, options) {
    // @param {Array} arr
    // @param {number} index
    // @return {bool} --> boolean informs which blocks are rendered in handlebars file
    const len = index + 1
    if (len === arr.length) {
        return options.inverse(this)
    } else {
        return options.fn(this)
    }
})

// checks if username in previous index. Does not render if it was.
Handlebars.registerHelper('unameInPrevIndex', function(arrItem, itemIndex, arr, options) {
    // @param {any} arrItem
    // @param {number} itemIndex
    // @param {Array} arr
    // @return {bool} --> boolean informs which blocks are rendered in handlebars file
    const index = itemIndex - 1
    if (index > -1) {
        if (arr[index].user.name === arrItem) {
            return options.inverse(this)
        } else {
            return options.fn(this)
        }
    }
})

console.log("Console module | module fully loaded")

