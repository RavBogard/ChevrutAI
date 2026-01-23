/**
 * Formats the source sheet into a structured Markdown-like context for the AI.
 * Distinguishes between Section Headers, Texts, and Notes.
 * @param {Array} sources 
 * @returns {string}
 */
const formatSheetForAI = (sources) => {
    if (!sources || sources.length === 0) return "The user has an empty source sheet.";

    let output = "## Current Sheet Structure\n\n";
    let sectionCount = 0;

    sources.forEach((s, i) => {
        if (s.type === 'header') {
            sectionCount++;
            output += `\n### Section ${sectionCount}: ${s.en || s.he || '(Untitled Section)'}\n`;
        } else if (s.type === 'custom') {
            output += `> Note: ${s.en}\n`;
        } else {
            // Text Source
            output += `${i + 1}. **${s.ref}**\n`;

            // Safe string conversion
            let textSnippet = "";
            if (typeof s.en === 'string') textSnippet = s.en;
            else if (Array.isArray(s.en)) textSnippet = s.en.join(" ");

            if (textSnippet) {
                output += `   "${textSnippet.substring(0, 150)}${textSnippet.length > 150 ? '...' : ''}"\n`;
            }
        }
    });

    return output;
};

/**
 * Sends a message to the Google Gemini API.
 * @param {string} userText - The user's input message.
 * @param {Array} messageHistory - Previous messages for context.
 * @param {Array} sheetSources - The current list of sources on the sheet.
 * @returns {Promise<Object>} - The API response object.
 */
export const sendGeminiMessage = async (userText, messageHistory, sheetSources = [], onChunk = null) => {
    try {
        // Filter and format history
        let history = messageHistory
            .slice(-10) // Keep last 10 messages for context window management
            .filter(m => m.text && m.text.trim() !== '') // Remove empty
            .filter((m, index) => index > 0 || m.role !== 'model') // Ensure first msg isn't model if it was just a welcome
            .map(m => ({
                role: m.role,
                parts: [{ text: m.text }]
            }));

        // Generate Context
        const sheetContext = formatSheetForAI(sheetSources);

        const response = await fetch('/api/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                message: userText,
                history: history,
                context: sheetContext // Send structured context
            })
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`API Error ${response.status}: ${errorText}`);
        }

        // Handle Streaming Response
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let fullText = '';
        let sourcesBlock = null;
        let isJsonLike = false; // Flag to detect if model is ignoring instructions and outputting JSON

        while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            const chunk = decoder.decode(value, { stream: true });
            fullText += chunk;

            // Check for JSON-like start (heuristic)
            if (fullText.length < 50 && (fullText.trim().startsWith('{') || fullText.trim().startsWith('```json'))) {
                isJsonLike = true;
            }

            // Check if we hit the sources separator
            const separatorIndex = fullText.indexOf('---SOURCES---');

            // If we haven't hit the separator...
            if (separatorIndex === -1) {
                // ONLY stream to UI if it doesn't look like raw JSON
                // This prevents the user from seeing "{ "content": ..."
                if (!isJsonLike && onChunk) {
                    onChunk(fullText);
                }
            } else {
                // If we hit the separator, we stream ONLY the text part
                const textPart = fullText.substring(0, separatorIndex).trim();
                if (!isJsonLike && onChunk) onChunk(textPart);
            }
        }

        // Final Parsing
        const separatorIndex = fullText.indexOf('---SOURCES---');
        let content = fullText;
        let suggested_sources = [];
        let suggested_title = null;

        if (separatorIndex !== -1) {
            // Standard NEW Format logic
            content = fullText.substring(0, separatorIndex).trim();
            const jsonPart = fullText.substring(separatorIndex + '---SOURCES---'.length).trim();
            try {
                const jsonStart = jsonPart.indexOf('{');
                if (jsonStart !== -1) {
                    const cleanJson = jsonPart.substring(jsonStart);
                    const parsed = JSON.parse(cleanJson);
                    suggested_sources = parsed.suggested_sources || [];
                    suggested_title = parsed.suggested_title || null;
                }
            } catch (e) {
                console.error("Failed to parse sources JSON", e);
            }
        } else {
            // Fallback: Check if the WHOLE text was JSON (Legacy/Glitched format)
            try {
                // Try to parse fullText directly (or cleaned of markdown blocks)
                let textToParse = fullText.trim();
                if (textToParse.startsWith('```json')) {
                    textToParse = textToParse.replace(/^```json\s*/, '').replace(/\s*```$/, '');
                } else if (textToParse.startsWith('```')) {
                    textToParse = textToParse.replace(/^```\s*/, '').replace(/\s*```$/, '');
                }

                if (textToParse.startsWith('{')) {
                    const parsed = JSON.parse(textToParse);
                    if (parsed.content) {
                        content = parsed.content;
                        // Since we suppressed streaming, onChunk was never called. 
                        // We must rely on the caller using the returned 'content' to update final UI.
                    }
                    if (parsed.suggested_sources) suggested_sources = parsed.suggested_sources;
                    if (parsed.suggested_title) suggested_title = parsed.suggested_title;
                }
            } catch (e) {
                // Not JSON, just plain text without separator.
                // Content is already fullText.
            }
        }

        // Return structured object compatible with old signature
        return {
            content: content,
            suggested_title: suggested_title,
            suggested_sources: suggested_sources,
            raw: fullText
        };

    } catch (error) {
        console.error("AI Service Error:", error);
        throw error;
    }
};
