import React, { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import html2pdf from 'html2pdf.js';
import { exportToGoogleDoc } from '../services/google';
import { getSefariaTextByVersion } from '../services/sefaria';
import { exportToDocx } from '../services/docxExport';

const EditableContent = ({ html, className, onChange, dir }) => {
    const [displayHtml, setDisplayHtml] = useState("");

    React.useEffect(() => {
        if (!html) {
            setDisplayHtml("");
            return;
        }
        if (Array.isArray(html)) {
            setDisplayHtml(html.map(c => `<p>${c}</p>`).join(""));
        } else {
            // If it looks like it already has block tags, leave it. Otherwise wrap in P.
            const trimmed = html.trim();
            if (trimmed.startsWith('<p') || trimmed.startsWith('<div') || trimmed.startsWith('<ul') || trimmed.startsWith('<ol')) {
                setDisplayHtml(html);
            } else {
                setDisplayHtml(`<p>${html}</p>`);
            }
        }
    }, [html]);

    const handleBlur = (e) => {
        const val = e.currentTarget.innerHTML;
        if (val !== displayHtml) {
            onChange(val);
        }
    };

    return (
        <div
            className={className}
            dir={dir}
            contentEditable
            suppressContentEditableWarning
            onBlur={handleBlur}
            dangerouslySetInnerHTML={{ __html: displayHtml }}
            style={{ outline: 'none', minHeight: '1em' }}
        />
    );
};

const SourceBlock = ({ source, onRemove, onUpdate, dragHandleProps }) => {
    const [viewMode, setViewMode] = useState('bilingual'); // bilingual, hebrew, english
    const [loadingVersion, setLoadingVersion] = useState(false);

    const handleVersionChange = async (e) => {
        const newTitle = e.target.value;
        if (newTitle === source.versionTitle) return;

        setLoadingVersion(true);
        const newText = await getSefariaTextByVersion(source.ref, newTitle);
        setLoadingVersion(false);

        if (newText) {
            onUpdate({
                en: newText,
                versionTitle: newTitle
            });
        }
    };

    return (
        <div className="source-block">
            <div className="source-header">
                <div className="header-left">
                    {/* Drag Handle */}
                    <div className="drag-handle" {...dragHandleProps} title="Drag to reorder">
                        <svg width="14" height="24" viewBox="0 0 14 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <circle cx="4" cy="4" r="2" fill="#9CA3AF" />
                            <circle cx="4" cy="12" r="2" fill="#9CA3AF" />
                            <circle cx="4" cy="20" r="2" fill="#9CA3AF" />
                            <circle cx="10" cy="4" r="2" fill="#9CA3AF" />
                            <circle cx="10" cy="12" r="2" fill="#9CA3AF" />
                            <circle cx="10" cy="20" r="2" fill="#9CA3AF" />
                        </svg>
                    </div>
                    <h3>{source.ref}</h3>
                </div>

                <div className="source-controls" data-html2canvas-ignore="true">
                    {source.versions && source.versions.length > 1 && (
                        <select
                            className="version-select"
                            value={source.versionTitle || ""}
                            onChange={handleVersionChange}
                            disabled={loadingVersion}
                            style={{ maxWidth: '150px', marginRight: '0.5rem' }}
                        >
                            {!source.versions.find(v => v.versionTitle === source.versionTitle) && source.versionTitle && (
                                <option value={source.versionTitle}>{source.versionTitle}</option>
                            )}
                            {source.versions.map((v, i) => (
                                <option key={i} value={v.versionTitle}>
                                    {v.versionTitle}
                                </option>
                            ))}
                        </select>
                    )}

                    <select
                        value={viewMode}
                        onChange={(e) => setViewMode(e.target.value)}
                        className="view-toggle"
                    >
                        <option value="bilingual">Bilingual</option>
                        <option value="hebrew">Hebrew Only</option>
                        <option value="english">English Only</option>
                    </select>
                    <button className="remove-btn" onClick={onRemove} title="Remove Source">
                        &times;
                    </button>
                </div>
            </div>

            <div className={`source-content view-${viewMode}`}>
                {loadingVersion ? (
                    <div className="loading-text">Loading translation...</div>
                ) : (
                    <>
                        {(viewMode === 'bilingual' || viewMode === 'english') && (
                            <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                                {(!source.en || (Array.isArray(source.en) && source.en.every(s => !s || !s.trim())) || (!Array.isArray(source.en) && !source.en.trim())) ? (
                                    <div className="empty-content-msg">No English text available</div>
                                ) : (
                                    <EditableContent
                                        className="text-eng"
                                        dir="ltr"
                                        html={source.en}
                                        onChange={(val) => onUpdate({ en: val })}
                                    />
                                )}
                                <small className="version-label">{source.versionTitle}</small>
                            </div>
                        )}

                        {(viewMode === 'bilingual' || viewMode === 'hebrew') && (
                            <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                                {(!source.he || (Array.isArray(source.he) && source.he.every(s => !s || !s.trim())) || (!Array.isArray(source.he) && !source.he.trim())) ? (
                                    <div className="empty-content-msg">No Hebrew text available</div>
                                ) : (
                                    <EditableContent
                                        className="text-heb"
                                        dir="rtl"
                                        html={source.he}
                                        onChange={(val) => onUpdate({ he: val })}
                                    />
                                )}
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
    );
};

const SortableSourceItem = ({ source, id, onRemove, onUpdate }) => {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
    } = useSortable({ id: id });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
    };

    return (
        <div ref={setNodeRef} style={style} className="sortable-item">
            <SourceBlock
                source={source}
                onRemove={onRemove}
                onUpdate={onUpdate}
                dragHandleProps={{ ...attributes, ...listeners }}
            />
        </div>
    );
};

const SheetView = ({ sources, onRemoveSource, onUpdateSource, onReorder, darkMode, toggleDarkMode, language, toggleLanguage, onSuggestionClick, sheetTitle, onTitleChange, onSendMessage, chatStarted }) => {
    const sensors = useSensors(
        useSensor(PointerSensor),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    );

    const [inputVal, setInputVal] = useState('');

    // Practical, inspiring prompts - real use cases for rabbis and Jewish educators
    const shuffledPrompts = useMemo(() => {
        const allPromptsEn = [
            // Sermon/Drash Prep
            "I'm giving a drash on Parashat Vayera - help me explore themes of hospitality",
            "Preparing a High Holy Day sermon on making amends - what sources speak to this?",
            "I need texts for a Shabbat teaching on finding hope in difficult times",

            // Lifecycle & Pastoral
            "Assembling readings for a baby naming ceremony celebrating chosen family",
            "Sources to share with someone navigating infertility from a Jewish lens",
            "Preparing a shiva visit - texts on grief, memory, and continuing bonds",
            "Texts for an interfaith wedding that honor both traditions",

            // Education & Youth
            "Creating a confirmation class session on Jewish identity and belonging",
            "Sources for teens exploring what Judaism says about gender and sexuality",
            "Building a Hebrew school lesson on Tikkun Olam and taking action",
            "I need a b'nai mitzvah study sheet on the ethics of speech",

            // Adult Learning
            "Leading a lunch-and-learn on Jewish approaches to anxiety and mental health",
            "Want to teach about abortion access through historical Jewish responsa",
            "Designing a text study on economic justice and fair wages",
            "Preparing a class on disability inclusion - what do our sources teach?",

            // Social Action & Advocacy
            "Our congregation is doing refugee accompaniment - need grounding texts",
            "Speaking at a rally for workers' rights - help me find Jewish sources",
            "Building a source sheet for our racial justice committee",
            "Environmental action Shabbat - texts connecting Judaism and climate"
        ];
        const allPromptsHe = [
            // Sermon/Drash Prep
            "אני מכין דרשה על פרשת וירא - עזור לי לחקור נושאי הכנסת אורחים",
            "מכין דרשה לימים נוראים על תיקון יחסים - אילו מקורות מדברים על זה?",
            "צריך טקסטים להוראת שבת על מציאת תקווה בזמנים קשים",

            // Lifecycle & Pastoral
            "אוסף קריאות לטקס שם לתינוק שחוגג משפחה נבחרת",
            "מקורות לשתף עם מישהו שמתמודד עם אי פוריות מנקודת מבט יהודית",
            "מכין ביקור שבעה - טקסטים על אבל, זיכרון וקשרים מתמשכים",
            "טקסטים לחתונה בין-דתית שמכבדת את שני המסורות",

            // Education & Youth
            "יוצר שיעור לכיתת קבלת קהל על זהות יהודית ושייכות",
            "מקורות לבני נוער שחוקרים מה היהדות אומרת על מגדר ומיניות",
            "בונה שיעור לתלמוד תורה על תיקון עולם ופעולה",
            "צריך דף לימוד לבר/בת מצווה על אתיקה של דיבור",

            // Adult Learning
            "מוביל לימוד צהריים על גישות יהודיות לחרדה ובריאות הנפש",
            "רוצה ללמד על גישה להפלה דרך תשובות יהודיות היסטוריות",
            "מעצב לימוד טקסט על צדק כלכלי ושכר הוגן",
            "מכין שיעור על הכללת אנשים עם מוגבלות - מה המקורות שלנו מלמדים?",

            // Social Action & Advocacy
            "הקהילה שלנו עוסקת בליווי פליטים - צריך טקסטים מבססים",
            "נואם בעצרת לזכויות עובדים - עזור לי למצוא מקורות יהודיים",
            "בונה דף מקורות לוועדת הצדק הגזעי שלנו",
            "שבת פעולה סביבתית - טקסטים שמחברים יהדות ואקלים"
        ];

        const prompts = language === 'he' ? allPromptsHe : allPromptsEn;
        // Shuffle using Fisher-Yates and take 6
        const shuffled = [...prompts];
        for (let i = shuffled.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
        }
        return shuffled.slice(0, 6);
    }, [language]);

    const handleCentralSubmit = (e) => {
        e.preventDefault();
        if (inputVal.trim()) {
            onSendMessage(inputVal);
            setInputVal('');
        }
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleCentralSubmit(e);
        }
    };

    const handleDragEnd = (event) => {
        const { active, over } = event;

        if (active.id !== over.id) {
            const oldIndex = sources.findIndex((item) => item.ref === active.id);
            const newIndex = sources.findIndex((item) => item.ref === over.id);

            if (onReorder) {
                onReorder(arrayMove(sources, oldIndex, newIndex));
            }
        }
    };

    const [isExportingGoogle, setIsExportingGoogle] = useState(false);
    // const [sheetTitle, setSheetTitle] = useState("New Source Sheet"); // Lifted to App.jsx
    const [exportUrl, setExportUrl] = useState(null);
    const [showExportMenu, setShowExportMenu] = useState(false);

    const handleExportGoogle = async () => {
        setIsExportingGoogle(true);
        setExportUrl(null); // Reset previous url
        try {
            const formattedSources = sources.map(s => ({
                citation: s.ref,
                hebrew: Array.isArray(s.he) ? s.he.join('\n') : s.he,
                english: Array.isArray(s.en) ? s.en.join('\n') : s.en
            }));
            const url = await exportToGoogleDoc(sheetTitle, formattedSources);
            setExportUrl(url); // Show link
            // Try to open also, but if blocked, user has link
            window.open(url, '_blank');
        } catch (error) {
            console.error("Discovered Error During Export:", error);
            alert("Export failed. Please check if you enabled pop-ups and configured the Google Cloud Console correctly.");
        } finally {
            setIsExportingGoogle(false);
        }
    };

    const handleExportPDF = () => {
        const element = document.getElementById('sheet-export-area');
        const opt = {
            margin: [0.5, 0.5],
            filename: `${sheetTitle.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.pdf`,
            image: { type: 'jpeg', quality: 0.98 },
            html2canvas: { scale: 2 },
            jsPDF: { unit: 'in', format: 'letter', orientation: 'portrait' }
        };
        html2pdf().set(opt).from(element).save();
    };

    const handleExportDocx = async () => {
        try {
            await exportToDocx(sheetTitle, sources);
        } catch (error) {
            console.error("DocX Export Error:", error);
            alert("Failed to export DocX");
        }
        setShowExportMenu(false);
    };

    return (
        <div className="sheet-view">
            {chatStarted && (
                <header className="sheet-header">
                    <div className="sheet-controls-row">
                        <div className="export-menu-container">
                            <button className="export-main-btn" onClick={() => setShowExportMenu(!showExportMenu)}>
                                Export ▾
                            </button>
                            {showExportMenu && (
                                <div className="export-dropdown">
                                    <button onClick={() => { handleExportGoogle(); setShowExportMenu(false); }} disabled={isExportingGoogle}>
                                        Google Docs
                                    </button>
                                    <button onClick={handleExportDocx}>Word (.docx)</button>
                                    <button onClick={() => { handleExportPDF(); setShowExportMenu(false); }}>PDF</button>
                                </div>
                            )}
                        </div>
                    </div>

                    <input
                        type="text"
                        className="title-input"
                        value={sheetTitle}
                        onChange={(e) => onTitleChange(e.target.value)}
                        placeholder="Untitled Source Sheet"
                    />

                    {exportUrl && (
                        <div className="export-success-msg">
                            <a href={exportUrl} target="_blank" rel="noopener noreferrer" className="open-doc-link">
                                Open in Google Docs ↗
                            </a>
                        </div>
                    )}
                </header>
            )}

            <div className="sheet-paper" id="sheet-export-area">
                {sources.length === 0 ? (
                    <div className="empty-state">
                        {!chatStarted ? (
                            <div className="central-hero">
                                <div className="central-logo-text">
                                    {language === 'he' ? (
                                        <>
                                            <span className="logo-serif logo-hebrew">חברותא</span>
                                            <span className="logo-sans">AI</span>
                                        </>
                                    ) : (
                                        <>
                                            <span className="logo-serif">Chevrut</span>
                                            <span className="logo-sans">AI</span>
                                        </>
                                    )}
                                    <span className="logo-sparkle">
                                        <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="url(#sparkle-gradient-central)" stroke="none">
                                            <defs>
                                                <linearGradient id="sparkle-gradient-central" x1="0%" y1="0%" x2="100%" y2="100%">
                                                    <stop offset="0%" stopColor="#4285F4" />
                                                    <stop offset="50%" stopColor="#9B72CB" />
                                                    <stop offset="100%" stopColor="#D96570" />
                                                </linearGradient>
                                            </defs>
                                            <path d="M12 2L15.09 9.26L22 12L15.09 14.74L12 22L8.91 14.74L2 12L8.91 9.26L12 2Z" />
                                        </svg>
                                    </span>
                                </div>
                                <p>{language === 'he'
                                    ? 'אני שותף הלמידה שלך ליצירת דפי מקורות יהודיים. אני יכול לעזור לך למצוא מקורות, לתרגם טקסטים ולבנות דפים יפהפיים.'
                                    : 'I am your AI partner in creating a Jewish text sheet. I can help you find sources, translate texts, and build beautiful source sheets.'}
                                </p>

                                <div className="central-input-wrapper">
                                    <form onSubmit={handleCentralSubmit}>
                                        <textarea
                                            className="central-textarea"
                                            placeholder={language === 'he' ? 'מה תרצה ללמוד היום?' : 'What would you like to learn about today?'}
                                            value={inputVal}
                                            onChange={(e) => setInputVal(e.target.value)}
                                            onKeyDown={handleKeyDown}
                                            rows={1}
                                            autoFocus
                                            dir={language === 'he' ? 'rtl' : 'ltr'}
                                        />
                                        <button type="submit" className="central-send-btn" disabled={!inputVal.trim()}>
                                            <svg xmlns="http://www.w3.org/2000/svg" height="24" viewBox="0 -960 960 960" width="24" fill="currentColor"><path d="M120-160v-640l760 320-760 320Zm80-120 474-200-474-200v140l240 60-240 60v140Zm0 0v-400 400Z" /></svg>
                                        </button>
                                    </form>
                                </div>
                                <div className="empty-prompts-grid">
                                    {shuffledPrompts.map((prompt, i) => (
                                        <button
                                            key={i}
                                            className="prompt-card"
                                            onClick={() => onSuggestionClick && onSuggestionClick(prompt)}
                                        >
                                            {prompt}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        ) : (
                            <div className="central-hero">
                                <h2>Build your sheet</h2>
                                <p>Use the chat on the left to find and add sources.</p>
                            </div>
                        )}
                    </div>
                ) : (
                    <DndContext
                        sensors={sensors}
                        collisionDetection={closestCenter}
                        onDragEnd={handleDragEnd}
                    >
                        <SortableContext
                            items={sources.map(s => s.ref)}
                            strategy={verticalListSortingStrategy}
                        >
                            {sources.map((source, index) => (
                                <SortableSourceItem
                                    key={source.ref} // Assuming Ref is unique. If duplicates allowed, need uuid.
                                    id={source.ref}
                                    source={source}
                                    onRemove={() => onRemoveSource(index)}
                                    onUpdate={(newData) => onUpdateSource(index, newData)}
                                />
                            ))}
                        </SortableContext>
                    </DndContext>
                )}
            </div>

            <footer className="sheet-footer">
                <p className="footer-attribution">
                    A Project of <strong>Rabbi Daniel Bogard</strong>
                </p>
                <div className="footer-powered">
                    <a href="https://www.sefaria.org" target="_blank" rel="noopener noreferrer">Powered by Sefaria</a>
                    <span className="version-tag"> • v0.9.13</span>
                </div>
                <div className="footer-legal">
                    <a href="/privacy.html">Privacy Policy</a> • <Link to="/terms">Terms of Service</Link>
                </div>
            </footer>
        </div >
    );
};

export default SheetView;
