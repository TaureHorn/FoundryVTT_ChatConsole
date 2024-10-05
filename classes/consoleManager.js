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
            title: Console.getRename("Manager", "Console Manager"),
            top: 10,
            width: 400,
        }

        const mergedOptions = foundry.utils.mergeObject(defaults, overrider)
        return mergedOptions
    }

    getData() {
        const consoles = ConsoleData.getAllConsoles().sort((a, b) => a.name.localeCompare(b.name))
        consoles.forEach((console) => {
            console.sceneNames = []
            console.scenes.forEach((id) => {
                console.sceneNames.push(this.getSceneName(id))
            })
        })
        return {
            consoles: consoles,
            flags: game.user.getFlag(Console.ID, Console.FLAGS.UNREAD),
            manager: this,
            userId: game.user._id
        }
    }

    getSceneName(id) {
        return game.scenes._source.find((obj) => obj._id === id).name
    }

    activateListeners(html) {
        super.activateListeners(html)

        if (game.user.isGM) {
            const entries = Array.from(document.getElementsByClassName('console-manager-entry'))
            entries.forEach((node => {
                ContextMenu.create(this, node, '.console-manager-entry', this.#contextMenuOptions)
            }))
        }
        html.on('click', '[data-action]', this._handleButtonClick)
    }

    #contextMenuOptions = [
        {
            name: game.i18n.localize('CONSOLE.manager.edit-console'),
            icon: '<i class="fas fa-pen-to-square"></i>',
            callback: async (item) => {
                const id = item[0].dataset.consoleId
                const appWindow = document.getElementById(id)
                if (appWindow) {
                    ui.windows[appWindow.dataset.appid].close()
                }
                const config = new ConsoleConfig(id)
                config.render(true, { "id": `console-config-${id}` })
            }
        },
        {
            name: game.i18n.localize('CONSOLE.manager.toggle-visibility'),
            icon: '<i class="fas fa-eye"></i>',
            callback: async (item) => {
                const id = item[0].dataset.consoleId
                await ConsoleData.toggleBoolean(id, 'show')
            }
        },
        {
            name: game.i18n.localize('CONSOLE.manager.toggle-lock'),
            icon: '<i class="fas fa-lock"></i>',
            callback: async (item) => {
                const id = item[0].dataset.consoleId
                await ConsoleData.toggleBoolean(id, 'lock')
            }
        },
        {
            name: game.i18n.localize('CONSOLE.manager.toggle-mute'),
            icon: '<i class="fas fa-volume-xmark"></i>',
            callback: async (item) => {
                const id = item[0].dataset.consoleId
                await ConsoleData.toggleBoolean(id, 'mute')
            }
        },
        {
            name: game.i18n.localize('CONSOLE.manager.toggle-notifications'),
            icon: '<i class="fas fa-message-dots"></i>',
            callback: async (item) => {
                const id = item[0].dataset.consoleId
                await ConsoleData.toggleBoolean(id, 'notifications')
            }
        },
        {
            name: game.i18n.localize('CONSOLE.manager.toggle-timestamps'),
            icon: '<i class="fas fa-clock"></i>',
            callback: async (item) => {
                const id = item[0].dataset.consoleId
                await ConsoleData.toggleBoolean(id, 'timestamps')
            }
        },
        {
            name: game.i18n.localize('CONSOLE.manager.duplicate-console'),
            icon: '<i class="fas fa-clone"></i>',
            callback: async (item) => {
                const id = item[0].dataset.consoleId
                await ConsoleData.duplicateConsole(id)
            }
        },
        {
            name: game.i18n.localize('CONSOLE.manager.archive-console'),
            icon: '<i class="fas fa-box-archive"></i>',
            callback: async (item) => {
                const id = item[0].dataset.consoleId
                const console = ConsoleData.getConsole(id)

                const confirm = new Dialog({
                    buttons: {
                        archive: {
                            label: game.i18n.localize('CONSOLE.manager.archive-console'),
                            icon: '<i class="fas fa-box-archive"></i>',
                            callback: async () => {
                                try {
                                    await ConsoleData.createJournalPage(console)
                                    await ConsoleData.updateJournalPage(console)
                                    await ConsoleData.deleteConsole(id)
                                } catch (err) {
                                    console.error(err)
                                    ui.notifications.error("Console | Unable to archive console. Check browser console for error message")
                                }
                            }
                        },
                        close: {
                            label: game.i18n.localize('CONSOLE.manager.cancel'),
                        }
                    },
                    content: `<p>${game.i18n.localize('CONSOLE.manager.confirm-archive')}</p>`
                })
                confirm.render(true)
            }
        },
        {
            name: game.i18n.localize('CONSOLE.manager.delete-console'),
            icon: '<i class="fas fa-trash"></i>',
            callback: (item) => {
                const id = item[0].dataset.consoleId
                const confirm = new Dialog({
                    buttons: {
                        delete: {
                            label: game.i18n.localize('CONSOLE.manager.delete-console'),
                            icon: '<i class="fas fa-trash"></i>',
                            callback: async () => await ConsoleData.deleteConsole(id)
                        },
                        close: {
                            label: game.i18n.localize('CONSOLE.manager.cancel'),
                        }
                    },
                    content: `<p>${game.i18n.localize('CONSOLE.manager.confirm-delete')}</p>`
                })
                confirm.render(true)
            }
        },

    ]

    _handleButtonClick = async (event) => {
        const clickedElement = $(event.currentTarget)
        const action = clickedElement.data().action
        const id = clickedElement.data().consoleId
        const console = ConsoleData.getConsole(id)

        switch (action) {
            case 'create':
                await ConsoleData.createConsole()
                break;
            case 'open-console':

                const appWindow = document.getElementById(console.id)
                if (!appWindow) {
                    // render app if not open
                    new ConsoleApp(ConsoleData.getDataPool(), game.user, this.appId)
                        .render(true, { "id": console.id, "height": console.styling.height, "width": console.styling.width })
                } else {
                    // if open bring to front and flash
                    ui.windows[appWindow.dataset.appid].bringToTop()
                    appWindow.classList.add('flash')
                    setTimeout(() => {
                        appWindow.classList.remove('flash')
                    }, 500)
                }

                // clear notifications for unread messages if they exist
                const flags = [...game.user.getFlag(Console.ID, Console.FLAGS.UNREAD)]
                if (flags.includes(console.id)) {
                    await ConsoleData.removeFromPlayerFlags('messageNotification', [game.userId], console.id)
                }

                break;
            default:
                ui.notifications.error(`Console | ConsoleManager encountered an invalid button data-action '${action}' in _handleButtonClick`)
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

}

globalThis.ConsoleManager = ConsoleManager

