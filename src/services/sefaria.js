const BASE_URL = "https://www.sefaria.org/api/texts";

/**
 * Fetches text from Sefaria API.
 * @param {string} ref - The citation reference (e.g., "Genesis 1:1", "Rashi on Genesis 1:1").
 * @returns {Promise<object|null>} - The text object or null if failed.
 */
export const getSefariaText = async (ref) => {
    try {
        // context=0 to get specific segment, pad=0 to avoid surrounding validation padding if possible (though context=0 does that)
        const encodedRef = encodeURIComponent(ref);
        const response = await fetch(`${BASE_URL}/${encodedRef}?context=0`);

        if (!response.ok) {
            console.error(`Error fetching ${ref}: ${response.statusText}`);
            return null;
        }

        const data = await response.json();

        // Check if we got valid text content
        // Sefaria returns 'he' (Hebrew) and 'text' (English)
        // Sometimes 'text' or 'he' might be arrays if it's a range or chapter

        let hebrewText = data.he;
        let englishText = data.text;

        // Normalize arrays to strings if necessary (though styling might handle arrays better, let's keep array if it's multiple segments)
        // Taking a segment usually returns a string. Taking a range returns an array.
        // The requirements say "distinct blocks", but usually we add one "Source" which might be a verse or a comment.

        return {
            ref: data.ref, // The canonical reference
            he: hebrewText,
            en: englishText,
            categories: data.categories,
            type: data.type
        };
    } catch (error) {
        console.error("Sefaria API Exception:", error);
        return null;
    }
};
