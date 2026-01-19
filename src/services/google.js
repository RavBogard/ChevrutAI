
const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;
const DISCOVERY_DOC = 'https://docs.googleapis.com/$discovery/rest?version=v1';
const SCOPES = 'https://www.googleapis.com/auth/drive.file';

// Verify scope in console for debugging deployment issues
console.log('Initializing Google Client with scope:', SCOPES);

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

    // 1. Build The Beautiful HTML Content
    let htmlContent = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: 'Arial', sans-serif; font-size: 11pt; color: #000; }
          .title { text-align: center; color: #111827; font-size: 24pt; font-weight: bold; margin-bottom: 20px; }
          .footer { text-align: center; font-size: 10pt; color: #666; margin-top: 30px; border-top: 1px solid #eee; padding-top: 10px; }
          .citation { text-align: center; color: #1d4ed8; font-size: 14pt; font-weight: bold; margin-top: 25px; margin-bottom: 10px; text-decoration: none; }
          table { width: 100%; border-collapse: collapse; margin-bottom: 20px; table-layout: fixed; }
          td { vertical-align: top; padding: 12px; border: 1px solid #e5e7eb; }
          .hebrew { font-family: 'Times New Roman', serif; font-size: 15pt; text-align: right; direction: rtl; line-height: 1.5; width: 50%; }
          .english { font-family: 'Arial', sans-serif; font-size: 11pt; text-align: left; direction: ltr; line-height: 1.5; width: 50%; }
        </style>
      </head>
      <body>
        <div class="title">${sheetTitle || "Chevruta Sheet"}</div>
    `;

    sources.forEach(source => {
        if (source.type === 'header') {
            htmlContent += `<div style="font-size: 18pt; font-weight: bold; margin-top: 30px; margin-bottom: 15px; border-bottom: 2px solid #ccc; padding-bottom: 5px;">${stripHtml(source.english)}</div>`;
        } else if (source.type === 'custom') {
            if (source.title) {
                htmlContent += `<div style="font-size: 14pt; font-weight: bold; margin-top: 20px; margin-bottom: 10px;">${stripHtml(source.title)}</div>`;
            }
            htmlContent += `<div style="font-size: 11pt; margin-bottom: 20px; line-height: 1.5;">${source.english}</div>`; // custom text might have html from editable content
        } else {
            // Default Sefaria Source
            htmlContent += `<div class="citation">${stripHtml(source.citation)}</div>`;

            htmlContent += `
            <table>
              <tr>
                <td class="english">${stripHtml(source.english)}</td>
                <td class="hebrew">${stripHtml(source.hebrew)}</td>
              </tr>
            </table>
            `;
        }
    });

    htmlContent += `
        <div class="footer">Created with Chevruta.AI (chevruta.ai)</div>
      </body>
    </html>
    `;

    // 2. Prepare Multipart Upload for Drive API
    const boundary = '-------314159265358979323846';
    const delimiter = "\r\n--" + boundary + "\r\n";
    const close_delim = "\r\n--" + boundary + "--";

    const metadata = {
        name: sheetTitle || 'Chevruta Source Sheet',
        mimeType: 'application/vnd.google-apps.document'
    };

    const multipartRequestBody =
        delimiter +
        'Content-Type: application/json\r\n\r\n' +
        JSON.stringify(metadata) +
        delimiter +
        'Content-Type: text/html\r\n\r\n' +
        htmlContent +
        close_delim;

    // 3. Send Request to Drive API (upload endpoint)
    const response = await window.gapi.client.request({
        path: '/upload/drive/v3/files',
        method: 'POST',
        params: { uploadType: 'multipart' },
        headers: {
            'Content-Type': 'multipart/related; boundary="' + boundary + '"'
        },
        body: multipartRequestBody
    });

    const documentId = response.result.id;
    return `https://docs.google.com/document/d/${documentId}/edit`;
}
