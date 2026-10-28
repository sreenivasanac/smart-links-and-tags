import { App, Editor, MarkdownView } from 'obsidian';
import type { EditorView } from '@codemirror/view';

/** The CodeMirror view behind an Obsidian editor (not in the public typings). */
export function editorViewOf(editor: Editor): EditorView | undefined {
	return (editor as Editor & { cm?: EditorView }).cm;
}

export interface EditorHit {
	view: MarkdownView;
	cm: EditorView;
	/** Document offset of the element. */
	pos: number;
}

/**
 * Finds the markdown editor that renders `el` (in any pane or pop-out window,
 * not just the active one) and the document offset of `el` in it.
 */
export function locateInEditor(app: App, el: HTMLElement): EditorHit | null {
	const leaf = app.workspace.getLeavesOfType('markdown').find((l) => l.view.containerEl.contains(el));
	const view = leaf?.view instanceof MarkdownView ? leaf.view : null;
	const cm = view && editorViewOf(view.editor);
	if (!view || !cm) return null;
	try {
		return { view, cm, pos: cm.posAtDOM(el) };
	} catch {
		return null; // el was re-rendered away
	}
}
