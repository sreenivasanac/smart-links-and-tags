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
class HoverButton {
	private readonly button: HTMLElement;
	private target: HTMLElement | null = null;
	private hideTimer = 0;

	constructor(
		plugin: Plugin,
		private readonly opts: HoverButtonOptions,
	) {
		this.button = createDiv({ cls: ['slt-hover-button', opts.cls], attr: { 'aria-label': opts.label, role: 'button' } });
		setIcon(this.button, opts.icon);
		this.button.hide();
		plugin.register(() => this.button.remove());

		// Keep the editor focused when the button is pressed.
		this.button.addEventListener('mousedown', (evt) => evt.preventDefault());
		this.button.addEventListener('click', this.onClick);

		// The main window, pop-outs that are already open, and pop-outs opened later.
		const listenTo = (doc: Document): void => plugin.registerDomEvent(doc, 'mouseover', this.onMouseOver);
		const openDocs = new Set<Document>([document]);
		plugin.app.workspace.iterateAllLeaves((leaf) => {
			openDocs.add(leaf.view.containerEl.doc);
		});
		openDocs.forEach(listenTo);
		plugin.registerEvent(plugin.app.workspace.on('window-open', (win) => listenTo(win.doc)));
	}

	private show(hit: HTMLElement): void {
		window.clearTimeout(this.hideTimer);
		this.target = hit;
		// Move the button into the hovered element's window if needed.
		if (this.button.parentElement !== hit.doc.body) hit.doc.body.appendChild(this.button);
		const rect = (this.opts.anchor?.(hit) ?? hit).getBoundingClientRect();
		this.button.setCssStyles({ left: `${rect.right + 2}px`, top: `${rect.top + rect.height / 2}px` });
		this.button.show();
	}

	private readonly hide = (): void => {
		this.button.hide();
		this.target = null;
	};

	private readonly onMouseOver = (evt: MouseEvent): void => {
		// instanceOf (not instanceof) also matches elements of pop-out windows.
		const el = evt.targetNode?.instanceOf(HTMLElement) ? evt.targetNode : null;
		if (el && this.button.contains(el)) {
			window.clearTimeout(this.hideTimer);
			return;
		}
		const hit = this.opts.enabled() ? el?.closest<HTMLElement>(this.opts.selector) : null;
		if (hit) {
			this.show(hit);
		} else if (this.target) {
			window.clearTimeout(this.hideTimer);
			this.hideTimer = window.setTimeout(this.hide, HIDE_DELAY_MS);
		}
	};

	private readonly onClick = (): void => {
		const clicked = this.target;
		this.hide();
		if (clicked) this.opts.onClick(clicked);
	};
}

export function addHoverButton(plugin: Plugin, opts: HoverButtonOptions): void {
	new HoverButton(plugin, opts);
}
