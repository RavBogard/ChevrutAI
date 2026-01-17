
const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;
const API_KEY = "";
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

// Helper to strip HTML tags
function stripHtml(html) {
    if (!html) return "";
    return html.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ');
}

export async function exportToGoogleDoc(sheetTitle, sources) {
    if (!gapiInited || !gisInited) {
        await initGoogleClient();
    }

    await getToken();

    // 1. Create Doc
    const createResponse = await window.gapi.client.docs.documents.create({
        title: sheetTitle || 'Chevruta Source Sheet'
    });
    const documentId = createResponse.result.documentId;
    const documentUrl = `https://docs.google.com/document/d/${documentId}/edit`;

    // 2. Build Requests
    // We maintain 'currentIndex' which represents the end of the document.
    // Initial Doc (empty) has 2 chars: index 1 (start) to index 2 (end).

    let currentIndex = 1;
    const requests = [];

    // --- Title ---
    const titleText = (sheetTitle || "Chevruta Sheet") + "\n\n";
    requests.push({
        insertText: {
            text: titleText,
            location: { index: currentIndex }
        }
    });

    // Style Title
    requests.push({
        updateParagraphStyle: {
            range: { startIndex: currentIndex, endIndex: currentIndex + titleText.length },
            paragraphStyle: { namedStyleType: 'TITLE', alignment: 'CENTER' },
            fields: 'namedStyleType,alignment'
        }
    });
    currentIndex += titleText.length;

    // --- Sources Loop ---
    for (const source of sources) {
        // A. Citation Header
        const citation = stripHtml(source.citation) + "\n";
        requests.push({
            insertText: {
                text: citation,
                location: { index: currentIndex }
            }
        });

        requests.push({
            updateParagraphStyle: {
                range: { startIndex: currentIndex, endIndex: currentIndex + citation.length },
                paragraphStyle: { namedStyleType: 'HEADING_2', alignment: 'CENTER' },
                fields: 'namedStyleType,alignment'
            }
        });
        requests.push({
            updateTextStyle: {
                range: { startIndex: currentIndex, endIndex: currentIndex + citation.length },
                textStyle: { foregroundColor: { color: { rgbColor: { red: 0.23, green: 0.51, blue: 0.96 } } } },
                fields: 'foregroundColor'
            }
        });

        currentIndex += citation.length;

        // B. Table (1 Row, 2 Cols)
        requests.push({
            insertTable: {
                rows: 1,
                columns: 2,
                location: { index: currentIndex }
            }
        });

        // C. Calculate Cell Indices
        // Table Start = T
        // Left Cell Start = T + 4

        const tableStartIndex = currentIndex;

        // English (Left Cell)
        const english = stripHtml(source.english);
        const engStartIndex = tableStartIndex + 4;

        if (english) {
            requests.push({
                insertText: {
                    text: english,
                    location: { index: engStartIndex }
                }
            });

            // Style English
            requests.push({
                updateParagraphStyle: {
                    range: { startIndex: engStartIndex, endIndex: engStartIndex + english.length },
                    paragraphStyle: { namedStyleType: 'NORMAL_TEXT', alignment: 'START', direction: 'LEFT_TO_RIGHT' },
                    fields: 'namedStyleType,alignment,direction'
                }
            });
        }

        // Hebrew (Right Cell)
        // Offset Logic: Start(4) + EnglishLen + 2
        const hebStartIndex = engStartIndex + english.length + 2;
        const hebrew = stripHtml(source.hebrew);

        if (hebrew) {
            requests.push({
                insertText: {
                    text: hebrew,
                    location: { index: hebStartIndex }
                }
            });

            // Style Hebrew
            requests.push({
                updateParagraphStyle: {
                    range: { startIndex: hebStartIndex, endIndex: hebStartIndex + hebrew.length },
                    paragraphStyle: { namedStyleType: 'NORMAL_TEXT', alignment: 'END', direction: 'RIGHT_TO_LEFT' },
                    fields: 'namedStyleType,alignment,direction'
                }
            });
            requests.push({
                updateTextStyle: {
                    range: { startIndex: hebStartIndex, endIndex: hebStartIndex + hebrew.length },
                    textStyle: { fontSize: { magnitude: 12, unit: 'PT' }, weightedFontFamily: { fontFamily: 'Times New Roman' } },
                    fields: 'fontSize,weightedFontFamily'
                }
            });
        }

        // D. Advance Index
        // Table overhead ~10 chars + content
        currentIndex += 10 + english.length + hebrew.length;

        // E. Add Spacing After Table
        requests.push({
            insertText: {
                text: "\n",
                location: { index: currentIndex }
            }
        });
        currentIndex += 1;
    }

    // --- Footer ---
    const footer = "\nCreated with ChevrutaAI (chevrutai.org)";
    requests.push({
        insertText: {
            text: footer,
            location: { index: currentIndex }
        }
    });

    requests.push({
        updateParagraphStyle: {
            range: { startIndex: currentIndex + 1, endIndex: currentIndex + footer.length },
            paragraphStyle: { alignment: 'CENTER', namedStyleType: 'SUBTITLE' },
            fields: 'alignment,namedStyleType'
        }
    });

    await window.gapi.client.docs.documents.batchUpdate({
        documentId: documentId,
        resource: { requests: requests }
    });

    return documentUrl;
}
