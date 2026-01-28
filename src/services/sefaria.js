const BASE_URL = "https://www.sefaria.org/api/texts";
const NAME_BASE_URL = "https://www.sefaria.org/api/name";

/**
 * Recursively flattens and joins text arrays into a single string.
 * Handles Sefaria's complex nested array structure.
 * @param {string|Array} text 
 * @returns {string}
 */
const normalizeText = (text) => {
    if (!text) return "";
    if (typeof text === 'string') return text;
    if (Array.isArray(text)) {
        return text.map(normalizeText).join(" ").trim();
    }
    return String(text);
};

/**
 * Tries to resolve a fuzzy or incorrect ref to a canonical Sefaria Ref using the Name API.
 * @param {string} ref 
 * @returns {Promise<string|null>} The corrected ref or null
 */
const resolveSefariaRef = async (ref) => {
    try {
        // CLEANUP: Handle usage of "on" which implies commentary (e.g. "Rashi on Genesis")
        // The API often prefers "Rashi on Genesis" or "Rashi, Genesis"
        // But for "Kosef Mishneh on..." -> "Kesef Mishneh on..."

        let term = ref;
        // Strip citation numbers to get the book/author name
        const numberMatch = ref.match(/(\s+\d+[.:]?.*)$/);
        let citation = "";

        if (numberMatch) {
            term = ref.substring(0, numberMatch.index).trim();
            citation = numberMatch[1];
        } else {
            term = ref.trim();
        }

        const encoded = encodeURIComponent(term);
        // Increase limit to catch typos better
        const response = await fetch(`${NAME_BASE_URL}/${encoded}?limit=20`);
        if (!response.ok) return null;

        const data = await response.json();

        if (data.completion_objects && data.completion_objects.length > 0) {
            const candidates = data.completion_objects
                .filter(obj => obj.type === 'ref' || obj.type === 'Index')
                .map(obj => obj.key);

            if (candidates.length > 0) {
                // Heuristic: Find the "Best Match"
                const tokenize = (str) => str.toLowerCase().replace(/[^a-z0-9\s]/g, '').split(/\s+/).filter(Boolean);
                const termTokens = tokenize(term);

                // Simple Levenshtein distance
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
                    let overlap = 0;

                    for (const tToken of termTokens) {
                        const matchFound = candidateTokens.some(cToken => {
                            if (cToken === tToken) return true;
                            // Allow fuzzy token match
                            if (tToken.length >= 3 && cToken.length >= 3) {
                                const dist = levenshtein(tToken, cToken);
                                return dist <= 2; // Allow 2 edits for longer words
                            }
                            return false;
                        });
                        if (matchFound) overlap++;
                    }

                    // CRITICAL: If input has "on", we MUST prioritize candidates with "on"
                    // "Kosef Mishneh on..." vs "Mishneh Torah..."
                    const termHasOn = term.includes(" on ");
                    const candHasOn = candidate.includes(" on ");

                    if (termHasOn && candHasOn) {
                        overlap += 3; // Huge bonus for matching structure
                    } else if (termHasOn && !candHasOn) {
                        overlap -= 2; // Penalty for losing the commentary aspect
                    }

                    if (overlap > maxOverlap) {
                        maxOverlap = overlap;
                        bestCandidate = candidate;
                    } else if (overlap === maxOverlap) {
                        // Tie-breaker: closer length
                        if (Math.abs(candidate.length - term.length) < Math.abs(bestCandidate.length - term.length)) {
                            bestCandidate = candidate;
                        }
                    }
                }

                // Check if our "best" candidate is actually reasonably close. 
                // If the overlap is 0 and terms are different, it might be a bad guess.
                if (maxOverlap === 0 && termTokens.length > 0) {
                    // Last ditch: check direct substring inclusion
                    const lowerCand = bestCandidate.toLowerCase();
                    const lowerTerm = term.toLowerCase();
                    if (!lowerCand.includes(lowerTerm) && !lowerTerm.includes(lowerCand)) {
                        return null; // Don't guess wildly
                    }
                }

                if (bestCandidate) {
                    return `${bestCandidate}${citation}`;
                }
            }
        }

        // FALLBACK: If we have commas, try searching just the first part
        // e.g. "Radbaz on Mishneh Torah, Gifts to the Poor" -> Search "Radbaz on Mishneh Torah"
        // Then append the rest of the original ref
        if (term.includes(',')) {
            const parts = term.split(',');
            const baseTerm = parts[0].trim();
            // Ensure we aren't infinite looping or searching empty
            if (baseTerm && baseTerm !== term && baseTerm.length > 5) {
                // Try resolving just the base
                const resolvedBase = await resolveSefariaRef(baseTerm);
                if (resolvedBase) {
                    // Re-attach the rest: ", Gifts to the Poor" + citation
                    // Careful: resolvedBase might have its own numbers or suffix
                    const rest = term.substring(baseTerm.length) + citation;
                    return `${resolvedBase}${rest}`;
                }
            }
        }

        return null;
    } catch (e) {
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
        const response = await fetch(`${BASE_URL}/${encodedRef}?context=0&version=en|${encodedTitle}`);

        if (!response.ok) return null;

        const data = await response.json();
        return normalizeText(data.text);
    } catch (error) {
        return null;
    }
};

