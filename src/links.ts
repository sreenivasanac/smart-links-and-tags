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
		const { contentEl } = this;
		this.setTitle(this.existing ? 'Edit link' : 'Add link');
		const submit = (): void => {
			const url = this.url.trim();
			if (!url) return;
			this.close();
			this.onDone({ action: 'save', text: this.text.trim(), url });
		};
		const onEnter = (evt: KeyboardEvent): void => {
			if (evt.key === 'Enter') {
				evt.preventDefault();
				submit();
			}
		};

		new Setting(contentEl)
			.setName('Text')
			.setDesc('Leave empty for a pill link, if you use a pill-rendering plugin.')
			.addText((input) => {
				input.setPlaceholder('Link text').setValue(this.text).onChange((v) => (this.text = v));
				input.inputEl.addClass('slt-modal-input');
				input.inputEl.addEventListener('keydown', onEnter);
			});
		new Setting(contentEl).setName('URL').addText((input) => {
			input.setPlaceholder('Paste or type a URL').setValue(this.url).onChange((v) => (this.url = v));
			input.inputEl.addClass('slt-modal-input');
			input.inputEl.addEventListener('keydown', onEnter);
			window.setTimeout(() => input.inputEl.focus(), 0);
		});

		const buttons = new Setting(contentEl);
		buttons.addButton((b) => b.setButtonText(this.existing ? 'Update' : 'Add link').setCta().onClick(submit));
		if (this.existing) {
			buttons.addButton((b) =>
				b
					.setButtonText('Remove link')
					.setDestructive()
					.onClick(() => {
						this.close();
						this.onDone({ action: 'unlink' });
					}),
			);
		}
		buttons.addButton((b) => b.setButtonText('Cancel').onClick(() => this.close()));
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
