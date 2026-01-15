import { App, Modal, Setting, Notice } from 'obsidian';

export class DrawingModal extends Modal {
    private canvas: HTMLCanvasElement;
    private ctx: CanvasRenderingContext2D;
    private isDrawing: boolean = false;
    private onSubmit: (base64: string) => void;

    constructor(app: App, onSubmit: (base64: string) => void) {
        super(app);
        this.onSubmit = onSubmit;
    }

    onOpen() {
        const { contentEl } = this;
        contentEl.empty();
        contentEl.addClass('gemini-latex-drawing-modal');

        this.setTitle('Draw Math');

        this.canvas = contentEl.createEl('canvas', {
            cls: 'gemini-latex-canvas'
        });
        this.canvas.width = 600;
        this.canvas.height = 400;
        this.canvas.style.border = '1px solid var(--background-modifier-border)';
        this.canvas.style.cursor = 'crosshair';
        this.canvas.style.backgroundColor = 'white'; // White background for OCR clarity

        this.ctx = this.canvas.getContext('2d')!;
        this.ctx.lineWidth = 3;
        this.ctx.lineCap = 'round';
        this.ctx.strokeStyle = 'black';

        // Drawing Logic
        this.canvas.addEventListener('mousedown', (e) => this.startDrawing(e));
        this.canvas.addEventListener('mousemove', (e) => this.draw(e));
        this.canvas.addEventListener('mouseup', () => this.stopDrawing());
        this.canvas.addEventListener('mouseout', () => this.stopDrawing());

        // Touch Support
        this.canvas.addEventListener('touchstart', (e) => {
            e.preventDefault();
            const touch = e.touches[0];
            this.startDrawing(touch);
        });
        this.canvas.addEventListener('touchmove', (e) => {
            e.preventDefault();
            const touch = e.touches[0];
            this.draw(touch);
        });
        this.canvas.addEventListener('touchend', () => this.stopDrawing());

        const buttonContainer = contentEl.createDiv({ cls: 'gemini-latex-canvas-buttons' });
        buttonContainer.style.marginTop = '10px';
        buttonContainer.style.display = 'flex';
        buttonContainer.style.gap = '10px';

        const clearBtn = buttonContainer.createEl('button', { text: 'Clear' });
        clearBtn.onclick = () => {
            this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        };

        const submitBtn = buttonContainer.createEl('button', { text: 'Convert', cls: 'mod-cta' });
        submitBtn.onclick = () => {
            const dataUrl = this.canvas.toDataURL('image/png');
            const parts = dataUrl.split(',');
            if (parts.length > 1) {
                const base64 = parts[1];
                if (base64) {
                    this.onSubmit(base64);
                    this.close();
                }
            }
        };
    }

    private getMousePos(evt: any) {
        const rect = this.canvas.getBoundingClientRect();
        return {
            x: (evt.clientX || evt.pageX) - rect.left,
            y: (evt.clientY || evt.pageY) - rect.top
        };
    }

    private startDrawing(e: any) {
        this.isDrawing = true;
        this.ctx.beginPath();
        const pos = this.getMousePos(e);
        this.ctx.moveTo(pos.x, pos.y);
    }

    private draw(e: any) {
        if (!this.isDrawing) return;
        const pos = this.getMousePos(e);
        this.ctx.lineTo(pos.x, pos.y);
        this.ctx.stroke();
    }

    private stopDrawing() {
        this.isDrawing = false;
    }

    onClose() {
        const { contentEl } = this;
        contentEl.empty();
    }
}
