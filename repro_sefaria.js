
// Reproduction script for Sefaria API issues
// Mimics the behavior of src/services/sefaria.js

const BASE_URL = "https://www.sefaria.org/api/texts";
const NAME_BASE_URL = "https://www.sefaria.org/api/name";

async function resolveSefariaRef(ref) {
    try {
        let term = ref;
        const numberMatch = ref.match(/(\s+\d+[.:]?.*)$/);

        if (numberMatch) {
            term = ref.substring(0, numberMatch.index).trim();
        } else {
            term = ref.trim();
        }

        const encoded = encodeURIComponent(term);
        console.log(`Searching name for: "${term}"`);
        const response = await fetch(`${NAME_BASE_URL}/${encoded}?limit=5`);
        if (!response.ok) return null;

        const data = await response.json();
        console.log("Name API candidates:", data.completion_objects?.map(o => o.key));

        // ... (Simulating the complex Levenshtein logic roughly by just picking the first if exists)
        if (data.completion_objects && data.completion_objects.length > 0) {
            const best = data.completion_objects[0].key;
            if (numberMatch) return `${best}${numberMatch[1]}`;
            return best;
        }
        return null;
    } catch (e) {
        console.error("Resolve Error:", e);
        return null;
    }
}

async function getSefariaText(ref) {
    console.log(`\n--- Fetching: ${ref} ---`);
    const fetchRef = async (citationRef) => {
        const encodedRef = encodeURIComponent(citationRef);
        console.log(`Requesting URL: ${BASE_URL}/${encodedRef}?context=0`);
        const response = await fetch(`${BASE_URL}/${encodedRef}?context=0`);
        if (!response.ok) {
            console.log(`Status ${response.status}`);
            return null;
        }
        return await response.json();
    };

    let data = await fetchRef(ref);

    if (!data || data.error) {
        console.log("Direct fetch failed or returned error:", data?.error);
        const resolvedRef = await resolveSefariaRef(ref);
        console.log("Resolved Ref:", resolvedRef);
        if (resolvedRef && resolvedRef !== ref) {
            data = await fetchRef(resolvedRef);
        }
    }

    if (!data || data.error) {
        console.log("Still failed.");
        return null; // The service returns null here!
    }

    return {
        ref: data.ref,
        he: data.he,
        en: data.text,
        isHeNull: !data.he,
        isEnNull: !data.text
    };
}

async function runTest() {
    // Test cases from the user
    await getSefariaText("Kosef Mishneh on Mishneh Torah, Gifts to the Poor 7:3");
    await getSefariaText("Radbaz on Mishneh Torah, Gifts to the Poor 7:3");

    // Test a known good one
    await getSefariaText("Genesis 1:1");
}

runTest();
