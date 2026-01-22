
// Reproduction script for Sefaria API issues
// Mimics the behavior of src/services/sefaria.js

const BASE_URL = "https://www.sefaria.org/api/texts";
const NAME_BASE_URL = "https://www.sefaria.org/api/name";

async function getSefariaText(ref) {
    console.log(`\n--- Fetching: ${ref} ---`);
    const encodedRef = encodeURIComponent(ref);
    const url = `${BASE_URL}/${encodedRef}?context=0`;
    console.log(`Requesting URL: ${url}`);

    try {
        const response = await fetch(url);
        if (!response.ok) {
            console.log(`Status ${response.status}`);
            const text = await response.text();
            console.log("Body:", text);
            return null;
        }
        const data = await response.json();
        console.log("Response Data Keys:", Object.keys(data));
        console.log("Data.he type:", typeof data.he);
        console.log("Data.text type:", typeof data.text);
        if (Array.isArray(data.he)) console.log("Data.he length:", data.he.length);
        if (Array.isArray(data.text)) console.log("Data.text length:", data.text.length);

        console.log("Full Data Sample:", JSON.stringify(data, null, 2).substring(0, 500) + "...");
        return data;
    } catch (e) {
        console.error("Fetch Error:", e);
        return null;
    }
}

async function runTest() {
    await getSefariaText("Zohar 2:94b:1-5");
}

runTest();
