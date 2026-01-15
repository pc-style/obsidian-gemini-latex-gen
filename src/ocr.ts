import { GoogleGenAI } from '@google/genai';

export async function performOCR(apiKey: string, base64Image: string, prompt: string = "Convert the mathematical formulas in this image to LaTeX. Return only the LaTeX code."): Promise<string> {
    const ai = new GoogleGenAI({ apiKey });

    const result = await ai.models.generateContent({
        model: 'gemini-1.5-flash',
        contents: [{
            role: 'user',
            parts: [
                { text: prompt },
                {
                    inlineData: {
                        mimeType: 'image/png',
                        data: base64Image
                    }
                }
            ]
        }]
    });

    return result.text || '';
}

/**
 * Utility to extract base64 data from a markdown image link or local path if possible.
 */
export function fileToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
            const result = reader.result as string;
            const base64 = result?.split(',')[1];
            if (base64) resolve(base64);
            else reject('Failed to convert file to base64');
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
}
