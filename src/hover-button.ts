import { Plugin, setIcon } from 'obsidian';

export interface HoverButtonOptions {
	/** Elements that show the button while hovered. */
	selector: string;
	icon: string;
	label: string;
	cls: string;
	enabled(): boolean;
	/** Element whose right edge the button sits next to (defaults to the hovered one). */
	anchor?(target: HTMLElement): HTMLElement;
	onClick(target: HTMLElement): void;
}

const HIDE_DELAY_MS = 250;

/**
 * A small floating button that appears at the right edge of whichever
 * element matching `selector` is hovered, and stays up briefly so the
 * pointer can travel onto it. Works in the main window and pop-out windows.
 */
export function addHoverButton(plugin: Plugin, opts: HoverButtonOptions): void {
	const button = createDiv({ cls: ['slt-hover-button', opts.cls], attr: { 'aria-label': opts.label, role: 'button' } });
	setIcon(button, opts.icon);
	button.hide();
	plugin.register(() => button.remove());

	let target: HTMLElement | null = null;
	let hideTimer = 0;
	const hide = (): void => {
		button.hide();
		target = null;
	};

	const show = (hit: HTMLElement): void => {
		window.clearTimeout(hideTimer);
		target = hit;
		// Move the button into the hovered element's window if needed.
		if (button.parentElement !== hit.doc.body) hit.doc.body.appendChild(button);
		const rect = (opts.anchor?.(hit) ?? hit).getBoundingClientRect();
		button.setCssStyles({ left: `${rect.right + 2}px`, top: `${rect.top + rect.height / 2}px` });
		button.show();
	};

	const onMouseOver = (evt: MouseEvent): void => {
		// instanceOf (not instanceof) also matches elements of pop-out windows.
		const el = evt.targetNode?.instanceOf(HTMLElement) ? evt.targetNode : null;
		if (el && button.contains(el)) {
			window.clearTimeout(hideTimer);
			return;
		}
		const hit = opts.enabled() ? el?.closest<HTMLElement>(opts.selector) : null;
		if (hit) {
			show(hit);
		} else if (target) {
			window.clearTimeout(hideTimer);
			hideTimer = window.setTimeout(hide, HIDE_DELAY_MS);
		}
	};

	plugin.registerDomEvent(document, 'mouseover', onMouseOver);
	plugin.registerEvent(plugin.app.workspace.on('window-open', (win) => plugin.registerDomEvent(win.doc, 'mouseover', onMouseOver)));

	// Keep the editor focused when the button is pressed.
	button.addEventListener('mousedown', (evt) => evt.preventDefault());
	button.addEventListener('click', () => {
		const clicked = target;
		hide();
		if (clicked) opts.onClick(clicked);
	});
}
