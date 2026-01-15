import { Editor, MarkdownView, Notice, Plugin } from 'obsidian';
import { GeminiLatexSettings, DEFAULT_SETTINGS, GeminiLatexSettingTab } from './settings';
import { GoogleGenAI } from '@google/genai';
import { latexSuggestionExtension } from './suggestion';

export default class GeminiLatexPlugin extends Plugin {
	settings: GeminiLatexSettings;

	async onload() {
		await this.loadSettings();

		// Register Autocomplete Extension
		this.registerEditorExtension(latexSuggestionExtension(this));

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

					// Improved Prompt for Strict Wrapping
					const prompt = `Convert the following natural language text into a LaTeX equation or expression. 
					Return ONLY the LaTeX code, nothing else. 
					
					FORMATTING RULES:
					1. If the result is a complex equation or should be on its own line, wrap it in double dollar signs: $$ ... $$
					2. If it is a small inline expression, wrap it in single dollar signs: $ ... $
					3. Prefer $$ (Block Math) for any equation with an equals sign unless it's very short.
					
					Example Input: "area of circle"
					Example Output: $$ A = \pi r^2 $$
					
					Example Input: "alpha"
					Example Output: $ \alpha $

					Text to convert:
					"${selection}"`;

					const response = await genAI.models.generateContent({
						model: this.settings.modelName,
						contents: prompt
					});

					let latex = response.text ? response.text.trim() : '';

					// Clean up potential markdown code blocks if the model adds them
					latex = latex.replace(/^```latex\n/, '').replace(/^```\n/, '').replace(/\n```$/, '').trim();

					// Strict fallback wrapping if model fails to follow instructions
					if (latex && !latex.startsWith('$')) {
						// Simple heuristic: if it contains =, assume block math
						if (latex.includes('=')) {
							latex = `$$ ${latex} $$`;
						} else {
							latex = `$ ${latex} $`;
						}
					}

					if (latex) {
						editor.replaceSelection(latex);
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
