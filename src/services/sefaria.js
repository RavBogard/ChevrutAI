const BASE_URL = "https://www.sefaria.org/api/texts";
const NAME_BASE_URL = "https://www.sefaria.org/api/name";

/**
 * Tries to resolve a fuzzy or incorrect ref to a canonical Sefaria Ref using the Name API.
 * @param {string} ref 
 * @returns {Promise<string|null>} The corrected ref or null
 */
const resolveSefariaRef = async (ref) => {
    try {
        let term = ref;
        // regex to grab the "Book Name" part (e.g. from "Book Name 1:1" -> "Book Name")
        // Also stripping potential subtitles if they appear after a comma e.g. "Even Bochan, The Prayer..."
        const match = ref.match(/^([^,:]+)/);
        if (match) {
            term = match[1].trim();
        }

        const encoded = encodeURIComponent(term);
        const response = await fetch(`${NAME_BASE_URL}/${encoded}?limit=5`);
        if (!response.ok) return null;

        const data = await response.json();

        // Look for best match in completion_objects
        if (data.completion_objects && data.completion_objects.length > 0) {
            const candidates = data.completion_objects
                .filter(obj => obj.type === 'ref' || obj.type === 'Index')
                .map(obj => obj.key);

            if (candidates.length > 0) {
                // Try to reconstruct the ref with the canonical title
                // Find where the numbers start in the original ref
                const numberMatch = ref.match(/(\d+[.:].*)$/);
                if (numberMatch) {
                    return `${candidates[0]} ${numberMatch[1]}`;
                }
                // If no numbers, just return the book
                return candidates[0];
            }
        }
        return null;
    } catch (e) {
        // Silent fail
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
        const fetchRef = async (citationRef) => {
            const encodedRef = encodeURIComponent(citationRef);
            const response = await fetch(`${BASE_URL}/${encodedRef}?context=0`);
            if (!response.ok) return null;
            return await response.json();
        };

        let data = await fetchRef(ref);

        // If direct fetch failed, try to recover using Name API
        if (!data || data.error) {
            const resolvedRef = await resolveSefariaRef(ref);
            if (resolvedRef && resolvedRef !== ref) {
                data = await fetchRef(resolvedRef);
            }
        }

        if (!data || data.error) {
            return null;
        }

        let hebrewText = data.he;
        let englishText = data.text;
        let versionTitle = data.versionTitle;
        let canonicalRef = data.ref || ref;

        // Filter for available English versions
        const enVersions = data.versions ? data.versions.filter(v => v.language === 'en') : [];

        // FALLBACK LOGIC: If default English text is empty/missing, try to fetch the first available English version
        const isEnglishEmpty = !englishText || (Array.isArray(englishText) && englishText.every(s => !s || !s.trim())) || (typeof englishText === 'string' && !englishText.trim());

        if (isEnglishEmpty && enVersions.length > 0) {
            // Iterate through ALL available English versions until we find one with actual text
            for (const version of enVersions) {
                const candidateTitle = version.versionTitle;
                const fallbackText = await getSefariaTextByVersion(canonicalRef, candidateTitle);

                // Check if this fallback text is actually valid/non-empty
                const isValidFallback = fallbackText &&
                    ((Array.isArray(fallbackText) && fallbackText.some(s => s && s.trim())) ||
                        (typeof fallbackText === 'string' && fallbackText.trim()));

                if (isValidFallback) {
                    englishText = fallbackText;
                    versionTitle = candidateTitle;
                    break; // Stop looking, we found one!
                }
            }
        }

        return {
            ref: canonicalRef, // The canonical reference
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
