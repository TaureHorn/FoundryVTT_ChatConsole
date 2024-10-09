import Console from "../console.js"

export default class MakeTimeFormat extends FormApplication {

    static get defaultOptions() {

        const defaults = super.defaultOptions
        const overrider = {
            height: 'auto',
            resizable: true,
            template: Console.TEMPLATES.MAKESTRING,
            title: 'Make a time format string',
            width: 300
        }

        return foundry.utils.mergeObject(defaults, overrider)
    }

    getData() {

        // if simple calendar install get dummy data from there
        if (game.modules.get('foundryvtt-simple-calendar')) {
            if (game.modules.get('foundryvtt-simple-calendar').active) {
                const data = SimpleCalendar.api.currentDateTimeDisplay()
                data.timeShort = data.time.slice(0, 5)
                return data
            }
        }

        // if simple calendar not installed user this dummy data
        return data = {
            day: "8",
            daySuffix: "th",
            month: "10",
            monthName: "October",
            timeShort: "18:23",
            time: "18:23:47",
            weekday: "Tuesday",
            year: "2024",
            yearName: "Dog",
            yearPostfix: "AD",
            yearPrefix: ":"
        }

    }

    _updateObject(event, formData) {

        const timeBuilder = {
            stringArray: [],
            customs: {}
        }

        // loop over form object and push select values to array and custom strings to object
        for (const keys in formData) {
            if (formData[keys]) {
                switch (keys) {
                    case 'custom-1':
                    case 'custom-2':
                    case 'custom-3':
                        const key = keys.toString().replace('-', '')
                        timeBuilder.customs[key] = formData[keys]
                        break;
                    default:
                        timeBuilder.stringArray.push(formData[keys])
                }
            }
        }

        game.settings.set(Console.ID, 'timestampBuilder', timeBuilder)
    }

}
