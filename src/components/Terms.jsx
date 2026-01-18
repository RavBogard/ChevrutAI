import React from 'react';

const Terms = () => {
    return (
        <div style={{ padding: '2rem', maxWidth: '800px', margin: '0 auto', color: '#333', lineHeight: '1.6' }}>
            <h1>Terms of Service</h1>
            <p>Last Updated: {new Date().toLocaleDateString()}</p>

            <h2>1. Acceptance of Terms</h2>
            <p>By using Chevruta.AI, you agree to these Terms of Service. If you do not agree, please do not use the application.</p>

            <h2>2. Use License</h2>
            <p>Chevruta.AI is an open-source tool. You may use it for personal and educational purposes.</p>

            <h2>3. Disclaimer</h2>
            <p>The materials on Chevruta.AI are provided on an 'as is' basis. We make no warranties, expressed or implied, regarding the accuracy of the AI-generated content or the availability of the service.</p>

            <h2>4. Third-Party Services</h2>
            <p>This application integrates with third-party services (Sefaria, Google). We do not control and are not responsible for the content or availability of these services.</p>
        </div>
    );
};

export default Terms;
