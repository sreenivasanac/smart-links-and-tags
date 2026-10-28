import { App, Editor, Modal, Notice, Setting } from 'obsidian';

export interface LinkHit {
	/** Column range of the whole `[text](url)` on its line. */
	start: number;
	end: number;
	text: string;
	url: string;
}

/** Link destination: any characters, allowing one level of balanced parentheses as CommonMark does. */
export const LINK_URL = String.raw`(?:[^()\n]|\([^()\n]*\))*`;
const MARKDOWN_LINK = new RegExp(String.raw`\[([^\]\n]*)\]\((${LINK_URL})\)`, 'g');

/** The markdown link `[text](url)` that covers column `ch` of `line`, if any. */
export function linkAt(line: string, ch: number): LinkHit | null {
	for (const m of line.matchAll(MARKDOWN_LINK)) {
		const start = m.index;
		const end = start + m[0].length;
		if (ch >= start && ch <= end) return { start, end, text: m[1] ?? '', url: m[2] ?? '' };
	}
	return null;
}

type LinkAction = { action: 'save'; text: string; url: string } | { action: 'unlink' };

class LinkModal extends Modal {
	private text: string;
	private url: string;

	constructor(
		app: App,
		private readonly existing: LinkHit | null,
		initialText: string,
		private readonly onDone: (result: LinkAction) => void,
	) {
		super(app);
		this.text = initialText;
		this.url = existing?.url ?? '';
	}

	onOpen(): void {
		this.setTitle(this.existing ? 'Edit link' : 'Add link');
		this.addField('Text', 'Link text', this.text, (v) => (this.text = v)).setDesc(
			'Leave empty for a pill link, if you use a pill-rendering plugin.',
		);
		this.addField('URL', 'Paste or type a URL', this.url, (v) => (this.url = v), true);
		this.addButtons();
	}

	/** A labelled text input; Enter submits the dialog. */
	private addField(name: string, placeholder: string, value: string, onChange: (v: string) => void, focus = false): Setting {
		return new Setting(this.contentEl).setName(name).addText((input) => {
			input.setPlaceholder(placeholder).setValue(value).onChange(onChange);
			input.inputEl.addClass('slt-modal-input');
			input.inputEl.addEventListener('keydown', (evt) => {
				if (evt.key !== 'Enter') return;
				evt.preventDefault();
				this.submit();
			});
			if (focus) window.setTimeout(() => input.inputEl.focus(), 0);
		});
	}

	private addButtons(): void {
		const buttons = new Setting(this.contentEl);
		buttons.addButton((b) => b.setButtonText(this.existing ? 'Update' : 'Add link').setCta().onClick(() => this.submit()));
		if (this.existing) {
			buttons.addButton((b) => b.setButtonText('Remove link').setDestructive().onClick(() => this.finish({ action: 'unlink' })));
		}
		buttons.addButton((b) => b.setButtonText('Cancel').onClick(() => this.close()));
	}

	private submit(): void {
		const url = this.url.trim();
		if (url) this.finish({ action: 'save', text: this.text.trim(), url });
	}

	private finish(result: LinkAction): void {
		this.close();
		this.onDone(result);
	}

	onClose(): void {
		this.contentEl.empty();
	}
}

/**
 * Opens the link editor for the link at `line`/`hit`, or (with no hit) for
 * turning `selection` into a new link, and applies the result to the editor.
 */
export function openLinkEditor(app: App, editor: Editor, line: number, hit: LinkHit | null, selection = ''): void {
	const from = hit ? { line, ch: hit.start } : editor.getCursor('from');
	const to = hit ? { line, ch: hit.end } : editor.getCursor('to');
	const original = editor.getRange(from, to);
	new LinkModal(app, hit, hit ? hit.text : selection, (result) => {
		// The note may have changed while the dialog was open (typing, sync).
		if (editor.getRange(from, to) !== original) {
			new Notice('The link changed while the dialog was open. Nothing was replaced.');
			return;
		}
		if (result.action === 'unlink') {
			editor.replaceRange(hit?.text ?? '', from, to);
		} else {
			editor.replaceRange(`[${result.text}](${result.url})`, from, to);
		}
	}).open();
}
