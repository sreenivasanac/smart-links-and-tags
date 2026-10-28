# Smart Links and Tags

Notion-style editing for links, note mentions and tags in Obsidian. Every feature can be turned on or off in the settings.

## Features

### Choose how to paste a URL

Paste a URL and a small menu asks how to insert it:

![Pasting a URL shows a menu; Enter inserts a link titled with the page title](https://raw.githubusercontent.com/sreenivasanac/smart-links-and-tags/main/docs/paste-demo.gif)

- **Paste as titled link:** fetches the page title and inserts `[Page title](url)`.
- **Paste as plain URL.**
- **Paste as pill (icon and title):** optional. It inserts an empty-text link `[](url)`, which the [Link Mention](https://github.com/robcc/obsidian-link-mention-plugin) plugin renders as a favicon-and-title pill.

The first option is preselected, so <kbd>Enter</kbd> right after pasting picks it. Arrow keys switch options, <kbd>Esc</kbd> pastes nothing, and if you keep typing the menu closes. Pasting inside code blocks, or over selected text, works as usual.

### Edit links without touching markdown

- Hover any external link to show an edit button (⋯). It opens a dialog with the link's text and URL, plus **Remove link**.
- The **Add or edit link** command does the same at the cursor, or turns selected text into a link. You can assign it a hotkey or add it to a toolbar.

![Edit button next to a hovered link](https://raw.githubusercontent.com/sreenivasanac/smart-links-and-tags/main/docs/edit-button.png)

![Edit link dialog with Text, URL, Update, Remove link and Cancel](https://raw.githubusercontent.com/sreenivasanac/smart-links-and-tags/main/docs/link-editor.png)

- Optionally, the cursor treats each `[text](url)` as a single unit: it steps over the link instead of into its markdown.

### Link notes with @

Type `@` to choose from your recently opened notes. Keep typing to search all notes: name matches come first, then folder path matches. The inserted link follows your **Files and links** settings (wikilink or markdown). An `@` inside a word, as in an email address, doesn't open the list.

![Typing @gar suggests the note Garden redesign](https://raw.githubusercontent.com/sreenivasanac/smart-links-and-tags/main/docs/mention.png)

### Tag picker

Type `#` to see your tags sorted by how often you use them, with their counts. Keep typing to filter, or pick **Create #…** to add a new tag. Nested tags (`#area/topic`) and non-English letters are supported.

![Typing # lists existing tags with usage counts](https://raw.githubusercontent.com/sreenivasanac/smart-links-and-tags/main/docs/tag-picker.png)

A `#` at the start of a line normally makes it look like an empty large heading while you type. This plugin keeps that line at normal size.

### Remove tags with one click

Hover a tag to show a remove button (×). It deletes the tag and the space next to it.

![Remove button next to a hovered tag](https://raw.githubusercontent.com/sreenivasanac/smart-links-and-tags/main/docs/tag-remove.png)

## Requirements

Obsidian 1.13 or later. Works on desktop and mobile; the hover buttons need a mouse or trackpad.

## Settings

| Setting | Default |
| --- | --- |
| Ask how to paste links | On |
| Offer "paste as pill" | Off (needs Link Mention) |
| Treat external links as one unit | On |
| Show edit button on links | On |
| Link notes with @ | On |
| Tag picker | On |
| Show remove button on tags | On |

## Installation

Once the plugin is approved, install it from **Settings → Community plugins → Browse** and search for "Smart Links and Tags".

To install it manually, copy `main.js`, `manifest.json` and `styles.css` from the [latest release](https://github.com/sreenivasanac/smart-links-and-tags/releases/latest) into `<your vault>/.obsidian/plugins/smart-links-and-tags/`, then enable the plugin.

## Development

```bash
npm install
npm run dev    # rebuilds main.js on every change
npm run build  # type-check and production build
npm run lint
```

## License

[MIT](LICENSE)
