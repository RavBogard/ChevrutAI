import React from 'react';
import { Link } from 'react-router-dom';

const Changelog = () => {
    return (
        <div className="legal-page">
            <div className="legal-content">
                <Link to="/" className="back-link">← Back to Home</Link>

                <h1>Changelog</h1>
                <p className="legal-subtitle">What's new in Chevruta.AI</p>

                <section className="changelog-section">
                    <h2>Version 1.1.13 <span className="version-date">January 22, 2026</span></h2>
                    <ul>
                        <li><strong>Autosave Robustness</strong> – Improved connection reliability and fixed false "unsaved changes" warnings.</li>
                        <li><strong>Smart Spelling Search</strong> – "Sfat Emet" and other texts with variable spellings now resolve correctly.</li>
                    </ul>
                </section>

                <section className="changelog-section">
                    <h2>Version 1.1.12 <span className="version-date">January 22, 2026</span></h2>
                    <ul>
                        <li><strong>Autosave Fix</strong> – Fixed a bug where new sheets weren't saving immediately to the database.</li>
                        <li><strong>Smarter Text Search</strong> – Improved the logic for finding generic Hasidic texts (like "Tanya") to ensure it picks the specific section you asked for.</li>
                    </ul>
                </section>

                <section className="changelog-section">
                    <h2>Version 1.1.11 <span className="version-date">January 22, 2026</span></h2>
                    <ul>
                        <li><strong>Hasidic Texts Fix</strong> – Improved the text fetching logic to correctly handle complex book titles like Kedushat Levi, Sfat Emet, and Tanya.</li>
                    </ul>
                </section>

                <section className="changelog-section">
                    <h2>Version 1.1.9 <span className="version-date">January 21, 2026</span></h2>
                    <ul>
                        <li><strong>Autosave Fix</strong> – Fixed an issue where new sheets weren't autosaving immediately.</li>
                        <li><strong>Clean Exporter</strong> – Simplified the footer in exported Google Docs.</li>
                    </ul>
                </section>

                <section className="changelog-section">
                    <h2>Version 1.1.8 <span className="version-date">January 21, 2026</span></h2>
                    <ul>
                        <li><strong>Google Docs Formatting</strong> – Text formatting like bold and italics is now preserved when exporting to Google Docs.</li>
                        <li><strong>Export Fonts</strong> – Exports now use the app's signature fonts (Merriweather & Heebo) instead of default Arial.</li>
                    </ul>
                </section>

                <section className="changelog-section">
                    <h2>Version 1.1.7 <span className="version-date">January 21, 2026</span></h2>
                    <ul>
                        <li><strong>Immediate Autosave</strong> – New sheets now save immediately when you add your first content, ensuring your work is always safe.</li>
                    </ul>
                </section>

                <section className="changelog-section">
                    <h2>Version 1.1.6 <span className="version-date">January 20, 2026</span></h2>
                    <ul>
                        <li><strong>Bilingual Highlighting</strong> – Hovering over a paragraph in one language now highlights the corresponding paragraph in the other language.</li>
                    </ul>
                </section>

                <section className="changelog-section">
                    <h2>Version 1.1.5 <span className="version-date">January 20, 2026</span></h2>
                    <ul>
                        <li><strong>Fixed "Add Note" bug</strong> – Resolved an error where adding a note would try to fetch text from Sefaria.</li>
                    </ul>
                </section>

                <section className="changelog-section">
                    <h2>Version 1.1.4 <span className="version-date">January 19, 2026</span></h2>
                    <ul>
                        <li><strong>Clickable version number</strong> – You can now click the version in the footer to see this changelog!</li>
                    </ul>
                </section>

                <section className="changelog-section">
                    <h2>Version 1.1.3 <span className="version-date">January 19, 2026</span></h2>
                    <ul>
                        <li><strong>Fixed shared links</strong> – Sheets shared via link now load correctly for guests and in incognito windows.</li>
                    </ul>
                </section>

                <section className="changelog-section">
                    <h2>Version 1.1.2 <span className="version-date">January 19, 2026</span></h2>
                    <ul>
                        <li><strong>Improved chat input visibility</strong> – The main chat input is now clearly visible in dark mode when focused.</li>
                        <li><strong>Fixed placeholder text clipping</strong> – The "W" in "What would you like to learn about today?" no longer gets cut off.</li>
                    </ul>
                </section>

                <section className="changelog-section">
                    <h2>Version 1.1.1 <span className="version-date">January 19, 2026</span></h2>
                    <ul>
                        <li><strong>Harmonized dark mode toolbar</strong> – The top toolbar now blends seamlessly with the background in night mode.</li>
                    </ul>
                </section>

                <section className="changelog-section">
                    <h2>Version 1.1.0 <span className="version-date">January 18, 2026</span></h2>
                    <ul>
                        <li><strong>Undo/Redo support</strong> – Use the toolbar buttons to undo and redo changes to your source sheet.</li>
                        <li><strong>New Sheet button</strong> – Easily start a fresh source sheet from the sidebar.</li>
                        <li><strong>Google Docs export</strong> – Export your source sheet directly to Google Docs with proper formatting.</li>
                    </ul>
                </section>

                <section className="changelog-section">
                    <h2>Version 1.0.0 <span className="version-date">January 2026</span></h2>
                    <ul>
                        <li><strong>Initial release</strong> – AI-powered source sheet builder with Sefaria integration.</li>
                        <li><strong>Bilingual sources</strong> – View Hebrew and English text side-by-side.</li>
                        <li><strong>Drag and drop</strong> – Reorder sources on your sheet.</li>
                        <li><strong>PDF & DOCX export</strong> – Download your source sheets.</li>
                        <li><strong>Dark mode</strong> – Easy on the eyes for late-night learning.</li>
                    </ul>
                </section>
            </div>
        </div>
    );
};

export default Changelog;
