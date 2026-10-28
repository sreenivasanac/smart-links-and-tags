import { MarkdownView } from 'obsidian';
import { Decoration, EditorView } from '@codemirror/view';
import { RangeSetBuilder } from '@codemirror/state';
import { addHoverButton } from './hover-button';
import { linkAt, openLinkEditor } from './links';
import type SmartLinksAndTagsPlugin from './main';

const EXTERNAL_LINK = /\[[^\]\n]*\]\(https?:[^)\n]*\)/g;
const ATOMIC = Decoration.mark({});

/**
 * Makes every external markdown link an atomic range: the cursor steps over
 * `[text](url)` in one move and can't land inside its markdown, so links are
 * edited through the link editor instead of by hand.
 */
function atomicLinks(plugin: SmartLinksAndTagsPlugin) {
	return EditorView.atomicRanges.of((view) => {
		const builder = new RangeSetBuilder<Decoration>();
		if (!plugin.settings.atomicLinks) return builder.finish();
		for (const { from, to } of view.visibleRanges) {
			const text = view.state.doc.sliceString(from, to);
			for (const m of text.matchAll(EXTERNAL_LINK)) {
				builder.add(from + m.index, from + m.index + m[0].length, ATOMIC);
			}
		}
		return builder.finish();
	});
}

/** Opens the link editor for the link rendered by `el`. */
function editLinkAt(plugin: SmartLinksAndTagsPlugin, el: HTMLElement): void {
	const view = plugin.app.workspace.getActiveViewOfType(MarkdownView);
	const cm = (view?.editor as { cm?: EditorView } | undefined)?.cm;
	if (!view || !cm) return;
	let pos: number;
	try {
		pos = cm.posAtDOM(el);
	} catch {
		return;
	}
	const line = cm.state.doc.lineAt(pos);
	const hit = linkAt(line.text, pos - line.from);
	if (hit) openLinkEditor(plugin.app, view.editor, line.number - 1, hit);
}

export function registerLinkEditing(plugin: SmartLinksAndTagsPlugin): void {
	plugin.registerEditorExtension(atomicLinks(plugin));
	addHoverButton(plugin, {
		selector: '.markdown-source-view .cm-link, .markdown-source-view .cm-url, .markdown-source-view .link-mention',
		icon: 'more-horizontal',
		label: 'Edit link',
		cls: 'slt-link-edit',
		enabled: () => plugin.settings.linkEditButton,
		onClick: (el) => editLinkAt(plugin, el),
	});
}
