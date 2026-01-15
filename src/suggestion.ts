import { Extension } from '@codemirror/state';
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
import { StateField, StateEffect } from '@codemirror/state';
import { GoogleGenAI } from '@google/genai';
import GeminiLatexPlugin from './main';

// Effect to update the current ghost text
export const setGhostText = StateEffect.define<string | null>();

// State field to hold the current ghost text
const ghostTextField = StateField.define<string | null>({
    create: () => null,
    update(value, tr) {
        for (const effect of tr.effects) {
            if (effect.is(setGhostText)) return effect.value;
        }
        if (tr.docChanged) return null;
        return value;
    },
    provide: (f) => [] // We don't provide decorations here anymore
});

class GhostTextWidget extends WidgetType {
    constructor(readonly text: string) {
        super();
    }

    toDOM() {
        const span = document.createElement('span');
        span.textContent = this.text;
        span.style.opacity = '0.5';
        span.style.fontStyle = 'italic';
        span.style.color = 'var(--text-muted)';
        span.className = 'cm-ghost-text';
        return span;
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

        // Update decorations based on ghost text field
        // We re-calculate this on every update to ensure it stays at the cursor or valid position
        if (ghostText) {
            const cursor = update.state.selection.main.head;
            this.decorations = Decoration.set([
                Decoration.widget({
                    widget: new GhostTextWidget(ghostText),
                    side: 1
                }).range(cursor)
            ]);
        } else {
            this.decorations = Decoration.none;
        }

        if (!this.plugin.settings.enableAutocomplete) return;
        if (!update.docChanged) return;

        // Clear existing timer
        if (this.delayTimer) {
            window.clearTimeout(this.delayTimer);
            this.delayTimer = null;
        }

        // Clear existing suggestion immediately on type if not already handled by field
        if (ghostText !== null) {
            // This might cause a loop if not careful, but field update handles docChanged so likely null already
        }

        // Set new timer
        this.delayTimer = window.setTimeout(() => {
            this.fetchSuggestion();
        }, this.plugin.settings.autocompleteDelay);
    }

    async fetchSuggestion() {
        const cursor = this.view.state.selection.main.head;
        const line = this.view.state.doc.lineAt(cursor);
        const lineText = line.text;
        const lineStart = line.from;
        const relativeCursor = cursor - lineStart;

        const context = lineText.slice(0, relativeCursor);

        if (!context.trim()) return;
        if (!this.plugin.settings.apiKey) return;

        try {
            const genAI = new GoogleGenAI({ apiKey: this.plugin.settings.apiKey });
            const prompt = `Complete the following text with a LaTeX equivalent if IT IS a math expression. 
			If the text matches a known mathematical concept, output the LaTeX equation starting with space.
			Example: "area of circle" -> " = \\pi r^2"
			Example: "quadratic formula" -> " x = \\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}"
			If it's NOT a math concept, return EMPTY STRING.
			RETURN ONLY THE COMPLETION SUFFIX.
			Input: "${context}"`;

            const response = await genAI.models.generateContent({
                model: this.plugin.settings.autocompleteModel,
                contents: prompt
            });

            const suggestion = response.text ? response.text.trimEnd() : '';

            if (suggestion && suggestion.length > 0 && suggestion !== "null") {
                this.view.dispatch({
                    effects: setGhostText.of(suggestion)
                });
            }

        } catch (e) {
            // console.error(e);
        }
    }

    destroy() {
        if (this.delayTimer) clearTimeout(this.delayTimer);
    }
}

// Keymap to accept suggestion
const acceptSuggestionKeymap = keymap.of([
    {
        key: 'Tab',
        run: (view) => {
            const suggestion = view.state.field(ghostTextField);
            if (suggestion) {
                const cursor = view.state.selection.main.head;
                view.dispatch({
                    changes: { from: cursor, insert: suggestion },
                    selection: { anchor: cursor + suggestion.length },
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
    acceptSuggestionKeymap
];
