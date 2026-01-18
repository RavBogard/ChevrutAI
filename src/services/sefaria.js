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
        let versionTitle = data.versionTitle;

        // Filter for English versions to populate dropdown
        const enVersions = data.versions ? data.versions.filter(v => v.language === 'en') : [];

        // FALLBACK LOGIC: If default English text is empty/missing, try to fetch the first available English version
        const isEnglishEmpty = !englishText || (Array.isArray(englishText) && englishText.every(s => !s || !s.trim())) || (typeof englishText === 'string' && !englishText.trim());

        if (isEnglishEmpty && enVersions.length > 0) {
            const fallbackVersion = enVersions[0].versionTitle;
            console.log(`Default text empty for ${ref}. Fetching fallback version: ${fallbackVersion}`);
            // Note: We need to import calls to getSefariaTextByVersion or define it before? 
            // It is exported in same file. We can call it directly if we hoist it or just use the logic.
            // But it's defined BELOW. Javascript functions are hoisted? `export const` are not hoisted in the same way as function declarations.
            // I should move this logic or call it safely.
            // Actually, since it's a module, I can call `getSefariaTextByVersion` if it's in scope.
            // But `const getSefariaTextByVersion` is distinct.
            // I will copy the fetch logic here to avoid reference error before initialization if problematic, 
            // OR I will simply move `getSefariaTextByVersion` ABOVE `getSefariaText`.
            // OR I will just call it and hope, but risk ReferenceError.
            // SAFER: Use the fetch directly here.

            try {
                const encodedRefFallback = encodeURIComponent(data.ref);
                const encodedTitleFallback = encodeURIComponent(fallbackVersion);
                const resFallback = await fetch(`${BASE_URL}/${encodedRefFallback}?context=0&version=en|${encodedTitleFallback}`);
                if (resFallback.ok) {
                    const dataFallback = await resFallback.json();
                    if (dataFallback.text) {
                        englishText = dataFallback.text;
                        versionTitle = fallbackVersion;
                    }
                }
            } catch (err) {
                console.error("Fallback fetch failed", err);
            }
        }

        return {
            ref: data.ref, // The canonical reference
            he: hebrewText,
            en: englishText,
            categories: data.categories,
            type: data.type,
            versionTitle: versionTitle, // The currently loaded English version title
            heVersionTitle: data.heVersionTitle,
            versions: enVersions // List of available English versions
        };
    } catch (error) {
        console.error("Sefaria API Exception:", error);
        return null;
    }
};

/**
 * Fetches specific English version of a text.
 * @param {string} ref 
 * @param {string} versionTitle 
 * @returns {Promise<string|null>}
 */
export const getSefariaTextByVersion = async (ref, versionTitle) => {
    try {
        const encodedRef = encodeURIComponent(ref);
        const encodedTitle = encodeURIComponent(versionTitle);
        // Using context=0 to match our block style
        const response = await fetch(`${BASE_URL}/${encodedRef}?context=0&version=en|${encodedTitle}`);

        if (!response.ok) return null;

        const data = await response.json();
        return data.text; // Returns the English text for this version
    } catch (error) {
        console.error("Version fetch failed:", error);
        return null;
    }
};
