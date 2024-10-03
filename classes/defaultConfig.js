import Console from "../console.js"

export default class DefaultConfig extends FormApplication {
    static get defaultOptions() {
        const defaults = super.defaultOptions
        const overrider = {
            height: 'auto',
            left: 1340,
            resizable: true,
            template: Console.TEMPLATES.CONFIG,
            title: Console.getRename("Config", "Default Console Config"),
            top: 40,
            width: 350
        }

        const mergedOptions = foundry.utils.mergeObject(defaults, overrider)
        return mergedOptions
    }

    _defaultData = {
        content: {
            body: [],
            title: "title",
        },
        description: "Description",
        gmInfo: "GM info",
        name: "title",
        limits: {
            hardLimit: 2048, // inbuilt character limit so you can't just send the entire bee movie script
            marker: '...',
            type: 'none', // options are 'words', 'characters' and 'none'.
            value: 0
        },
        locked: false,
        playerOwnership: [],
        public: false,
        scenes: [],
        sceneNames: [],
        styling: {
            bg: '#000000',
            bgImg: "",
            fg: '#ffffff',
            height: 880,
            messengerStyle: true,
            mute: false,
            notificationSound: "",
            width: 850
        }
    }

    getData() {
        const config = {
            console: {},
            players: [],
            scenes: []
        }

        if (game.settings.get(Console.ID, 'defaultConfig')) {
            config.console = game.settings.get(Console.ID, 'defaultConfig')
        } else {
            config.console = structuredClone(this._defaultData)
        }

        let players = game.users._source
        const GM = players.find((obj) => obj.role === 4)
        if (GM) {
            players.splice(players.indexOf(GM), 1)
        }
        config.players = players

        const scenesData = []
        game.scenes._source.forEach((scene) => {
            scenesData.push({
                "name": scene.name,
                "id": scene._id,
                "thumbnail": scene.thumb
            })
        })
        config.scenes = scenesData

        return config
    }
    async _updateObject(event, formData) {
        const oldData = game.settings.get(Console.ID, 'defaultConfig')
        const newData = {
            content: {
                body: [],
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
            playerOwnership: [],
            public: oldData.public,
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
            game.settings.set(Console.ID, 'defaultConfig', newData)
        } catch (err) {
            console.error(err)
            ui.notifications.error(`Console | Unable to update the default config. See browser console for error`)
        }
    }
}
