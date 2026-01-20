const BASE_URL = "https://www.sefaria.org/api/texts";

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

/**
 * Fetches text from Sefaria API.
 * @param {string} ref - The citation reference (e.g., "Genesis 1:1", "Rashi on Genesis 1:1").
 * @returns {Promise<object|null>} - The text object or null if failed.
 */
export const getSefariaText = async (ref) => {
    try {
        const encodedRef = encodeURIComponent(ref);
        const response = await fetch(`${BASE_URL}/${encodedRef}?context=0`);

        if (!response.ok) {
            console.error(`Error fetching ${ref}: ${response.statusText}`);
            return null;
        }

        const data = await response.json();

        let hebrewText = data.he;
        let englishText = data.text;
        let versionTitle = data.versionTitle;

        // Filter for available English versions
        const enVersions = data.versions ? data.versions.filter(v => v.language === 'en') : [];

        // FALLBACK LOGIC: If default English text is empty/missing, try to fetch the first available English version
        const isEnglishEmpty = !englishText || (Array.isArray(englishText) && englishText.every(s => !s || !s.trim())) || (typeof englishText === 'string' && !englishText.trim());

        if (isEnglishEmpty && enVersions.length > 0) {
            const fallbackVersion = enVersions[0].versionTitle;
            console.log(`Default text empty for ${ref}. Fetching fallback version: ${fallbackVersion}`);

            const fallbackText = await getSefariaTextByVersion(ref, fallbackVersion);
            if (fallbackText) {
                englishText = fallbackText;
                versionTitle = fallbackVersion;
            }
        }

        return {
            ref: data.ref, // The canonical reference
            he: hebrewText,
            en: englishText,
            categories: data.categories,
            type: data.type,
            versionTitle: versionTitle,
            heVersionTitle: data.heVersionTitle,
            versions: enVersions
        };
    } catch (error) {
        console.error("Sefaria API Exception:", error);
        return null;
    }
};
