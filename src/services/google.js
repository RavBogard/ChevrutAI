
const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;
const API_KEY = ""; // Not strictly needed if using access token, but good for discovery. We'll use Token model.
const DISCOVERY_DOC = 'https://docs.googleapis.com/$discovery/rest?version=v1';
const SCOPES = 'https://www.googleapis.com/auth/documents https://www.googleapis.com/auth/drive.file';

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

    // 2. Build the Content
    let fullText = (sheetTitle || "Chevruta Sheet") + "\n\n";

    sources.forEach(source => {
        fullText += source.citation + "\n";
        fullText += source.hebrew + "\n";
        fullText += source.english + "\n";
        fullText += "------------------------------------------------\n\n";
    });

    fullText += "Created with ChevrutaAI (chevrutai.org)";

    // 3. Insert Text (Simple)
    const requests = [
        {
            insertText: {
                text: fullText,
                location: { index: 1 }
            }
        }
    ];

    await window.gapi.client.docs.documents.batchUpdate({
        documentId: documentId,
        resource: { requests: requests }
    });

    return `https://docs.google.com/document/d/${documentId}/edit`;
}
