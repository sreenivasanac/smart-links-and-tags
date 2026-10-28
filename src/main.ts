import { Editor, EditorSuggest, Plugin } from 'obsidian';
import { linkAt, openLinkEditor } from './links';
import { registerLinkEditing } from './link-editing';
import { MentionSuggest } from './mention-suggest';
import { showPasteMenu } from './paste-menu';
import { DEFAULT_SETTINGS, SmartLinksSettingTab, type SmartLinksSettings } from './settings';
import { registerTagRemoveButton, TagSuggest } from './tags';

const BARE_URL = /^https?:\/\/\S+$/;

export default class SmartLinksAndTagsPlugin extends Plugin {
	settings: SmartLinksSettings = { ...DEFAULT_SETTINGS };

	async onload(): Promise<void> {
		await this.loadSettings();
		this.addSettingTab(new SmartLinksSettingTab(this.app, this));

		this.registerPasteMenu();
		this.registerLinkCommand();
		registerLinkEditing(this);
		registerTagRemoveButton(this);

		const tagSuggest = new TagSuggest(this);
		this.registerEditorSuggest(new MentionSuggest(this));
		this.registerEditorSuggest(tagSuggest);
		// Obsidian's built-in tag suggest also reacts to "#"; only the first
		// suggest that triggers is shown, so put ours ahead of it.
		this.prioritizeSuggest(tagSuggest);
	}

	async loadSettings(): Promise<void> {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, (await this.loadData()) as Partial<SmartLinksSettings>);
	}

	/** Pasting a bare URL outside code blocks asks how to insert it. */
	private registerPasteMenu(): void {
		this.registerEvent(
			this.app.workspace.on('editor-paste', (evt, editor) => {
				if (!this.settings.pasteMenu || evt.defaultPrevented) return;
				const text = evt.clipboardData?.getData('text/plain').trim() ?? '';
				if (!BARE_URL.test(text) || editor.getSelection() || this.inCodeBlock(editor)) return;
				evt.preventDefault();
				showPasteMenu(editor, text, this.settings.pasteAsPill);
			}),
		);
	}

	/** "Add or edit link": edits the link at the cursor, or links the selected text. */
	private registerLinkCommand(): void {
		this.addCommand({
			id: 'add-or-edit-link',
			name: 'Add or edit link',
			editorCheckCallback: (checking, editor) => {
				const cursor = editor.getCursor('from');
				const hit = linkAt(editor.getLine(cursor.line), cursor.ch);
				const selection = editor.getSelection();
				if (!hit && !selection) return false;
				if (!checking) openLinkEditor(this.app, editor, cursor.line, hit, selection);
				return true;
			},
		});
	}

	/** Whether the cursor is inside a fenced code block (counts the fences above it). */
	private inCodeBlock(editor: Editor): boolean {
		let fences = 0;
		const cursorLine = editor.getCursor().line;
		for (let i = 0; i < cursorLine; i++) {
			if (/^\s*(```|~~~)/.test(editor.getLine(i))) fences++;
		}
		return fences % 2 === 1;
	}

	/** Moves `suggest` to the front of the internal suggest list (not in the public typings). */
	private prioritizeSuggest(suggest: EditorSuggest<unknown>): void {
		const registry = (this.app.workspace as unknown as { editorSuggest?: { suggests?: EditorSuggest<unknown>[] } }).editorSuggest;
		const list = registry?.suggests;
		const at = list?.indexOf(suggest) ?? -1;
		if (list && at > 0) {
			list.splice(at, 1);
			list.unshift(suggest);
		}
	}
}
