import React from 'react';

const Privacy = () => {
    return (
        <div style={{ padding: '2rem', maxWidth: '800px', margin: '0 auto', color: '#333', lineHeight: '1.6' }}>
            <h1>Privacy Policy</h1>
            <p>Last Updated: {new Date().toLocaleDateString()}</p>

            <h2>1. Information We Collect</h2>
            <p>Chevruta.AI ("we", "us") does not collect, store, or share any personal user data on our servers. All data processing happens locally on your device or via direct calls to third-party APIs (Google, Sefaria).</p>

            <h2>2. Google User Data</h2>
            <p>Our application uses Google OAuth to allow you to export your source sheets directly to your personal Google Drive.</p>
            <ul>
                <li><strong>Access:</strong> We request access to your Google Docs and Drive solely to create new documents on your behalf.</li>
                <li><strong>Storage:</strong> We do not store your Google credentials or your document data.</li>
                <li><strong>Sharing:</strong> We do not share your Google user data with any third parties or other users.</li>
            </ul>

            <h2>3. AI Processing</h2>
            <p>Your chat inputs are sent to Google's Gemini API for processing. Please review Google's relevant privacy policies regarding their AI models.</p>

            <h2>4. Contact</h2>
            <p>If you have any questions, please contact us via our GitHub repository.</p>
        </div>
    );
};

export default Privacy;
