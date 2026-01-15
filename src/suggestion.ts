import {
    EditorView,
    Decoration,
    DecorationSet,
    PluginValue,
    ViewPlugin,
    ViewUpdate,
    WidgetType,
    keymap
} from '@codemirror/view';
import { StateField, StateEffect, Prec } from '@codemirror/state';
import { GoogleGenAI } from '@google/genai';
import GeminiLatexPlugin from './main';
import { renderMath, finishRenderMath } from 'obsidian';

export const setGhostText = StateEffect.define<string | null>();

const ghostTextField = StateField.define<string | null>({
    create: () => null,
    update(value, tr) {
        for (const effect of tr.effects) {
            if (effect.is(setGhostText)) return effect.value;
        }
        if (tr.docChanged) return null;
        return value;
    }
});

class GhostTextWidget extends WidgetType {
    constructor(readonly text: string, readonly showPreview: boolean) {
        super();
    }

    toDOM(view: EditorView) {
        const container = document.createElement('span');
        container.className = 'gemini-latex-ghost-container';

        const span = container.createEl('span', {
            text: this.text,
            cls: 'cm-ghost-text'
        });
        span.style.opacity = '0.5';
        span.style.fontStyle = 'italic';
        span.style.color = 'var(--text-muted)';

        if (this.showPreview && this.text.trim()) {
            const preview = container.createDiv({ cls: 'gemini-latex-hover-preview' });
            preview.style.position = 'absolute';
            preview.style.bottom = '100%';
            preview.style.left = '0';
            preview.style.background = 'var(--background-primary)';
            preview.style.border = '1px solid var(--background-modifier-border)';
            preview.style.padding = '5px';
            preview.style.zIndex = '100';
            preview.style.borderRadius = '4px';
            preview.style.boxShadow = '0 2px 8px rgba(0,0,0,0.2)';

            let MathContent = this.text.replace(/\$\$/g, '').replace(/\$/g, '').trim();

            const mathEl = preview.createSpan();
            try {
                const rendered = renderMath(MathContent, true);
                mathEl.appendChild(rendered);
                finishRenderMath();
            } catch (e) {
                mathEl.setText('Error rendering preview');
            }
        }

        return container;
    }
}

class LatexSuggestionPlugin implements PluginValue {
    private delayTimer: number | null = null;
    decorations: DecorationSet;

    constructor(private view: EditorView, private plugin: GeminiLatexPlugin) {
        this.decorations = Decoration.none;
    }

    update(update: ViewUpdate) {
        const ghostText = update.state.field(ghostTextField);
        if (ghostText) {
            const cursor = update.state.selection.main.head;
            this.decorations = Decoration.set([
                Decoration.widget({
                    widget: new GhostTextWidget(ghostText, this.plugin.settings.enableHoverPreview),
                    side: 1
                }).range(cursor)
            ]);
        } else {
            this.decorations = Decoration.none;
        }

        if (!this.plugin.settings.enableAutocomplete) return;
        if (!update.docChanged) return;

        if (this.delayTimer) window.clearTimeout(this.delayTimer);

        this.delayTimer = window.setTimeout(() => this.fetchSuggestion(), this.plugin.settings.autocompleteDelay);
    }

    async fetchSuggestion() {
        const cursor = this.view.state.selection.main.head;
        const line = this.view.state.doc.lineAt(cursor);
        const context = line.text.substring(0, cursor - line.from);

        if (!context.trim()) return;
        if (!this.plugin.settings.apiKey) return;

        try {
            const ai = new GoogleGenAI({ apiKey: this.plugin.settings.apiKey });
            const prompt = `Suggest a LaTeX conversion for the current line fragment. 
			If the line looks like a math description, return the LaTeX conversion (wrapped in $$ if complex).
			Example: "integral of x squared" -> "$$ \\int x^2 \, dx $$"
			Return ONLY the LaTeX or EMPTY STRING if no math detected.
			Line: "${context}"`;

            const response = await ai.models.generateContent({
                model: this.plugin.settings.autocompleteModel,
                contents: [{ role: 'user', parts: [{ text: prompt }] }]
            });

            const suggestion = response.text?.trim() || '';

            if (suggestion && suggestion.startsWith('$')) {
                this.view.dispatch({ effects: setGhostText.of(" " + suggestion) });
            }
        } catch (e) { }
    }

    destroy() {
        if (this.delayTimer) clearTimeout(this.delayTimer);
    }
}

const acceptSuggestionKeymap = keymap.of([
    {
        key: 'Tab',
        run: (view) => {
            const suggestion = view.state.field(ghostTextField);
            if (suggestion) {
                const cursor = view.state.selection.main.head;
                const line = view.state.doc.lineAt(cursor);
                const from = line.from;
                view.dispatch({
                    changes: { from: from, to: cursor, insert: suggestion.trim() },
                    selection: { anchor: from + suggestion.trim().length },
                    effects: setGhostText.of(null)
                });
                return true;
            }
            return false;
        }
    }
]);

export const latexSuggestionExtension = (plugin: GeminiLatexPlugin) => [
    ghostTextField,
    ViewPlugin.define((view) => new LatexSuggestionPlugin(view, plugin), {
        decorations: v => v.decorations
    }),
    Prec.highest(acceptSuggestionKeymap)
];
