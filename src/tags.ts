import { Editor, EditorPosition, EditorSuggest, EditorSuggestContext, EditorSuggestTriggerInfo, MarkdownView } from 'obsidian';
import type { EditorView } from '@codemirror/view';
import { addHoverButton } from './hover-button';
import type SmartLinksAndTagsPlugin from './main';

const MAX_RESULTS = 10;
// Characters Obsidian allows in a tag: letters, numbers, _, - and / (nesting).
const TAG_CHARS = '[\\p{L}\\p{N}_/-]';
const TRIGGER = new RegExp(`(?:^|\\s)#(${TAG_CHARS}*)$`, 'u');
const TAG_IN_LINE = new RegExp(`#${TAG_CHARS}+`, 'gu');

interface TagOption {
	tag: string;
	count: number;
	create?: boolean;
}

/**
 * Type "#" to pick a tag: existing tags sorted by usage with their counts,
 * filtered as you type, plus a "Create #…" entry for new tags.
 */
export class TagSuggest extends EditorSuggest<TagOption> {
	constructor(private readonly plugin: SmartLinksAndTagsPlugin) {
		super(plugin.app);
	}

	onTrigger(cursor: EditorPosition, editor: Editor): EditorSuggestTriggerInfo | null {
		if (!this.plugin.settings.tagPicker) return null;
		const match = editor.getLine(cursor.line).slice(0, cursor.ch).match(TRIGGER);
		if (!match) return null;
		const query = match[1] ?? '';
		return { start: { line: cursor.line, ch: cursor.ch - query.length - 1 }, end: cursor, query };
	}

	getSuggestions(context: EditorSuggestContext): TagOption[] {
		const query = context.query.toLowerCase();
		const counts = (this.app.metadataCache as unknown as { getTags(): Record<string, number> }).getTags();
		const options: TagOption[] = Object.entries(counts)
			.map(([tag, count]) => ({ tag: tag.slice(1), count }))
			.filter((t) => t.tag.toLowerCase().includes(query))
			.sort((a, b) => b.count - a.count)
			.slice(0, MAX_RESULTS);
		// Obsidian doesn't treat all-number tags as tags, so don't offer creating one.
		const exists = options.some((t) => t.tag.toLowerCase() === query);
		if (context.query && !exists && !/^\d+$/.test(context.query)) {
			options.push({ tag: context.query, count: 0, create: true });
		}
		return options;
	}

	renderSuggestion(option: TagOption, el: HTMLElement): void {
		if (option.create) {
			el.createDiv({ text: `Create #${option.tag}` });
			return;
		}
		el.createDiv({ text: `#${option.tag}` });
		el.createDiv({ text: String(option.count), cls: 'slt-suggest-note' });
	}

	selectSuggestion(option: TagOption): void {
		const context = this.context;
		if (!context) return;
		context.editor.replaceRange(`#${option.tag} `, context.start, context.end);
	}
}

/** Removes the tag rendered by `el`, together with one neighbouring space. */
function removeTagAt(plugin: SmartLinksAndTagsPlugin, el: HTMLElement): void {
	const leaf = plugin.app.workspace.getLeavesOfType('markdown').find((l) => l.view.containerEl.contains(el));
	const cm = leaf?.view instanceof MarkdownView ? (leaf.view.editor as { cm?: EditorView }).cm : undefined;
	if (!cm) return;
	let pos: number;
	try {
		pos = cm.posAtDOM(el);
	} catch {
		return;
	}
	const line = cm.state.doc.lineAt(pos);
	for (const m of line.text.matchAll(TAG_IN_LINE)) {
		let from = line.from + m.index;
		let to = from + m[0].length;
		if (pos < from || pos > to) continue;
		if (line.text[to - line.from] === ' ') to++;
		else if (from > line.from && line.text[from - line.from - 1] === ' ') from--;
		cm.dispatch({ changes: { from, to } });
		return;
	}
}

export function registerTagRemoveButton(plugin: SmartLinksAndTagsPlugin): void {
	addHoverButton(plugin, {
		selector: '.markdown-source-view .cm-hashtag',
		icon: 'x',
		label: 'Remove tag',
		cls: 'slt-tag-remove',
		enabled: () => plugin.settings.tagRemoveButton,
		// A tag renders as several spans ("#" + name); sit next to the last one.
		anchor: (el) => {
			let end = el;
			while (end.nextElementSibling instanceof HTMLElement && end.nextElementSibling.hasClass('cm-hashtag')) {
				end = end.nextElementSibling;
			}
			return end;
		},
		onClick: (el) => removeTagAt(plugin, el),
	});
}
