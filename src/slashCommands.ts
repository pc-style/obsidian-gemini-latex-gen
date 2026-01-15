import {
    App,
    Editor,
    EditorPosition,
    EditorSuggest,
    EditorSuggestContext,
    EditorSuggestTriggerInfo,
    MarkdownView,
    TFile
} from 'obsidian';
import GeminiLatexPlugin from './main';

interface LaTeXCommand {
    name: string;
    description: string;
    icon: string;
    id: string;
}

const COMMANDS: LaTeXCommand[] = [
    { id: 'convert-line', name: 'Convert current line', description: 'Transform entire line to LaTeX', icon: 'zap' },
    { id: 'ocr-image', name: 'OCR from Image', description: 'Extract LaTeX from pasted image/selection', icon: 'image' },
    { id: 'draw-math', name: 'Draw Math', description: 'Draw equations by hand', icon: 'pencil' },
    { id: 'find-all', name: 'Find all math in file', description: 'Fix & format the whole file', icon: 'search' },
    { id: 'explain', name: 'Explain this equation', description: 'Get a step-by-step breakdown', icon: 'help-circle' }
];

export class LaTeXSlashSuggest extends EditorSuggest<LaTeXCommand> {
    plugin: GeminiLatexPlugin;

    constructor(app: App, plugin: GeminiLatexPlugin) {
        super(app);
        this.plugin = plugin;
    }

    onTrigger(cursor: EditorPosition, editor: Editor, file: TFile): EditorSuggestTriggerInfo | null {
        if (!this.plugin.settings.enableSlashCommands) return null;

        const line = editor.getLine(cursor.line);
        const sub = line.substring(0, cursor.ch);
        const match = sub.match(/\/(\w*)$/);

        if (match) {
            return {
                start: { line: cursor.line, ch: match.index ?? 0 },
                end: cursor,
                query: match[1] ?? ""
            };
        }
        return null;
    }

    getSuggestions(context: EditorSuggestContext): LaTeXCommand[] {
        const query = context.query.toLowerCase();
        return COMMANDS.filter(cmd =>
            cmd.name.toLowerCase().includes(query) ||
            cmd.description.toLowerCase().includes(query)
        );
    }

    renderSuggestion(cmd: LaTeXCommand, el: HTMLElement): void {
        const div = el.createDiv({ cls: 'suggestion-content' });
        div.createEl('div', { text: cmd.name, cls: 'suggestion-title' });
        div.createEl('small', { text: cmd.description, cls: 'suggestion-note' });
    }

    selectSuggestion(cmd: LaTeXCommand, evt: MouseEvent | KeyboardEvent): void {
        const { editor, start, end } = this.context!;
        // Remove the /query
        editor.replaceRange('', start, end);

        // Execute command
        this.plugin.executeSlashCommand(cmd.id, editor);
    }
}
