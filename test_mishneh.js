// Mock fetch
global.fetch = async (url) => {
    const { default: fetch } = await import('node-fetch');
    return fetch(url);
};

const BASE_URL = "https://www.sefaria.org/api/texts";

const getSefariaTextByVersion = async (ref, versionTitle) => {
    try {
        const encodedRef = encodeURIComponent(ref);
        const encodedTitle = encodeURIComponent(versionTitle);
        const response = await fetch(`${BASE_URL}/${encodedRef}?context=0&version=en|${encodedTitle}`);
        if (!response.ok) return null;
        const data = await response.json();
        return data.text;
    } catch (error) {
        console.error("Version fetch failed:", error);
        return null;
    }
};

const getSefariaText = async (ref) => {
    try {
        console.log(`Fetching: ${ref}`);
        const encodedRef = encodeURIComponent(ref);
        const url = `${BASE_URL}/${encodedRef}?context=0`;
        console.log(`URL: ${url}`);
        const response = await fetch(url);

        if (!response.ok) {
            console.error(`Error fetching ${ref}: ${response.status} ${response.statusText}`);
            const text = await response.text();
            console.error("Response body:", text);
            return null;
        }

        const data = await response.json();

        console.log("--- RAW DATA SUMMARY ---");
        console.log("Ref:", data.ref);
        console.log("He:", data.he ? (Array.isArray(data.he) ? `Array[${data.he.length}]` : "String") : "Empty/Null");
        console.log("En:", data.text ? (Array.isArray(data.text) ? `Array[${data.text.length}]` : "String") : "Empty/Null");
        console.log("Versions length:", data.versions ? data.versions.length : 0);
        if (data.versions) {
            console.log("English Versions:", data.versions.filter(v => v.language === 'en').map(v => v.versionTitle));
        }

        let hebrewText = data.he;
        let englishText = data.text;

        // Filter for available English versions
        const enVersions = data.versions ? data.versions.filter(v => v.language === 'en') : [];

        // FALLBACK LOGIC COPY
        const isEnglishEmpty = !englishText || (Array.isArray(englishText) && englishText.every(s => !s || !s.trim())) || (typeof englishText === 'string' && !englishText.trim());

        if (isEnglishEmpty && enVersions.length > 0) {
            console.log(`Default text empty for ${ref}. Attempting to find valid English version...`);

            for (const version of enVersions) {
                const candidateTitle = version.versionTitle;
                console.log(`Trying version: ${candidateTitle}`);

                const fallbackText = await getSefariaTextByVersion(ref, candidateTitle);

                const isValidFallback = fallbackText &&
                    ((Array.isArray(fallbackText) && fallbackText.some(s => s && s.trim())) ||
                        (typeof fallbackText === 'string' && fallbackText.trim()));

                if (isValidFallback) {
                    console.log(`Found valid text in version: ${candidateTitle}`);
                    englishText = fallbackText;
                    break;
                } else {
                    console.log(`Version ${candidateTitle} was also empty.`);
                }
            }
        }

        return { he: hebrewText, en: englishText };

    } catch (error) {
        console.error("Exception:", error);
    }
};

getSefariaText("Mishneh Torah, Laws of Murder and Preservation of Life 1:9");
