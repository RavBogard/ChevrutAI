// Mock fetch
global.fetch = async (url) => {
    const { default: fetch } = await import('node-fetch');
    return fetch(url);
};

const BASE_URL = "https://www.sefaria.org/api/name";

async function testNameResolution(term) {
    console.log(`\nTesting Name Resolution for: "${term}"`);
    try {
        const encoded = encodeURIComponent(term);
        const url = `${BASE_URL}/${encoded}?limit=10`;
        const response = await fetch(url);

        if (!response.ok) {
            console.error(`Error: ${response.status}`);
            return;
        }

        const data = await response.json();
        console.log("Is Array?", Array.isArray(data));
        console.log("Results (completion_objects):", JSON.stringify(data.completion_objects, null, 2));

        // Check for exact matches or high similarity
        if (data.is_ref) {
            console.log("Direct Ref confirmed:", data.ref);
        }
    } catch (e) {
        console.error("Exception:", e);
    }
}

async function run() {
    await testNameResolution("Even Bochan");
    await testNameResolution("Mishneh Torah, Laws of Murder");
    await testNameResolution("Pirkei Avot");
}

run();
