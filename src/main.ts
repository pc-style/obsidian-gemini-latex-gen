import { Editor, MarkdownView, Notice, Plugin } from 'obsidian';
import { GeminiLatexSettings, DEFAULT_SETTINGS, GeminiLatexSettingTab } from './settings';
import { GoogleGenAI } from '@google/genai';

export default class GeminiLatexPlugin extends Plugin {
	settings: GeminiLatexSettings;

	async onload() {
		await this.loadSettings();

		this.addCommand({
			id: 'gemini-latex-convert',
			name: 'Convert selection to LaTeX',
			editorCallback: async (editor: Editor, view: MarkdownView) => {
				const selection = editor.getSelection();

				if (!selection) {
					new Notice('Please select some text to convert.');
					return;
				}

				if (!this.settings.apiKey) {
					new Notice('Please set your Gemini API Key in the settings.');
					return;
				}

				try {
					new Notice('Generating LaTeX...');

					const genAI = new GoogleGenAI({ apiKey: this.settings.apiKey });
					// We use the setting value which defaults to 'gemini-3-flash-preview'.
					// If the user manually set a different model in settings, we respect that.

					const prompt = `Convert the following natural language text into a LaTeX equation or expression. 
					Return ONLY the LaTeX code, nothing else. Do not wrap in markdown code blocks unless strictly necessary for display, but prefer raw LaTeX. 
					If it's an equation, include the enclosing $ or $$ signs if appropriate, but usually just the math content is best so it can be inline.
					Actually, let's output it as standard LaTeX math mode content. 
					Example Input: "area of circle"
					Example Output: A = \pi r^2
					
					Text to convert:
					"${selection}"`;

					const response = await genAI.models.generateContent({
						model: this.settings.modelName,
						contents: prompt
					});

					const latex = response.text ? response.text.trim() : '';

					// Clean up potential markdown code blocks if the model adds them
					const cleanLatex = latex.replace(/^```latex\n/, '').replace(/^```\n/, '').replace(/\n```$/, '');

					if (cleanLatex) {
						editor.replaceSelection(cleanLatex);
						new Notice('Converted to LaTeX!');
					} else {
						new Notice('Failed to generate LaTeX content.');
					}
				} catch (error) {
					console.error('Gemini LaTeX Error:', error);
					new Notice('Error converting to LaTeX. Check console for details.');
				}
			}
		});

		this.addSettingTab(new GeminiLatexSettingTab(this.app, this));
	}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}
}