export const searchSefariaText = async (query, book = null) => {
    try {
        const encodedQuery = encodeURIComponent(query);
        // Updated to use the working search endpoint
        let url = `https://www.sefaria.org/api/search/text/_search?q=${encodedQuery}`;

        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                from: 0,
                size: 5,
                query: {
                    match: { "exact": query }
                }
            })
        });

        if (!response.ok) {
            console.error("Search API returned status:", response.status);
            return [];
        }

        const data = await response.json();
        if (!data.hits || !data.hits.hits) return [];

        return data.hits.hits.map(hit => ({
            ref: hit._source.ref,
            he: hit._source.heRef, // Sefaria uses heRef for the Hebrew title/reference
            en: hit._source.exact // 'exact' contains the text snippet in the new API
        })).filter(hit => hit.ref);

    } catch (e) {
        console.error("Search API Error:", e);
        return [];
    }
};

/**
 * Fetches text from Sefaria API.
 * 
 * Includes:
 * - Retry logic
 * - Fuzzy reference resolution
 * - Data normalization (flattening nested arrays)
 * 
 * @param {string} ref 
 * @returns {Promise<object|null>}
 */
export const getSefariaText = async (ref) => {
    try {
        const fetchRef = async (citationRef) => {
            const encodedRef = encodeURIComponent(citationRef);
            // Simple retry logic
            let retries = 2;
            let lastError = null;

            while (retries >= 0) {
                try {
                    const response = await fetch(`${BASE_URL}/${encodedRef}?context=0`);
                    if (response.ok) return await response.json();
                    if (response.status === 404) return { error: "Not found", status: 404 }; // Don't retry 404s
                    if (response.status === 400) {
                        const errText = await response.text();
                        // Sefaria sometimes returns useful error text in 400
                        try {
                            const jsonErr = JSON.parse(errText);
                            return { error: jsonErr.error || "Bad Request", status: 400 };
                        } catch {
                            return { error: errText || "Bad Request", status: 400 };
                        }
                    }
                } catch (e) {
                    lastError = e;
                    if (retries === 0) throw e;
                }
                retries--;
                await new Promise(r => setTimeout(r, 500)); // Backoff
            }
            return null;
        };

        let data = await fetchRef(ref);

        // Recovery: Try Name API if direct fetch failed
        if (!data || data.error) {
            const resolvedRef = await resolveSefariaRef(ref);
            if (resolvedRef && resolvedRef !== ref) {
                data = await fetchRef(resolvedRef);
            }
        }

        if (!data || data.error) {
            // Return the error object to let the UI know WHY it failed
            return {
                error: (data && data.error) ? data.error : "Fetch failed",
                failedRef: ref
            };
        }

        // CRITICAL FIX: Normalize text data to ensure it's always a string
        let hebrewText = normalizeText(data.he);
        let englishText = normalizeText(data.text);

        let versionTitle = data.versionTitle;
        let canonicalRef = data.ref || ref;

        // Fallback for missing English
        const enVersions = data.versions ? data.versions.filter(v => v.language === 'en') : [];
        if (!englishText && enVersions.length > 0) {
            for (const version of enVersions) {
                const candidateTitle = version.versionTitle;
                const fallbackText = await getSefariaTextByVersion(canonicalRef, candidateTitle);

                if (fallbackText) {
                    englishText = fallbackText;
                    versionTitle = candidateTitle;
                    break;
                }
            }
        }

        return {
            ref: canonicalRef,
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
        return { error: "Exception", details: error.message };
    }
};
