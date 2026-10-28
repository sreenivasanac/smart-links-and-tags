import { Editor, requestUrl, setIcon } from 'obsidian';

interface PasteOption {
	title: string;
	icon: string;
	run(): void;
}

/** Inserts text, then refocuses the editor (the menu took focus). */
function insert(editor: Editor, text: string): void {
	editor.replaceSelection(text);
	window.requestAnimationFrame(() => editor.focus());
}

/** Fetches the page title; returns '' when the page can't be read. */
async function fetchTitle(url: string): Promise<string> {
	try {
		const res = await requestUrl({ url, throw: false });
		// DOMParser decodes entities such as &amp; in the title.
		const title = new DOMParser().parseFromString(res.text, 'text/html').title;
		return title.replace(/\s+/g, ' ').trim().slice(0, 200);
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
	const text = editor.getLine(line);
	const at = text.indexOf(placeholder);
	if (at < 0) return; // the user already changed it
	const safeTitle = (title || url).replace(/[[\]]/g, '');
	editor.replaceRange(`[${safeTitle}](${url})`, { line, ch: at }, { line, ch: at + placeholder.length });
}

/**
 * Menu at the cursor for choosing how a pasted URL is inserted. It is built
 * from Obsidian's own `.menu` classes so it matches every theme, and the first
 * option is pre-selected so Enter right after pasting picks it. Arrow keys
 * move, Escape cancels, and typing anything else dismisses it.
 */
export function showPasteMenu(editor: Editor, url: string, offerPill: boolean): void {
	const options: PasteOption[] = [
		{ title: 'Paste as titled link', icon: 'link', run: () => void pasteTitledLink(editor, url) },
		{ title: 'Paste as plain URL', icon: 'text', run: () => insert(editor, url) },
	];
	if (offerPill) {
		options.unshift({ title: 'Paste as pill (icon and title)', icon: 'badge-check', run: () => insert(editor, `[](${url})`) });
	}

	const menuEl = document.body.createDiv({ cls: 'menu slt-paste-menu' });
	let selected = 0;
	const rows = options.map((option, i) => {
		const row = menuEl.createDiv({ cls: 'menu-item tappable' });
		setIcon(row.createDiv({ cls: 'menu-item-icon' }), option.icon);
		row.createDiv({ cls: 'menu-item-title', text: option.title });
		row.addEventListener('mouseenter', () => select(i));
		row.addEventListener('mousedown', (evt) => evt.preventDefault());
		row.addEventListener('click', () => choose(i));
		return row;
	});

	function select(i: number): void {
		selected = i;
		rows.forEach((row, j) => row.toggleClass('selected', j === i));
	}
	function close(): void {
		menuEl.remove();
		document.removeEventListener('keydown', onKeyDown, true);
		document.removeEventListener('mousedown', onMouseDown, true);
	}
	function choose(i: number): void {
		close();
		options[i]?.run();
	}
	function onKeyDown(evt: KeyboardEvent): void {
		const handled: Record<string, () => void> = {
			ArrowDown: () => select((selected + 1) % options.length),
			ArrowUp: () => select((selected + options.length - 1) % options.length),
			Enter: () => choose(selected),
			Escape: close,
		};
		const action = handled[evt.key];
		if (action) {
			evt.preventDefault();
			evt.stopPropagation();
			action();
		} else if (evt.key.length === 1 || evt.key === 'Backspace') {
			close(); // keep typing: the key goes to the editor as usual
		}
	}
	function onMouseDown(evt: MouseEvent): void {
		if (!(evt.target instanceof Node && menuEl.contains(evt.target))) close();
	}

	select(0);
	// Position under the cursor, clamped to the window.
	const cm = (editor as Editor & { cm?: { coordsAtPos(pos: number): { left: number; bottom: number } | null; state: { selection: { main: { head: number } } } } }).cm;
	const coords = cm?.coordsAtPos(cm.state.selection.main.head);
	const x = coords?.left ?? window.innerWidth / 2;
	const y = coords ? coords.bottom + 4 : window.innerHeight / 3;
	menuEl.setCssStyles({ left: `${x}px`, top: `${y}px` });
	const rect = menuEl.getBoundingClientRect();
	if (rect.right > window.innerWidth - 8) menuEl.setCssStyles({ left: `${Math.max(8, window.innerWidth - rect.width - 8)}px` });
	if (rect.bottom > window.innerHeight - 8) menuEl.setCssStyles({ top: `${Math.max(8, y - rect.height - 28)}px` });

	document.addEventListener('keydown', onKeyDown, true);
	document.addEventListener('mousedown', onMouseDown, true);
}
