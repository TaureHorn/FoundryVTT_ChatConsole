// load module
console.log("console module | Hello World")

class Console {
    static ID = 'console';

    static FLAGS = {
        CONSOLE: 'console'
    }

    static TEMPLATES = {
        CONSOLELAYOUT: `modules/${this.ID}/templates/console.hbs`
    }
    
    static log(force, ...args) {
        const shouldLog = force || game.modules.get('_dev-mode')?.api?.getPackageDebugValue(this.ID);
        
        if (shouldLog) {
            console.log(this.ID, '|', ...args);
        }
    }

}
Hooks.once('devModeReady', ({ registerPackageDebugFlag }) => {
    registerPackageDebugFlag(Console.ID)
});
