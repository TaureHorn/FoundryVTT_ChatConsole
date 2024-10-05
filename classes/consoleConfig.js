import Console from "../console.js"
import ConsoleData from "./consoleData.js"

export default class ConsoleConfig extends FormApplication {
    static get defaultOptions() {
        const defaults = super.defaultOptions

        const overrider = {
            height: 'auto',
            left: 1340,
            resizable: true,
            template: Console.TEMPLATES.CONFIG,
            title: Console.getRename("Config", "Console Config"),
            top: 40,
            width: 350
        }

        const mergedOptions = foundry.utils.mergeObject(defaults, overrider)
        return mergedOptions
    }

    getData() {
        const console = ConsoleData.getConsole(this.object)

        let players = game.users._source
        const GM = players.find((obj) => obj.role === 4)
        if (GM) {
            players.splice(players.indexOf(GM), 1)
        }

        const scenesData = []
        game.scenes._source.forEach((scene) => {
            scenesData.push({
                "name": scene.name,
                "id": scene._id,
                "thumbnail": scene.thumb
            })
        })
        return {
            console: console,
            players: players,
            scenes: scenesData
        }
    }

    async _updateObject(event, formData) {
        const oldData = this.getData(this.options).console
        const newData = {
            content: {
                body: oldData.content.body,
                title: formData.title
            },
            defaultAnchor: formData.defaultAnchor === "true" ? true : false,
            description: formData.description === "" ? oldData.description : formData.description,
            gmInfo: formData.gmInfo === "" ? oldData.gmInfo : formData.gmInfo,
            id: oldData.id,
            name: formData.name,
            limits: {
                marker: formData.limitMarker,
                type: formData.limitType,
                value: formData.limitVal
            },
            locked: oldData.locked,
            notifications: formData.notifications === "true" ? true : false,
            playerOwnership: [],
            public: formData.public === "true" ? true : false,
            scenes: [],
            styling: {
                bg: formData.bgCol,
                bgImg: formData.bgImg,
                fg: formData.fgCol,
                height: formData.height,
                messengerStyle: formData.messengerStyle === "true" ? true : false,
                mute: formData.notificationMute === "true" ? true : false,
                notificationSound: formData.notificationSound === "" ? oldData.notificationSound : formData.notificationSound,
                width: formData.width
            }
        }

        if (formData.players) {
            if (typeof formData.players === 'object') {
                formData.players.forEach((player) => {
                    if (player) {
                        newData.playerOwnership.push(player)
                    }
                })
            } else if (typeof formData.players === 'string') {
                newData.playerOwnership.push(formData.players)
            } else {
                ui.notifications.error(`Console | Unable to save player data. Invalid formData type`)
            }
        }

        if (formData.scenes) {
            if (typeof formData.scenes === 'object') {
                formData.scenes.forEach((scene) => {
                    if (scene) {
                        newData.scenes.push(scene)
                    }
                })
            } else if (typeof formData.scenes === 'string') {
                newData.scenes.push(formData.scenes)
            } else {
                ui.notifications.error(`Console | Unable to save scene data. Invalid formData type`)
            }
        }

        try {
            await ConsoleData.updateConsole(oldData.id, newData)
        } catch (err) {
            console.error(err)
            ui.notifications.error(`Console | Unable to update this console. See browser console for error`)
        }

    }

}

