# Console
***A FoundryVTT module for stylish chat and terminal windows***

Create, manage and customise floating chat windows for stylised in-game instant-messaging or computer terminals.
![example](https://raw.githubusercontent.com/TaureHorn/FoundryVTT_ChatConsole/main/screenshot.png)

## UI
![ui](https://raw.githubusercontent.com/TaureHorn/FoundryVTT_ChatConsole/main/ui.png)
This UI shows what is available to GM's. Players do no have access to nearly as much functionality and information.

1. Open the console manager window
2. Open the config window for this console
3. Toggle visibility private/public. Private consoles do not show up in players console manager windows but consoles set to public do, provided the player has ownership (set in config)
4. Toggle lock. Locked consoles cannot have their content edited. That means no-one can add or delete messages. The console can still be configured while it is locked however.
5. Duplicate a console. Copies all console data to a new copy.
6. Delete a console.
7. Console information. Contains name, GM info, description and a list of relevant scenes that you have selected as well as a few icons to quickly show a consoles style, lock and visibility states. Click anywhere in this area to open the associated console app
8. Your current user. Takes the name from whichever character the user has selected in the user configuration menu.
9. Input box. Write your plaintext here.
10. Marker for the consoles word/character input limits if configured. If no limits are set, the input box is hard-limited to 2048 characters.
11. Marker for the consoles lock state. No symbol will show for an unlocked console.
12. Marker for the consoles visibility. This symbol is only shown to GMs
13. Button to show an app to players. GM only. Opens a dialog to choose whether you want to share the app window with all players or just with players who have ownership.

Messages within a console can be copied to the OS clipboard with a left-click or deleted with a right click. Players can only delete their own messages, GMs can delete all messages.
