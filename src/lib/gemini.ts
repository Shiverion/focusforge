// Gemini 2.5 Flash API integration for note summarization
// User will need to provide their API key in settings

const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-3-flash-preview:generateContent';

export interface SummaryResult {
    summary: string;
    keyPoints: string[];
    reviewPrompt?: string;
}

export async function summarizeNotes(
    notes: string[],
    apiKey: string
): Promise<SummaryResult> {
    if (!apiKey) {
        throw new Error('Gemini API key not configured');
    }

    const combinedNotes = notes.join('\n\n---\n\n');

    const prompt = `You are a learning assistant. A student has taken these notes during their study session:

${combinedNotes}

Please provide:
1. A concise summary (2-3 sentences) of what they learned
2. 3-5 key points as bullet points
3. One question to test their understanding (for active recall)

Respond in this exact JSON format:
{
  "summary": "...",
  "keyPoints": ["...", "..."],
  "reviewPrompt": "..."
}`;

    try {
        const response = await fetch(`${GEMINI_API_URL}?key=${apiKey}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                contents: [{
                    parts: [{ text: prompt }]
                }],
                generationConfig: {
                    temperature: 0.3,
                    maxOutputTokens: 500,
                }
            }),
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error('Gemini API error:', response.status, errorText);
            throw new Error(`API error: ${response.status}`);
        }

        const data = await response.json();
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text;

        if (!text) {
            throw new Error('No response from Gemini');
        }

        console.log('[Gemini] Raw response:', text);

        // Try to extract JSON from response
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
            try {
                return JSON.parse(jsonMatch[0]) as SummaryResult;
            } catch (parseError) {
                console.warn('[Gemini] JSON parse failed, using fallback');
            }
        }

        // Fallback: create summary from plain text response
        return {
            summary: text.substring(0, 300),
            keyPoints: ['See full response above'],
            reviewPrompt: 'What did you learn from this session?'
        };
    } catch (error) {
        console.error('Summarization error:', error);
        throw error;
    }
}


// Chat with context
export interface ChatMessage {
    role: 'user' | 'model';
    text: string;
}

export async function chatWithAI(
    history: ChatMessage[],
    newMessage: string,
    apiKey: string,
    systemInstruction?: string
): Promise<string> {
    if (!apiKey) throw new Error('Gemini API key not configured');

    try {
        const contents = history.map(msg => ({
            role: msg.role,
            parts: [{ text: msg.text }]
        }));

        contents.push({
            role: 'user',
            parts: [{ text: newMessage }]
        });

        const body: any = {
            contents,
            generationConfig: {
                temperature: 0.7,
                maxOutputTokens: 1000,
            }
        };

        if (systemInstruction) {
            body.systemInstruction = {
                parts: [{ text: systemInstruction }]
            };
        }

        const response = await fetch(`${GEMINI_API_URL}?key=${apiKey}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
        });

        if (!response.ok) throw new Error(`API error: ${response.status}`);

        const data = await response.json();
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text;

        if (!text) throw new Error('No response from Gemini');

        return text;
    } catch (error) {
        console.error('Chat error:', error);
        throw error;
    }
}

// Fallback rule-based summarization (when no API key)
export function fallbackSummarize(notes: string[]): SummaryResult {
    const allText = notes.join(' ');
    const sentences = allText.split(/[.!?]+/).filter(s => s.trim().length > 10);

    return {
        summary: sentences.slice(0, 2).join('. ').trim() + '.',
        keyPoints: sentences.slice(0, 3).map(s => s.trim()),
        reviewPrompt: 'What were the main concepts you learned today?',
    };
}
