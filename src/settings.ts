import { App, PluginSettingTab, Setting, Plugin } from 'obsidian';

export interface GeminiLatexSettings {
	apiKey: string;
	modelName: string;
	enableAutocomplete: boolean;
	autocompleteDelay: number;
	autocompleteModel: string;
}

export const DEFAULT_SETTINGS: GeminiLatexSettings = {
	apiKey: '',
	modelName: 'gemini-3-flash-preview',
	enableAutocomplete: true,
	autocompleteDelay: 1000,
	autocompleteModel: 'gemini-2.5-flash-lite'
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

		containerEl.createEl('h2', { text: 'General Settings' });

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
			.setName('Model Name (Command)')
			.setDesc('The Gemini model to use for the manual command (e.g., gemini-3-flash-preview)')
			.addText(text => text
				.setPlaceholder('gemini-3-flash-preview')
				.setValue(this.plugin.settings.modelName)
				.onChange(async (value) => {
					this.plugin.settings.modelName = value;
					await this.plugin.saveSettings();
				}));

		containerEl.createEl('h2', { text: 'Autocomplete Settings' });

		new Setting(containerEl)
			.setName('Enable Autocomplete')
			.setDesc('Automatically suggest LaTeX conversions while typing (Ghost Text)')
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.enableAutocomplete)
				.onChange(async (value) => {
					this.plugin.settings.enableAutocomplete = value;
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName('Autocomplete Trigger Delay (ms)')
			.setDesc('How long to wait after typing before suggesting')
			.addText(text => text
				.setPlaceholder('1000')
				.setValue(String(this.plugin.settings.autocompleteDelay))
				.onChange(async (value) => {
					this.plugin.settings.autocompleteDelay = Number(value);
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName('Autocomplete Model')
			.setDesc('Fast model for completions (e.g., gemini-2.5-flash-lite)')
			.addText(text => text
				.setPlaceholder('gemini-2.5-flash-lite')
				.setValue(this.plugin.settings.autocompleteModel)
				.onChange(async (value) => {
					this.plugin.settings.autocompleteModel = value;
					await this.plugin.saveSettings();
				}));
	}
}
