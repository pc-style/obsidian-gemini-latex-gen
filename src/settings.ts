import { App, PluginSettingTab, Setting, Plugin } from 'obsidian';

export interface GeminiLatexSettings {
	apiKey: string;
	modelName: string;
}

export const DEFAULT_SETTINGS: GeminiLatexSettings = {
	apiKey: '',
	modelName: 'gemini-3-flash-preview'
}

export class GeminiLatexSettingTab extends PluginSettingTab {
	plugin: any;

	constructor(app: App, plugin: any) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const { containerEl } = this;

		containerEl.empty();

		new Setting(containerEl)
			.setName('Gemini API Key')
			.setDesc('Enter your Google Gemini API Key')
			.addText(text => text
				.setPlaceholder('Enter your secret key')
				.setValue(this.plugin.settings.apiKey)
				.onChange(async (value) => {
					this.plugin.settings.apiKey = value;
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName('Model Name')
			.setDesc('The Gemini model to use (e.g., gemini-3-flash-preview)')
			.addText(text => text
				.setPlaceholder('gemini-3-flash-preview')
				.setValue(this.plugin.settings.modelName)
				.onChange(async (value) => {
					this.plugin.settings.modelName = value;
					await this.plugin.saveSettings();
				}));
	}
}
