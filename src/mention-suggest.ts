import { Editor, EditorPosition, EditorSuggest, EditorSuggestContext, EditorSuggestTriggerInfo, TFile } from 'obsidian';
import type SmartLinksAndTagsPlugin from './main';

const MAX_RESULTS = 10;
const RECENT_COUNT = 8;
// "@" at the start of a line or after whitespace (so email addresses don't trigger it).
const TRIGGER = /(?:^|\s)@([^\s@]*)$/;

/** Type "@" to link a note: recent notes first, then any note matching the query. */
export class MentionSuggest extends EditorSuggest<TFile> {
	constructor(private readonly plugin: SmartLinksAndTagsPlugin) {
		super(plugin.app);
	}

	onTrigger(cursor: EditorPosition, editor: Editor): EditorSuggestTriggerInfo | null {
		if (!this.plugin.settings.mentions) return null;
		const match = editor.getLine(cursor.line).slice(0, cursor.ch).match(TRIGGER);
		if (!match) return null;
		const query = match[1] ?? '';
		return { start: { line: cursor.line, ch: cursor.ch - query.length - 1 }, end: cursor, query };
	}

	getSuggestions(context: EditorSuggestContext): TFile[] {
		const query = context.query.toLowerCase();
		if (!query) {
			return this.app.workspace
				.getLastOpenFiles()
				.map((path) => this.app.vault.getFileByPath(path))
				.filter((file): file is TFile => file?.extension === 'md')
				.slice(0, RECENT_COUNT);
		}
		// Name prefix matches first, then name substring, then folder path matches.
		const ranked: { file: TFile; score: number }[] = [];
		for (const file of this.app.vault.getMarkdownFiles()) {
			const name = file.basename.toLowerCase();
			const at = name.indexOf(query);
			if (at >= 0) ranked.push({ file, score: (at === 0 ? 0 : 1) + name.length / 1000 });
			else if (file.path.toLowerCase().includes(query)) ranked.push({ file, score: 2 });
		}
		return ranked
			.sort((a, b) => a.score - b.score)
			.slice(0, MAX_RESULTS)
			.map((r) => r.file);
	}

	renderSuggestion(file: TFile, el: HTMLElement): void {
		el.createDiv({ text: file.basename });
		const folder = file.parent && !file.parent.isRoot() ? file.parent.path : '';
		if (folder) el.createDiv({ text: folder, cls: 'slt-suggest-note' });
	}

	selectSuggestion(file: TFile): void {
		const context = this.context;
		if (!context) return;
		// Respects the user's link format settings (wikilink or markdown, path style).
		const link = this.app.fileManager.generateMarkdownLink(file, context.file.path);
		context.editor.replaceRange(`${link} `, context.start, context.end);
	}
}
