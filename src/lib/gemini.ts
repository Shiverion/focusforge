// Gemini 3 Flash API integration for note summarization
// User will need to provide their API key in settings

const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-3-flash-preview:generateContent';

// Timer suggestion types
export interface TimerSuggestionInput {
    topic: string;
    subtopics?: string;
    complexity?: 'beginner' | 'intermediate' | 'advanced';
    learningStyle?: 'reading' | 'coding' | 'video' | 'mixed';
    energyLevel?: 'high' | 'medium' | 'low';
    timeAvailable?: number;
}

export interface TimerSuggestion {
    focusDuration: number;
    breakDuration: number;
    sessions?: number;
    reasoning: string;
    tips: string[];
}

export async function suggestTimerSettings(
    input: TimerSuggestionInput,
    apiKey: string
): Promise<TimerSuggestion> {
    if (!apiKey) {
        throw new Error('Gemini API key not configured');
    }

    const prompt = `You are an expert in optimal learning session durations using the Pomodoro Technique and cognitive science.

Analyze this learning context and suggest CUSTOMIZED timer settings (do NOT just suggest 25/5 unless truly optimal):

${input.topic ? `- Topic: ${input.topic}` : ''}
${input.subtopics ? `- Subtopics: ${input.subtopics}` : ''}
${input.complexity ? `- Complexity: ${input.complexity}` : ''}
${input.learningStyle ? `- Learning Style: ${input.learningStyle}` : ''}
${input.energyLevel ? `- Energy Level: ${input.energyLevel}` : ''}
${input.timeAvailable ? `- Time Available: ${input.timeAvailable} minutes` : ''}

IMPORTANT: Consider these research-backed guidelines and VARY your recommendations:
- Standard Pomodoro: 25 min focus, 5 min break (DEFAULT for general tasks)
- Deep work sessions: 45-90 min for complex/advanced topics requiring deep concentration
- Low energy: 15-20 min sessions with 5-8 min breaks
- Coding/creative work: 45-60 min sessions with 10-15 min breaks
- Reading/studying: 30-40 min sessions with 5-10 min breaks
- Beginner topics: 20-30 min to prevent overwhelm, 5 min breaks
- Advanced/complex topics: 50-75 min for deep focus, 10-15 min breaks
- High energy: can sustain 50-75 min sessions
- Medium energy: 30-45 min sessions
- If time is limited, fit sessions within the available time

You MUST provide values different from 25/5 when the context suggests it. Be bold with your recommendations.

Respond in ONLY this JSON format (no other text):
{
  "focusDuration": <number 15-90>,
  "breakDuration": <number 3-20>,
  "sessions": <optional number 1-8>,
  "reasoning": "<1-2 sentences explaining why these specific settings fit this learning context>",
  "tips": ["<specific tip 1>", "<specific tip 2>", "<specific tip 3>"]
}`;

    try {
        const response = await fetch(`${GEMINI_API_URL}?key=${apiKey}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{ parts: [{ text: prompt }] }],
                generationConfig: {
                    temperature: 0.7,
                    maxOutputTokens: 1000, // Increased to prevent truncation
                },
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

        console.log('[Gemini] Timer suggestion raw response:', text);

        // Clean up markdown code blocks if present
        let cleanText = text.replace(/```\w*\s*/g, '').replace(/```/g, '').trim();

        // Remove JS-style comments
        cleanText = cleanText.replace(/\s*\/\/.*$/gm, '');

        console.log('[Gemini] Cleaned text for parsing:', cleanText);

        const jsonMatch = cleanText.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
            console.log('[Gemini] Extracted JSON string:', jsonMatch[0]);
            try {
                // Try parsing directly first
                const result = JSON.parse(jsonMatch[0]) as TimerSuggestion;
                console.log('[Gemini] Successfully parsed JSON:', result);

                // Clamp values to reasonable ranges
                result.focusDuration = Math.max(15, Math.min(90, result.focusDuration));
                result.breakDuration = Math.max(3, Math.min(20, result.breakDuration));
                return result;
            } catch (parseError) {
                console.error('[Gemini] JSON parse error:', parseError);
                // Last resort: try to fix common JSON issues (trailing commas)
                try {
                    const fixedJson = jsonMatch[0].replace(/,(\s*[}\]])/g, '$1');
                    const result = JSON.parse(fixedJson) as TimerSuggestion;
                    // Clamp values
                    result.focusDuration = Math.max(15, Math.min(90, result.focusDuration));
                    result.breakDuration = Math.max(3, Math.min(20, result.breakDuration));
                    return result;
                } catch (retryError) {
                    console.error('[Gemini] Retry parse failed:', retryError);
                }
            }
        }

        console.warn('[Gemini] No JSON found in response, using fallback');
        // Fallback to default
        return {
            focusDuration: 25,
            breakDuration: 5,
            reasoning: 'Using standard Pomodoro settings as fallback.',
            tips: ['Take notes during your session', 'Review at the end'],
        };
    } catch (error) {
        console.error('Timer suggestion error:', error);
        throw error;
    }
}

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
