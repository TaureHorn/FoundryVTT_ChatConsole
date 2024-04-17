import Console from "../console.js"
import ConsoleData from "./consoleData.js"

export default class ConsoleConfig extends FormApplication {
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

    getData(options) {
        const console = ConsoleData.getConsoles().find((obj) => obj.id === options.id)
        this.versionMigration(console)

        let players = game.users._source
        const GM = players.find((obj) => obj.role === 4)
        if (GM){
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

    _updateObject(event, formData) {
        const oldData = this.getData(this.options).console
        let messengerStyle = false
        if (formData.messengerStyle === "true") {
            messengerStyle = true
        }

        const newData = {
            content: {
                body: oldData.content.body,
                title: formData.title
            },
            description: formData.description === "" ? oldData.description : formData.description,
            gmInfo: formData.description === "" ? oldData.gmInfo : formData.gmInfo,
            id: oldData.id,
            name: formData.name,
            limits: {
                marker: formData.limitMarker,
                type: formData.limitType,
                value: formData.limitVal
            },
            playerOwnership: [],
            public: oldData.public,
            scenes: [],
            styling: {
                bg: formData.bgCol,
                bgImg: formData.bgImg,
                fg: formData.fgCol,
                height: formData.height,
                messengerStyle: messengerStyle,
                width: formData.width
            }
        }

        formData.players.forEach((player) => {
            if (player) {
                newData.playerOwnership.push(player)
            }
        })

        formData.scenes.forEach((scene) => {
            if (scene) {
                newData.scenes.push(scene)
            }
        })

        ConsoleData.updateConsole(oldData.id, newData)

    }

    versionMigration(console) {
        if (!console.playerOwnership) {
            console.playerOwnership = []
            ConsoleData.updateConsole(console.id, console)
        }
        if (!console.limits) {
            console.limits = {
                hardLimit: 2048,
                marker: '...',
                type: 'none',
                value: 0
            }
            ConsoleData.updateConsole(console.id, console)
        }
        if (!console.scenes) {
            console.scenes = []
            ConsoleData.updateConsole(console.id, console)
        }
        if (!console.sceneNames){
            console.sceneNames = []
            ConsoleData.updateConsole(console.id, console)
        }
    }
}

