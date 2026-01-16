
const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;
const API_KEY = ""; // Not strictly needed if using access token, but good for discovery. We'll use Token model.
const DISCOVERY_DOC = 'https://docs.googleapis.com/$discovery/rest?version=v1';
const SCOPES = 'https://www.googleapis.com/auth/drive.file';

let tokenClient;
let gapiInited = false;
let gisInited = false;

export async function initGoogleClient() {
    return new Promise((resolve, reject) => {
        // Load GAPI
        if (!window.gapi) {
            const script = document.createElement('script');
            script.src = 'https://apis.google.com/js/api.js';
            script.onload = () => {
                window.gapi.load('client', async () => {
                    await window.gapi.client.init({
                        discoveryDocs: [DISCOVERY_DOC],
                    });
                    gapiInited = true;
                    if (gisInited) resolve();
                });
            };
            script.onerror = reject;
            document.body.appendChild(script);
        } else {
            gapiInited = true;
        }

        // Load GIS
        if (!window.google) {
            const script = document.createElement('script');
            script.src = 'https://accounts.google.com/gsi/client';
            script.onload = () => {
                tokenClient = window.google.accounts.oauth2.initTokenClient({
                    client_id: CLIENT_ID,
                    scope: SCOPES,
                    callback: '', // defined at request time
                });
                gisInited = true;
                if (gapiInited) resolve();
            };
            script.onerror = reject;
            document.body.appendChild(script);
        } else {
            gisInited = true;
        }

        // Check if already ready (if called multiple times)
        if (window.gapi && window.google && !tokenClient) {
            tokenClient = window.google.accounts.oauth2.initTokenClient({
                client_id: CLIENT_ID,
                scope: SCOPES,
                callback: '',
            });
            resolve();
        }
    });
}

function getToken() {
    return new Promise((resolve, reject) => {
        tokenClient.callback = async (resp) => {
            if (resp.error !== undefined) {
                reject(resp);
            }
            resolve(resp);
        };
        tokenClient.requestAccessToken({ prompt: 'consent' });
    });
}

export async function exportToGoogleDoc(sheetTitle, sources) {
    if (!gapiInited || !gisInited) {
        await initGoogleClient();
    }

    // Request Access
    await getToken();

    // 1. Create the Document
    const createResponse = await window.gapi.client.docs.documents.create({
        title: sheetTitle || 'Chevruta Source Sheet'
    });
    const documentId = createResponse.result.documentId;

    // 2. Build the Requests for Content using BatchUpdate
    // We strictly use Index 1 for inserting at start, but to keep order we must insert in Reverse Order 
    // OR track the index carefully.
    // Easier strategy: Append to end. But the API "insertText" takes an index. 
    // The doc starts with 1 character (index 1).
    // We will append everything.

    // Actually, "end of segment" is safer if we just want to stream text in.
    // But let's try to be precise.

    const requests = [];
    let currentIndex = 1;

    // Title styling
    requests.push({
        insertText: {
            text: (sheetTitle || 'Generated Source Sheet') + '\n\n',
            location: { index: currentIndex }
        }
    });
    requests.push({
        updateParagraphStyle: {
            range: { startIndex: 1, endIndex: (sheetTitle || 'Generated Source Sheet').length + 1 },
            paragraphStyle: { namedStyleType: 'TITLE' },
            fields: 'namedStyleType'
        }
    });

    // We increment index mentally? No, confusing.
    // Best practice: Send "EndOfSegmentLocation" inserts or manage index carefully.
    // BUT! Since we are sending a BATCH, we must calculate indices assuming previous requests succeeded.
    // This is hard with variable lengths.
    // ALTERNATIVE: Do 1 request to create doc. Then fetch it? No.
    // ALTERNATIVE: Construct the *entire* text body locally, insert it all at once at index 1, 
    // and THEN apply styling ranges based on the string lengths we just calculated.

    let fullText = "";
    const styleRanges = []; // { start, end, style, type }

    // Start with Title
    const finalTitle = (sheetTitle || "Chevruta Sheet");
    fullText += finalTitle + "\n\n";
    styleRanges.push({ start: 0, end: finalTitle.length, type: 'TITLE', align: 'CENTER' });

    sources.forEach(source => {
        // We will do a generic "Heading" for citation, then Hebrew, then English.
        // Side-by-side relies on Tables, which are complex to construct in API (need InsertTable, then InsertText into Cells).
        // Let's stick to SEQUENTIAL for V1 to ensure reliability.
        // Citation
        const startCit = fullText.length;
        fullText += source.citation + "\n";
        styleRanges.push({ start: startCit, end: fullText.length, type: 'HEADING_2', align: 'CENTER' });

        // Hebrew
        const startHeb = fullText.length;
        fullText += source.hebrew + "\n";
        styleRanges.push({ start: startHeb, end: fullText.length, type: 'NORMAL_TEXT', align: 'RIGHT', isHebrew: true });

        // English
        const startEng = fullText.length;
        fullText += source.english + "\n\n";
        styleRanges.push({ start: startEng, end: fullText.length, type: 'NORMAL_TEXT', align: 'LEFT' });
    });

    // Request 1: Insert all text
    requests.push({
        insertText: {
            text: fullText,
            location: { index: 1 }
        }
    });

    // Request 2+: Apply styles
    // Note: The API indices shift if we insert text. But since we inserted ALL text at index 1,
    // the indices in `fullText` map directly to `1 + index`.
    styleRanges.forEach(range => {
        // Paragraph Style (Alignment, Heading type)
        requests.push({
            updateParagraphStyle: {
                range: {
                    startIndex: 1 + range.start,
                    endIndex: 1 + range.end
                },
                paragraphStyle: {
                    namedStyleType: range.type || 'NORMAL_TEXT',
                    alignment: range.align || 'START',
                    direction: range.isHebrew ? 'RIGHT_TO_LEFT' : 'LEFT_TO_RIGHT'
                },
                fields: 'namedStyleType,alignment,direction'
            }
        });

        // Text Style (Font size/family if we wanted, but named styles are safer)
    });

    await window.gapi.client.docs.documents.batchUpdate({
        documentId: documentId,
        resource: { requests: requests.reverse() } // WAIT. If we reverse, indices mess up? 
        // No, we are inserting ONE big block. The styling ranges apply to that block. 
        // Actually, we can just send "requests". They execute in order. 
        // Since the first request inserts ALL text, the subsequent styling requests work on existing text.
    });

    // Correct logic:
    // Request 0: Insert Text "Title\nCit\nHeb\nEng..." at Index 1.
    // Request 1: Style Title (Range 1 to 1+len)
    // Request 2: Style Cit...

    // However, `requests` for batchUpdate are executed atomically? Yes.
    // So we don't need to reverse.

    // Re-doing the requests array to be safe:
    const finalRequests = [];
    finalRequests.push({
        insertText: {
            text: fullText,
            location: { index: 1 }
        }
    });

    styleRanges.forEach(range => {
        finalRequests.push({
            updateParagraphStyle: {
                range: {
                    startIndex: 1 + range.start,
                    endIndex: 1 + range.end
                },
                paragraphStyle: {
                    namedStyleType: range.type,
                    alignment: range.align,
                    direction: range.isHebrew ? 'RIGHT_TO_LEFT' : 'LEFT_TO_RIGHT'
                },
                fields: 'namedStyleType,alignment,direction'
            }
        });
    });

    await window.gapi.client.docs.documents.batchUpdate({
        documentId: documentId,
        resource: { requests: finalRequests }
    });

    return `https://docs.google.com/document/d/${documentId}/edit`;
}
