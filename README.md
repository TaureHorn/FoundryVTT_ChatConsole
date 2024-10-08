# Console
***A FoundryVTT module for stylish chat and terminal windows***

Create, manage and customise floating chat windows for stylised in-game instant-messaging or computer terminals.
![example](https://raw.githubusercontent.com/TaureHorn/FoundryVTT_ChatConsole/main/screenshot.png)
## Features
The following are a few of the modules features that warrant a little explanation.
### Anchoring
A console window can be set to anchor. An anchored window cannot be closed and will remain open even when a user presses the 'Esc' key to close all open windows. A GM can configure a console to be anchored by default or not. An anchored window can still be closed by clicking on the anchor icon in the top right and then clicking the close button.
### Archiving
Any console can be archived by a GM by selecting the archive option in the right-click drop down menu. This action is irreversible and will prompt you to confirm. On confirmation, the console is turned into a page in the _console-data journal entry. After which, the console is deleted from the manager.

As of yet there is no way to un-archive a console.
### Commands
The input box of the console app accepts a list of commands that trigger app functions rather than send messages. These are mostly for GM use, but players do have access to a few commands.

To use a command type one of the following command names prepended by a forward slash. E.g. `/invite player 1`
#### Command List
- `/alias <actor name>`: Changes which character you are represented by in the app (and the rest of game). Player & GM.
- `/bg <color hex code`: Change the console background color. GM only
- `/clear`: Deletes all messasges. GM only.
- `/close` or `/exit`: Closes the app window. Player & GM.
- `/description <string>` or `/desc <string>`: Change the description of the console. GM only.
- `/duplicate`: Makes a copy of this console. GM only.
- `/edit`: Open the config window for this console. GM only.
- `/fg <color hex code`: Change the console foreground color. GM only
- `/gmInfo <string>` or `/gm <string>`: Change the gmInfo of the console. GM only.
- `/incognito`: Unselects the character representing you. For GM's the app will show your messages without a name, for players, your message show your player name. Player & GM.
- `/invite <player name>`: Add a player to this list of owners for this console. GM only.
- `/kick <player name>`: Remove a player from the list of owner for this console. GM only.
- `/lock`: Toggle the lock state of this console. GM only.
- `/mute`: Toggle the mute state of this console. GM only.
- `/notifications`: or `notif`:Toggle enable/disable a console to send notifications when a new message is sent. GM only.
- `/name <string>`: Set the name of this console. GM only.
- `/share`: Share the app with players, making the app window render on their screens. GM only.
- `/show`: Toggle the consosle visibility to players with ownership. GM only.
- `/title <string>`: Set the title of this console. GM only.
- `/timelog <string>`: Adds a timestamp directly into chat with a message, even if the consoles timestamps are disabled. GM only **requires SimpleCalendar**
- `/timestamps`: or `/time`: Toggle whether timestamps are recorded and shown for this console. GM only. **requires SimpleCalendar**
### _console-data
This journal entry is what stores all of the data for this module. The module fetches this journal entry by name. As such, this journal entry should not be renamed lest you lose access to all of your consoles data. Further, any archived consoles appear as pages within this journal entry. Feel free to move it into folders or duplicate it for a backup.
### Console visibility to players
Whether or not a console is shown to players is controlled by the GM using two different variables; visibility and ownership. Players only see consoles in their console manager that are both visible and that they have ownership over. Which players have ownership over a console can be configured in the console config window and visibility can be toggled from the console drop down menu.

As a GM you can bypass these restrictions to show a console to players even if it is neither visible nor owned by players. In the consoles top header click the eye icon to show to players. From here you can choose to show it just to players who have ownership or to all players. Further, console windows rendered through macros can be shown to players regardless of its visibility or ownership.
### Macro support
The `ConsoleApp` and `ConsoleData` classes are globally exposed and should be all you need if you want to integrate consoles into macros. Works wonderfully to show consoles to players in certain map spaces using [monks-active-tiles](https://github.com/ironmonk88/monks-active-tiles).
### Message word/character limits
You can configure a console to cut off messages after a certain amount of words/characters. You choose whether to cut off based on words or based on characters and you choose just how many. Further, you can choose a 'marker', a string of characters that get added to the end of a message that is cut off by the limit to alert you to the fact the message has been cut off.

No more counting out your words for the *Sending* spell in DnD5e.

### Timestamps
Integrates with [SimpleCalendar](https://github.com/vigoren/foundryvtt-simple-calendar) to get date and time information that can be automatically added to send messages. Module settings menu allows a few different choices for date/time formats in chat timestamps.

## UI 
![ui](https://raw.githubusercontent.com/TaureHorn/FoundryVTT_ChatConsole/main/ui.png)

1. Open the console manager window
2. The console manager window. Displays all consoles to a GM. For players it shows all visible consoles for which the player has ownership.
3. A console. Left click to open. GM's can right click to open the options drop down list.
4. Symbols to certain options for a console at a quick glance. Shows console type (messenger or terminal), lock status and visibility to players (GM only)
5. Messenger style console window.
6. Form to configure a specific console.
7. _console data journal entry. Archived consoles appear in their own journal entry page here.
8. Terminal style console window.

Messages within a console can be copied to the OS clipboard with a left-click or deleted with a right click. Players can only delete their own messages, GMs can delete all messages.

## Potential Planned Improvements
- ~~Add ability to set default configuration for all consoles variables [name, title, bgImg, type, limits...]~~
- Module instructions / readme in the auto generated '_consoleData' journal entry.
- ~~Add message timestamps >> integration with SimpleCalendar and SmallTime?~~
- ~~New message notifications?~~
- Refactor module so parts of it feel less like a hot mess and the code is easier for users to understand and build macros for.
- Port the v12's 'Application_v2' thingy?

## Sources
Message notifcation sound: freesound.org - deadrobotmusic
https://freesound.org/people/deadrobotmusic/sounds/750607/
