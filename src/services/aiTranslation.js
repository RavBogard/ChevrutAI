export const normalizeText = (text) => {
    if (!text) return '';
    if (Array.isArray(text)) return text.filter(Boolean).join('\n');
    return String(text);
};

export const translateWithAI = async (ref, hebrewText) => {
    const response = await fetch('/api/translate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ref, hebrewText })
    });

    if (!response.ok) {
        const err = await response.json().catch(() => ({ error: response.statusText }));
        throw new Error(err.error || `Translation failed: ${response.status}`);
    }

    return response.json();
    // Returns: { translation, isAramaic, confidence, model }
};
