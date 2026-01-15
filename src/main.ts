import { Editor, MarkdownView, Notice, Plugin, TFile } from 'obsidian';
import { GeminiLatexSettings, DEFAULT_SETTINGS, GeminiLatexSettingTab } from './settings';
import { GoogleGenAI } from '@google/genai';
import { latexSuggestionExtension } from './suggestion';
import { LaTeXSlashSuggest } from './slashCommands';
import { performOCR, fileToBase64 } from './ocr';
import { DrawingModal } from './canvasModal';

export default class GeminiLatexPlugin extends Plugin {
	settings: GeminiLatexSettings;

	async onload() {
		await this.loadSettings();

		this.registerEditorExtension(latexSuggestionExtension(this));
		this.registerEditorSuggest(new LaTeXSlashSuggest(this.app, this));

		this.addCommand({
			id: 'gemini-latex-convert',
			name: 'Convert selection to LaTeX',
			editorCallback: (editor) => this.convertSelection(editor)
		});

		this.addCommand({
			id: 'gemini-latex-draw',
			name: 'Open Drawing Canvas',
			editorCallback: (editor) => this.openDrawingCanvas(editor)
		});

		this.addSettingTab(new GeminiLatexSettingTab(this.app, this));
	}

	async convertSelection(editor: Editor) {
		const selection = editor.getSelection();
		if (!selection) {
			new Notice('No text selected');
			return;
		}
		const result = await this.callGemini(this.settings.modelName, `Convert to LaTeX: "${selection}"`);
		if (result) editor.replaceSelection(result);
	}

	async executeSlashCommand(id: string, editor: Editor) {
		switch (id) {
			case 'convert-line':
				const cursor = editor.getCursor();
				const line = editor.getLine(cursor.line);
				const result = await this.callGemini(this.settings.modelName, `Convert entire line to LaTeX: "${line}"`);
				if (result) editor.setLine(cursor.line, result);
				break;
			case 'ocr-image':
				this.handleOCR(editor);
				break;
			case 'draw-math':
				this.openDrawingCanvas(editor);
				break;
			case 'find-all':
				this.processEntireFile(editor);
				break;
			case 'explain':
				this.explainMath(editor);
				break;
		}
	}

	async handleOCR(editor: Editor) {
		new Notice('Please select an image file or paste one first. (OCR implementation requires manual file selection for now)');
	}

	async openDrawingCanvas(editor: Editor) {
		new DrawingModal(this.app, async (base64) => {
			new Notice('Processing drawing...');
			const latex = await performOCR(this.settings.apiKey, base64, "Convert this handwritten math to LaTeX. Return only the LaTeX code.");
			if (latex) {
				editor.replaceSelection(`$ ${latex.trim()} $`);
				new Notice('Inserted drawing as LaTeX!');
			}
		}).open();
	}

	async processEntireFile(editor: Editor) {
		const content = editor.getValue();
		new Notice('Reformatting entire file...');
		const result = await this.callGemini(this.settings.modelName, `Find all mathematical text in this file and convert it to strictly formatted LaTeX ($ or $$). Keep non-math text as is. File content:\n\n${content}`);
		if (result) {
			editor.setValue(result);
			new Notice('File processed!');
		}
	}

	async explainMath(editor: Editor) {
		const selection = editor.getSelection() || editor.getLine(editor.getCursor().line);
		new Notice('Explaining...');
		const explanation = await this.callGemini(this.settings.modelName, `Explain the mathematical concepts in this snippet step-by-step: "${selection}"`);
		if (explanation) {
			new Notice(explanation, 10000);
		}
	}

	async callGemini(modelName: string, prompt: string): Promise<string> {
		if (!this.settings.apiKey) {
			new Notice('Set API Key in settings');
			return '';
		}
		try {
			const ai = new GoogleGenAI({ apiKey: this.settings.apiKey });
			const fullPrompt = `${prompt}\n\nStrict Rules:\n1. Return ONLY the result.\n2. Use $$ for blocks, $ for inline.\n3. Clean, valid LaTeX.`;
			const response = await ai.models.generateContent({
				model: modelName,
				contents: [{ role: 'user', parts: [{ text: fullPrompt }] }]
			});
			return response.text?.trim() || '';
		} catch (e) {
			console.error(e);
			new Notice('Gemini Error');
			return '';
		}
	}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}
}
