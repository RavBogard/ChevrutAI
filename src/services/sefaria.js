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

                // Simple Levenshtein distance for fuzzy string matching
                const levenshtein = (a, b) => {
                    const matrix = [];
                    for (let i = 0; i <= b.length; i++) matrix[i] = [i];
                    for (let j = 0; j <= a.length; j++) matrix[0][j] = j;
                    for (let i = 1; i <= b.length; i++) {
                        for (let j = 1; j <= a.length; j++) {
                            if (b.charAt(i - 1) === a.charAt(j - 1)) {
                                matrix[i][j] = matrix[i - 1][j - 1];
                            } else {
                                matrix[i][j] = Math.min(
                                    matrix[i - 1][j - 1] + 1,
                                    matrix[i][j - 1] + 1,
                                    matrix[i - 1][j] + 1
                                );
                            }
                        }
                    }
                    return matrix[b.length][a.length];
                };

                let bestCandidate = candidates[0];
                let maxOverlap = -1;

                for (const candidate of candidates) {
                    const candidateTokens = tokenize(candidate);

                    // Count how many term tokens "match" candidate tokens
                    // We allow a match if the token is exact OR if it's very close (levenshtein <= 1 or 2 depending on length)
                    let overlap = 0;

                    for (const tToken of termTokens) {
                        const matchFound = candidateTokens.some(cToken => {
                            if (cToken === tToken) return true;
                            // For short words (len < 4), strict equality. 
                            // For len >= 4, allow distance of 1 (e.g. "sfat" vs "sefat" is dist 1)
                            if (tToken.length >= 4 && cToken.length >= 4) {
                                return levenshtein(tToken, cToken) <= 1;
                            }
                            return false;
                        });
                        if (matchFound) overlap++;
                    }

                    // Prioritize higher overlap
                    if (overlap > maxOverlap) {
                        maxOverlap = overlap;
                        bestCandidate = candidate;
                    } else if (overlap === maxOverlap) {
                        // Tie-breaking: pick closer length match
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
