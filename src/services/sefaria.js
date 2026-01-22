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
        // Instead of splitting by comma, we try to separate the 'Book Name' from the 'Citation'
        // We look for the start of the number sequence at the end of the string
        // e.g. "Kedushat Levi, Bereshit, Vayera 1:1" -> term: "Kedushat Levi, Bereshit, Vayera", citation: "1:1"
        const numberMatch = ref.match(/(\s+\d+[.:]?.*)$/);

        if (numberMatch) {
            // Everything before the numbers is the candidate text name
            term = ref.substring(0, numberMatch.index).trim();
        } else {
            // If no numbers found, use the whole string (trimmed)
            // This is better than the previous aggressive comma splitting which broke titles like "Sfat Emet, Deuteronomy..."
            term = ref.trim();
        }

        const encoded = encodeURIComponent(term);
        const response = await fetch(`${NAME_BASE_URL}/${encoded}?limit=5`);
        if (!response.ok) return null;

        const data = await response.json();

        if (data.completion_objects && data.completion_objects.length > 0) {
            const candidates = data.completion_objects
                .filter(obj => obj.type === 'ref' || obj.type === 'Index')
                .map(obj => obj.key);

            if (candidates.length > 0) {
                // Heuristic: Find the "Best Match" candidate instead of just taking the first one
                // We tokenize the search term and the candidate keys to find the most overlap
                const tokenize = (str) => str.toLowerCase().replace(/[^a-z0-9\s]/g, '').split(/\s+/).filter(Boolean);
                const termTokens = tokenize(term);

                let bestCandidate = candidates[0];
                let maxOverlap = -1;
                // Prefer shorter keys when overlaps are equal (e.g. "Tanya" vs "Tanya, Iggeret HaKodesh")
                // UNLESS the term has more words.

                for (const candidate of candidates) {
                    const candidateTokens = tokenize(candidate);
                    // Count how many term tokens appear in the candidate
                    const overlap = termTokens.filter(t => candidateTokens.includes(t)).length;

                    // Prioritize higher overlap
                    // If overlaps are equal, we might prefer the one that is closer in length to the original term
                    if (overlap > maxOverlap) {
                        maxOverlap = overlap;
                        bestCandidate = candidate;
                    } else if (overlap === maxOverlap) {
                        // Tie-breaking:
                        // If the candidate is "Tanya" (len 1) and term is "Tanya Likutei" (len 2)
                        // And "Tanya Likutei..." (len 3) has same overlap (2)
                        // We want the one that captures the specificity best.
                        // Actually, just picking the one with the highest overlap ratio to term length is usually good.
                        // Let's stick to a simple length tie-breaker: if overlap is same, pick the one with closer token count?
                        if (Math.abs(candidateTokens.length - termTokens.length) < Math.abs(tokenize(bestCandidate).length - termTokens.length)) {
                            bestCandidate = candidate;
                        }
                    }
                }

                // Try to reconstruct the ref with the canonical title
                const numberMatch = ref.match(/(\s+\d+[.:]?.*)$/);
                if (numberMatch) {
                    return `${bestCandidate}${numberMatch[1]}`;
                }
                // If no numbers, just return the book
                return bestCandidate;
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
