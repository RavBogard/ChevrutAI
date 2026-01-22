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
export const sendGeminiMessage = async (userText, messageHistory, sheetSources = []) => {
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

        const data = await response.json();
        return data;

    } catch (error) {
        console.error("AI Service Error:", error);
        throw error;
    }
};
