
const fetchText = async (ref) => {
    const encodedRef = encodeURIComponent(ref);
    const url = `https://www.sefaria.org/api/texts/${encodedRef}?context=0`;
    console.log(`Fetching ${url}...`);
    try {
        const res = await fetch(url);
        if (!res.ok) {
            console.log(`Error: ${res.status}`);
            return;
        }
        const data = await res.json();
        console.log(`Ref: ${data.ref}`);
        console.log(`Hebrew Type: ${Array.isArray(data.he) ? 'Array' : typeof data.he}, Length: ${data.he ? data.he.length : 'NULL'}`);
        console.log(`English Type: ${Array.isArray(data.text) ? 'Array' : typeof data.text}, Length: ${data.text ? data.text.length : 'NULL'}`);
        // console.log(`Hebrew Sample:`, JSON.stringify(data.he).substring(0, 100)); // Comment out to avoid clutter/garble
        // console.log(`English Sample:`, JSON.stringify(data.text).substring(0, 100));

        if (Array.isArray(data.text) && data.text.every(s => s === "")) {
            console.log("English Array contains only empty strings!");
        }

        console.log(`Versions:`, data.versions ? data.versions.length : 0);
        if (data.versions && data.versions.length > 0) {
            console.log(`First Version:`, data.versions[0].versionTitle, data.versions[0].language);
            console.log(`First Version Text Sample:`, data.versions[0].text ? data.versions[0].text.substring(0, 50) : "NULL");
        }
    } catch (e) {
        console.error(e);
    }
};

(async () => {
    await fetchText("Yevamot 64b");
})();
