// src/services/ai.js

/**
 * Sends a message to the Google Gemini API.
 * @param {string} userText - The user's input message.
 * @param {Array} messageHistory - Previous messages for context.
 * @returns {Promise<Object>} - The API response object.
 */
export const sendGeminiMessage = async (userText, messageHistory) => {
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

        // If history is empty but we have a welcome message in state, 
        // strictly speaking we might want to include it, 
        // but often the system prompt handles the "persona".
        // For now, we trust the UI state passed in.

        const response = await fetch('/api/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                message: userText,
                history: history
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
