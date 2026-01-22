
const BASE_URL = "https://www.sefaria.org/api/texts";

async function tryFetch(ref) {
    const url = `${BASE_URL}/${encodeURIComponent(ref)}?context=0`;
    try {
        const res = await fetch(url);
        if (res.ok) {
            console.log(`✅ SUCCESS: "${ref}"`);
            const data = await res.json();
            console.log(`   -> Canonical: ${data.ref}`);
            console.log(`   -> HE snippet: ${data.he ? (Array.isArray(data.he) ? data.he[0] : data.he).toString().substring(0, 50) : 'null'}`);
            return true;
        } else {
            console.log(`❌ FAILED: "${ref}" (${res.status})`);
            // console.log(await res.text());
            return false;
        }
    } catch (e) {
        console.log(`❌ ERROR: "${ref}" - ${e.message}`);
        return false;
    }
}

async function run() {
    console.log("Testing Zohar permutations...");

    // The user's input
    await tryFetch("Zohar 2:94b:1-5");

    // Common Volume/Page formats
    await tryFetch("Zohar 2 94b");
    await tryFetch("Zohar Vol 2 94b");
    await tryFetch("Zohar II 94b");

    // Explicit structure?
    await tryFetch("Sefer HaZohar, 2 94b");

    // Maybe it's totally wrong and needs Parasha?
    // 2:94b is likely Mishpatim or Terumah or similar (Exodus)
    await tryFetch("Zohar, Mishpatim 1");

    // Dot notation?
    await tryFetch("Zohar.2.94b");
}

run();
