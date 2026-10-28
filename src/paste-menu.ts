import { Editor, requestUrl, setIcon } from 'obsidian';
import { editorViewOf } from './editor-dom';

interface PasteOption {
	title: string;
	icon: string;
	run(): void;
}

const MAX_TITLE_LENGTH = 200;
const SCREEN_MARGIN = 8;

/** Inserts text, then refocuses the editor (the menu took focus). */
function insert(editor: Editor, text: string): void {
	editor.replaceSelection(text);
	window.requestAnimationFrame(() => editor.focus());
}

/** Fetches the page title; returns '' when the page can't be read. */
async function fetchTitle(url: string): Promise<string> {
	try {
		const res = await requestUrl({ url, throw: false });
		if (res.status >= 400) return '';
		// DOMParser decodes entities such as &amp; in the title.
		const title = new DOMParser().parseFromString(res.text, 'text/html').title;
		return title.replace(/\s+/g, ' ').trim().slice(0, MAX_TITLE_LENGTH);
	} catch {
		return '';
	}
}

/** Inserts a placeholder link right away, then swaps in the page title. */
async function pasteTitledLink(editor: Editor, url: string): Promise<void> {
	const line = editor.getCursor().line;
	const placeholder = `[…](${url})`;
	insert(editor, placeholder);
	const title = await fetchTitle(url);
	const at = editor.getLine(line).indexOf(placeholder);
	if (at < 0) return; // the user already changed it
	const safeTitle = (title || url).replace(/[[\]]/g, '');
	editor.replaceRange(`[${safeTitle}](${url})`, { line, ch: at }, { line, ch: at + placeholder.length });
}

function pasteOptions(editor: Editor, url: string, offerPill: boolean): PasteOption[] {
	const options: PasteOption[] = [
		{ title: 'Paste as titled link', icon: 'link', run: () => void pasteTitledLink(editor, url) },
		{ title: 'Paste as plain URL', icon: 'text', run: () => insert(editor, url) },
	];
	if (offerPill) {
		options.unshift({ title: 'Paste as pill (icon and title)', icon: 'badge-check', run: () => insert(editor, `[](${url})`) });
	}
	return options;
}

/**
 * Menu at the cursor for choosing how a pasted URL is inserted. It is built
 * from Obsidian's own `.menu` classes so it matches every theme, and the first
 * option is pre-selected so Enter right after pasting picks it. Arrow keys
 * move, Escape cancels, and typing anything else dismisses it.
 */
class PasteMenu {
	private readonly menuEl: HTMLElement;
	private readonly rows: HTMLElement[];
	private readonly doc: Document;
	private selected = 0;

	constructor(
		private readonly editor: Editor,
		private readonly options: PasteOption[],
	) {
		const cm = editorViewOf(editor);
		this.doc = cm?.dom.doc ?? activeDocument;
		this.menuEl = this.doc.body.createDiv({ cls: 'menu slt-paste-menu' });
		this.rows = options.map((option, i) => this.addRow(option, i));
		this.select(0);
		this.position();
		this.doc.addEventListener('keydown', this.onKeyDown, true);
		this.doc.addEventListener('mousedown', this.onMouseDown, true);
	}

	private addRow(option: PasteOption, index: number): HTMLElement {
		const row = this.menuEl.createDiv({ cls: 'menu-item tappable' });
		setIcon(row.createDiv({ cls: 'menu-item-icon' }), option.icon);
		row.createDiv({ cls: 'menu-item-title', text: option.title });
		row.addEventListener('mouseenter', () => this.select(index));
		row.addEventListener('mousedown', (evt) => evt.preventDefault());
		row.addEventListener('click', () => this.choose(index));
		return row;
	}

	/** Places the menu under the cursor, flipped or shifted to stay inside the window. */
	private position(): void {
		const cm = editorViewOf(this.editor);
		const coords = cm?.coordsAtPos(cm.state.selection.main.head);
		const win = this.doc.win;
		const x = coords?.left ?? win.innerWidth / 2;
		const y = coords ? coords.bottom + 4 : win.innerHeight / 3;
		this.menuEl.setCssStyles({ left: `${x}px`, top: `${y}px` });
		const rect = this.menuEl.getBoundingClientRect();
		if (rect.right > win.innerWidth - SCREEN_MARGIN) {
			this.menuEl.setCssStyles({ left: `${Math.max(SCREEN_MARGIN, win.innerWidth - rect.width - SCREEN_MARGIN)}px` });
		}
		if (rect.bottom > win.innerHeight - SCREEN_MARGIN) {
			this.menuEl.setCssStyles({ top: `${Math.max(SCREEN_MARGIN, y - rect.height - 28)}px` });
		}
	}

	private select(index: number): void {
		this.selected = index;
		this.rows.forEach((row, i) => row.toggleClass('selected', i === index));
	}

	private choose(index: number): void {
		this.close();
		this.options[index]?.run();
	}

	private close(): void {
		this.menuEl.remove();
		this.doc.removeEventListener('keydown', this.onKeyDown, true);
		this.doc.removeEventListener('mousedown', this.onMouseDown, true);
	}

	private readonly onKeyDown = (evt: KeyboardEvent): void => {
		const count = this.options.length;
		if (evt.key === 'ArrowDown') this.select((this.selected + 1) % count);
		else if (evt.key === 'ArrowUp') this.select((this.selected + count - 1) % count);
		else if (evt.key === 'Enter') this.choose(this.selected);
		else if (evt.key === 'Escape') this.close();
		else {
			// Keep typing: the key goes to the editor as usual.
			if (evt.key.length === 1 || evt.key === 'Backspace') this.close();
			return;
		}
		evt.preventDefault();
		evt.stopPropagation();
	};

	private readonly onMouseDown = (evt: MouseEvent): void => {
		if (!evt.targetNode || !this.menuEl.contains(evt.targetNode)) this.close();
	};
}

export function showPasteMenu(editor: Editor, url: string, offerPill: boolean): void {
	new PasteMenu(editor, pasteOptions(editor, url, offerPill));
}
