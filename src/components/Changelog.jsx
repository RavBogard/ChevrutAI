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
                    <h2>Version 1.1.34 <span className="version-date">January 22, 2026</span></h2>
                    <ul>
                        <li><strong>Fixed "Jump" and Header Issues</strong> – Major layout overhaul to prevent the unified header from pushing the sidebar and causing layout shifts.</li>
                        <li><strong>Sidebar Close Button</strong> – Resolved layering (z-index) issues that prevented the close button from working on desktop.</li>
                    </ul>
                </section>

                <section className="changelog-section">
                    <h2>Version 1.1.33 <span className="version-date">January 22, 2026</span></h2>
                    <ul>
                        <li><strong>Fixed Sidebar Close Button</strong> – The "X" button is now fully functional and visible.</li>
                        <li><strong>Layout Solidification</strong> – Forced persistent scrollbars to completely eliminate layout shifting during chat or editing.</li>
                    </ul>
                </section>

                <section className="changelog-section">
                    <h2>Version 1.1.32 <span className="version-date">January 22, 2026</span></h2>
                    <ul>
                        <li><strong>Layout Stability II</strong> – Applied advanced scrollbar stabilization to the chat and sheet views to prevent inner-container shifts.</li>
                    </ul>
                </section>

                <section className="changelog-section">
                    <h2>Version 1.1.31 <span className="version-date">January 22, 2026</span></h2>
                    <ul>
                        <li><strong>Layout Stability</strong> – Fixed the page jump when chat messages appear.</li>
                        <li><strong>Header Polish</strong> – Addressed the logo visibility on the homepage.</li>
                    </ul>
                </section>

                <section className="changelog-section">
                    <h2>Version 1.1.30 <span className="version-date">January 22, 2026</span></h2>
                    <ul>
                        <li><strong>UI Polish</strong> – Fixed layout "jumping" during chat and corrected logo visibility on the homepage.</li>
                    </ul>
                </section>

                <section className="changelog-section">
                    <h2>Version 1.1.29 <span className="version-date">January 22, 2026</span></h2>
                    <ul>
                        <li><strong>Hotfix</strong> – Fixed a crash when using Smart Context with complex Sefaria texts (array handling).</li>
                    </ul>
                </section>

                <section className="changelog-section">
                    <h2>Version 1.1.28 <span className="version-date">January 22, 2026</span></h2>
                    <ul>
                        <li><strong>Smart Context</strong> – The AI now reads the visual structure of your sheet (headers, sections) to give smarter, structurally aware suggestions.</li>
                    </ul>
                </section>

                <section className="changelog-section">
                    <h2>Version 1.1.27 <span className="version-date">January 22, 2026</span></h2>
                    <ul>
                        <li><strong>Build Fix</strong> – Fixed a duplicate variable declaration that caused the build to fail.</li>
                    </ul>
                </section>

                <section className="changelog-section">
                    <h2>Version 1.1.26 <span className="version-date">January 22, 2026</span></h2>
                    <ul>
                        <li><strong>Under the Hood Polish</strong> – Cleaned up internal code structure, unified branding components, and improved performance stability.</li>
                    </ul>
                </section>

                <section className="changelog-section">
                    <h2>Version 1.1.25 <span className="version-date">January 22, 2026</span></h2>
                    <ul>
                        <li><strong>Stable Editor</strong> – Simplified the text editor to prevent edits from reverting. The "hover to highlight" feature has been removed to ensure reliability.</li>
                    </ul>
                </section>

                <section className="changelog-section">
                    <h2>Version 1.1.24 <span className="version-date">January 22, 2026</span></h2>
                    <ul>
                        <li><strong>Crash Recovery</strong> – Fixed an issue where older sheets with specific formatting could cause the app to crash.</li>
                    </ul>
                </section>

                <section className="changelog-section">
                    <h2>Version 1.1.23 <span className="version-date">January 22, 2026</span></h2>
                    <ul>
                        <li><strong>Zohar Smarts</strong> – Updated the AI to strictly use Sefaria-compatible Zohar citations (Parasha-based) instead of causing errors with Volume:Page formats.</li>
                    </ul>
                </section>

                <section className="changelog-section">
                    <h2>Version 1.1.22 <span className="version-date">January 22, 2026</span></h2>
                    <ul>
                        <li><strong>Safe Guest Mode</strong> – Your work is now automatically saved to your browser even if you aren't signed in, preventing data loss if the page reloads.</li>
                    </ul>
                </section>

                <section className="changelog-section">
                    <h2>Version 1.1.21 <span className="version-date">January 22, 2026</span></h2>
                    <ul>
                        <li><strong>Model Configuration</strong> – Restored correct Gemini model configuration (Gemini 3 Flash Preview).</li>
                    </ul>
                </section>

                <section className="changelog-section">
                    <h2>Version 1.1.20 <span className="version-date">January 22, 2026</span></h2>
                    <ul>
                        <li><strong>One-Click Sync</strong> – Added a dedicated "Sync to Google Drive" button in the toolbar for faster updates.</li>
                    </ul>
                </section>

                <section className="changelog-section">
                    <h2>Version 1.1.18 <span className="version-date">January 22, 2026</span></h2>
                    <ul>
                        <li><strong>Google Docs Sync</strong> – After exporting to Google Docs, you can now sync your changes without creating a new document.</li>
                    </ul>
                </section>

                <section className="changelog-section">
                    <h2>Version 1.1.17 <span className="version-date">January 22, 2026</span></h2>
                    <ul>
                        <li><strong>Hasidic Text Citations</strong> – The AI assistant now correctly suggests Sfat Emet and other Hasidic texts with valid section numbers.</li>
                    </ul>
                </section>

                <section className="changelog-section">
                    <h2>Version 1.1.16 <span className="version-date">January 22, 2026</span></h2>
                    <ul>
                        <li><strong>Empty Text Prevention</strong> – Sources with missing text sections are no longer added to your sheet.</li>
                        <li><strong>Firebase Fix</strong> – Resolved data storage errors that caused autosave failures.</li>
                    </ul>
                </section>

                <section className="changelog-section">
                    <h2>Version 1.1.15 <span className="version-date">January 22, 2026</span></h2>
                    <ul>
                        <li><strong>Autosave Hotfix</strong> – Fixed a timing issue in the new autosave system that could cause save failures.</li>
                    </ul>
                </section>

                <section className="changelog-section">
                    <h2>Version 1.1.14 <span className="version-date">January 22, 2026</span></h2>
                    <ul>
                        <li><strong>Major Autosave Overhaul</strong> – Completely rebuilt the saving system to fix persistent autosave failures. Your work is now saved reliably.</li>
                        <li><strong>Saving Indicator</strong> – A visual indicator now appears when your sheet is being saved.</li>
                    </ul>
                </section>

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
