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

        while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            const chunk = decoder.decode(value, { stream: true });
            fullText += chunk;

            // Check if we hit the sources separator
            const separatorIndex = fullText.indexOf('---SOURCES---');

            // If we haven't hit the separator, we just stream the text
            if (separatorIndex === -1) {
                if (onChunk) onChunk(fullText);
            } else {
                // If we hit the separator, we stream ONLY the text part
                const textPart = fullText.substring(0, separatorIndex).trim();
                // If onChunk was called before with part of the separator, correct it?
                // Visual glitch might happen if "---" appears. 
                // Optimization: Don't stream if the chunk looks like it's starting the separator.
                // But for now, simple is fine.
                if (onChunk) onChunk(textPart);
            }
        }

        // Final Parsing
        const separatorIndex = fullText.indexOf('---SOURCES---');
        let content = fullText;
        let suggested_sources = [];
        let suggested_title = null;

        if (separatorIndex !== -1) {
            content = fullText.substring(0, separatorIndex).trim();
            const jsonPart = fullText.substring(separatorIndex + '---SOURCES---'.length).trim();
            try {
                // Find start of JSON object
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
