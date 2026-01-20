import { getSefariaText } from './src/services/sefaria.js';

// Mock fetch for the script context
global.fetch = async (url) => {
    const { default: fetch } = await import('node-fetch');
    return fetch(url);
};

async function testCitations() {
    console.log("Testing Mishnah Pirkei Avot 4:18...");
    try {
        const avot = await getSefariaText("Mishnah Pirkei Avot 4:18");
        console.log("Avot Result:", avot ? {
            hasEn: !!avot.en,
            hasHe: !!avot.he,
            enLength: avot.en ? avot.en.length : 0,
            versions: avot.versions ? avot.versions.length : 0
        } : "Null response");
        if (avot && !avot.en) console.log("Avot English Missing. Versions:", avot.versions.map(v => v.versionTitle));
    } catch (e) { console.error(e); }

    console.log("\nTesting Sanhedrin 90b...");
    try {
        const sanhedrin = await getSefariaText("Sanhedrin 90b");
        console.log("Sanhedrin Result:", sanhedrin ? {
            hasEn: !!avot.en, // Typo in original thought, fixing here 
            itemCount: Array.isArray(sanhedrin.en) ? sanhedrin.en.length : "Not array",
            isString: typeof sanhedrin.en === 'string',
            preview: Array.isArray(sanhedrin.en) ? sanhedrin.en[0].substring(0, 50) : sanhedrin.en.substring(0, 50)
        } : "Null response");
    } catch (e) { console.error(e); }
}

testCitations();
