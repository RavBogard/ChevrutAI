import React, { useState } from 'react';
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
                                <EditableContent
                                    className="text-eng"
                                    dir="ltr"
                                    html={source.en}
                                    onChange={(val) => onUpdate({ en: val })}
                                />
                                <small className="version-label">{source.versionTitle}</small>
                            </div>
                        )}

                        {(viewMode === 'bilingual' || viewMode === 'hebrew') && (
                            <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                                <EditableContent
                                    className="text-heb"
                                    dir="rtl"
                                    html={source.he}
                                    onChange={(val) => onUpdate({ he: val })}
                                />
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

const SheetView = ({ sources, onRemoveSource, onUpdateSource, onReorder, darkMode, toggleDarkMode, onSuggestionClick, sheetTitle, onTitleChange, onSendMessage, chatStarted }) => {
    const sensors = useSensors(
        useSensor(PointerSensor),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    );

    const [inputVal, setInputVal] = useState('');

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
                    <input
                        type="text"
                        className="title-input"
                        value={sheetTitle}
                        onChange={(e) => onTitleChange(e.target.value)}
                    />

                    {exportUrl && (
                        <div className="export-success-msg">
                            <a href={exportUrl} target="_blank" rel="noopener noreferrer" className="open-doc-link">
                                Open in Google Docs ↗
                            </a>
                        </div>
                    )}

                    <div className="header-actions">
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
                                    <button onClick={() => { handleExportPDF(); setShowExportMenu(false); }}>
                                        PDF
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </header>
            )}

            <div className="sheet-paper" id="sheet-export-area">
                {sources.length === 0 ? (
                    <div className="empty-state">
                        {!chatStarted ? (
                            <div className="central-hero">
                                <h2>Your sheet is empty</h2>
                                <p>Ask ChevrutAI to find texts for you, or try one of these:</p>

                                <div className="central-input-wrapper">
                                    <form onSubmit={handleCentralSubmit}>
                                        <textarea
                                            className="central-textarea"
                                            placeholder="What would you like to learn about today?"
                                            value={inputVal}
                                            onChange={(e) => setInputVal(e.target.value)}
                                            onKeyDown={handleKeyDown}
                                            rows={1}
                                            autoFocus
                                        />
                                        <button type="submit" className="central-send-btn" disabled={!inputVal.trim()}>
                                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13"></line><polygon points="22 2 15 22 11 13 2 9 22 2"></polygon></svg>
                                        </button>
                                    </form>
                                </div>
                                <div className="empty-prompts-grid">
                                    {[
                                        "Find texts about Shabbat candle lighting",
                                        "Build a source sheet on teshuvah",
                                        "Sources for a wedding ceremony",
                                        "Texts about welcoming the stranger",
                                        "What does the Talmud say about forgiveness?",
                                        "Create a sheet on the binding of Isaac"
                                    ].map((prompt, i) => (
                                        <button
                                            key={i}
                                            className="prompt-card"
                                            onClick={() => onSuggestionClick && onSuggestionClick(prompt)}
                                        >
                                            <span className="prompt-icon">✨</span>
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
                <p>
                    A Project of <strong>Rabbi Daniel Bogard</strong> • Powered by <a href="https://www.sefaria.org" target="_blank" rel="noopener noreferrer">Sefaria</a> • <a href="https://github.com/RavBogard/ChevrutAI" target="_blank" rel="noopener noreferrer">View on GitHub</a>
                </p>
                <div className="footer-legal">
                    <a href="/privacy.html">Privacy Policy</a> • <Link to="/terms">Terms of Service</Link>
                    <span className="version-tag"> • v1.8.7 (Polish & Hide)</span>
                </div>
            </footer>
        </div >
    );
};

export default SheetView;
