import ConsoleApp from "./classes/consoleApp.js";
import ConsoleData from "./classes/consoleData.js";
import ConsoleManager from "./classes/consoleManager.js"

// load module
console.log("Console module | module load init")

export default class Console {
    static ID = 'console';

    static IDLENGTH = 16

    static FLAGS = {
        "CONSOLE": "consoles"
    }

    static TEMPLATES = {
        APP_IM: `modules/${this.ID}/templates/console-im.hbs`,
        APP_TERM: `modules/${this.ID}/templates/console-term.hbs`,
        APP_TERM_PLAYER: `modules/${this.ID}/templates/console-term_player.hbs`,
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

Hooks.on('init', function() {
    game.settings.register(Console.ID, 'moduleElementsName', {
        name: "Module elements name",
        hint: "If you don't like them being called 'Consoles', if it doesn't fit with your fantasy setting, rename it to something else",
        scope: 'world',
        config: true,
        type: String
    })
})

// add button to chat
Hooks.on('renderSidebarTab', (chatLog, html) => {
    const name = game.settings.get(Console.ID, 'moduleElementsName') || game.i18n.localize('CONSOLE.consoles')
    const tooltip = game.i18n.localize('CONSOLE.button-title')
    const button = `<button id="console-manager-launcher" data-tooltip="${tooltip}"><i class="fas fa-terminal"></i> ${name}</button>`
    html.find('#chat-controls').after(button)

    html.on('click', '#console-manager-launcher', (event) => {
        new ConsoleManager(ConsoleData.getDataPool(), game.user).render(true)
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
Hooks.once('ready', function() {
    game.socket.on("module.console", (data) => {
        ConsoleApp._handleShareApp(data.users, data.id)
    })
    if (game.user.isGM) {
        ConsoleData.getDataPool()
    }
})


Hooks.once('devModeReady', ({ registerPackageDebugFlag }) => {
    registerPackageDebugFlag(Console.ID)
});

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

