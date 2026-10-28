import { App, PluginSettingTab, Setting } from 'obsidian';
import type SmartLinksAndTagsPlugin from './main';

export interface SmartLinksSettings {
	pasteMenu: boolean;
	pasteAsPill: boolean;
	atomicLinks: boolean;
	linkEditButton: boolean;
	mentions: boolean;
	tagPicker: boolean;
	tagRemoveButton: boolean;
}

export const DEFAULT_SETTINGS: SmartLinksSettings = {
	pasteMenu: true,
	pasteAsPill: false,
	atomicLinks: true,
	linkEditButton: true,
	mentions: true,
	tagPicker: true,
	tagRemoveButton: true,
};

type ToggleKey = keyof SmartLinksSettings;

export class SmartLinksSettingTab extends PluginSettingTab {
	constructor(
		app: App,
		private readonly plugin: SmartLinksAndTagsPlugin,
	) {
		super(app, plugin);
	}

	display(): void {
		const { containerEl } = this;
		containerEl.empty();

		new Setting(containerEl).setName('Links').setHeading();
		this.toggle('pasteMenu', 'Ask how to paste links', 'When you paste a URL, choose between a titled link, a plain URL or a pill.');
		this.toggle(
			'pasteAsPill',
			'Offer "paste as pill"',
			'Inserts an empty-text link [](url), which the Link Mention plugin renders as an icon and title pill. Requires Link Mention.',
		);
		this.toggle(
			'atomicLinks',
			'Treat external links as one unit',
			'The cursor moves over a link in one step instead of entering its markdown. Edit links with the edit button or the "Add or edit link" command.',
		);
		this.toggle('linkEditButton', 'Show edit button on links', 'Hovering an external link shows a button that opens the link editor.');

		new Setting(containerEl).setName('Mentions').setHeading();
		this.toggle('mentions', 'Link notes with @', 'Type @ to pick a recent note, or keep typing to search all notes.');

		new Setting(containerEl).setName('Tags').setHeading();
		this.toggle('tagPicker', 'Tag picker', 'Type # to choose from existing tags, sorted by how often they are used, or create a new one.');
		this.toggle('tagRemoveButton', 'Show remove button on tags', 'Hovering a tag shows a button that removes the tag.');
	}

	private toggle(key: ToggleKey, name: string, desc: string): void {
		new Setting(this.containerEl)
			.setName(name)
			.setDesc(desc)
			.addToggle((toggle) =>
				toggle.setValue(this.plugin.settings[key]).onChange(async (value) => {
					this.plugin.settings[key] = value;
					await this.plugin.saveSettings();
				}),
			);
	}
}
