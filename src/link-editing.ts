import { Decoration, EditorView } from '@codemirror/view';
import { RangeSetBuilder } from '@codemirror/state';
import { locateInEditor } from './editor-dom';
import { addHoverButton } from './hover-button';
import { LINK_URL, linkAt, openLinkEditor } from './links';
import type SmartLinksAndTagsPlugin from './main';

const EXTERNAL_LINK = new RegExp(String.raw`\[[^\]\n]*\]\(https?:${LINK_URL}\)`, 'g');
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
	const hit = locateInEditor(plugin.app, el);
	if (!hit) return;
	const line = hit.cm.state.doc.lineAt(hit.pos);
	const link = linkAt(line.text, hit.pos - line.from);
	if (link) openLinkEditor(plugin.app, hit.view.editor, line.number - 1, link);
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
