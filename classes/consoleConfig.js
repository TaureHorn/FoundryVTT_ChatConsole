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
        const scenesData = []
        game.scenes._source.forEach((scene) => {
            scenesData.push({
                "name": scene.name,
                "id": scene._id,
                "thumbnail": scene.thumb
            })
        })
        return {
            console: ConsoleData.getConsoles().find((obj) => obj.id === options.id),
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
            public: oldData.public,
            scenes: [],
            styling: {
                bg: formData.bgCol,
                bgImg: formData.bgImg,
                fg: formData.fgCol,
                messengerStyle: messengerStyle
            }
        }

        for (const property in formData) {
            if (formData[property]) {
                if (property.length === Console.IDLENGTH && formData[property] === property) {
                    newData.scenes.push(property)
                }
            }
        }

        ConsoleData.updateConsole(oldData.id, newData)
    }
}

