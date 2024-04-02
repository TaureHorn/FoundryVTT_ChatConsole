import ConsoleManager from "./classes/consoleManager.js"

// load module
console.log("Console module | module loaded")

export default class Console {
    static ID = 'console';

    static FLAGS = {
        "CONSOLE": "consoles"
    }

    static TEMPLATES = {
        APP_IM: `modules/${this.ID}/templates/console-im.hbs`,
        APP_IM_PLAYER: `modules/${this.ID}/templates/console-im_player.hbs`,
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

// add button to chat
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
    // @param {any} data
    // @param {Array} otherArray
    // @return {bool} --> boolean informs which blocks are rendered in handlebars file
    if (otherArray.includes(data)) {
        return options.fn(this)
    } else {
        return options.inverse(this)
    }
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

