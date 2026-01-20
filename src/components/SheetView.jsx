import React, { useState, useMemo } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Link } from 'react-router-dom';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import html2pdf from 'html2pdf.js';
import { exportToGoogleDoc } from '../services/google';
// exportToDocx is now dynamically imported to save bundle size
import { PROMPTS_EN, PROMPTS_HE } from '../data/prompts';

import SourceBlock from './sheet/SourceBlock';
import CustomSourceBlock from './sheet/CustomSourceBlock';
import SectionHeaderBlock from './sheet/SectionHeaderBlock';
import SheetToolbar from './sheet/SheetToolbar';
import UserMenu from './auth/UserMenu';

const SortableSourceItem = ({ source, id, onRemove, onUpdate, onRefine }) => {
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
        marginBottom: source.type === 'header' ? '0' : '1rem' // Less margin for headers
    };

    let BlockComponent = SourceBlock;
    if (source.type === 'custom') BlockComponent = CustomSourceBlock;
    if (source.type === 'header') BlockComponent = SectionHeaderBlock;

    return (
        <div ref={setNodeRef} style={style} className="sortable-item">
            <BlockComponent
                source={source}
                onRemove={onRemove}
                onUpdate={onUpdate}
                dragHandleProps={{ ...attributes, ...listeners }}
                onRefine={onRefine}
            />
        </div>
    );
};

const SheetView = ({ sources, onRemoveSource, onUpdateSource, onReorder, onClearSheet, onUndo, onRedo, canUndo, canRedo, language, onSuggestionClick, sheetTitle, onTitleChange, onSendMessage, chatStarted, onAddSource, darkMode, toggleDarkMode, toggleLanguage }) => {
    // eslint-disable-next-line no-unused-vars
    const { currentUser } = useAuth();
    const sensors = useSensors(
        useSensor(PointerSensor),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    );

    const [inputVal, setInputVal] = useState('');

    const handleAddCustom = () => {
        onAddSource({
            type: 'custom',
            ref: `note-${Date.now()}`, // Unique ID for drag key
            en: '',
            title: ''
        });
    };

    const handleAddHeader = () => {
        onAddSource({
            type: 'header',
            ref: `header-${Date.now()}`, // Unique ID for drag key
            en: ''
        });
    };

    // Practical, inspiring prompts - real use cases for rabbis and Jewish educators
    const shuffledPrompts = useMemo(() => {
        const prompts = language === 'he' ? PROMPTS_HE : PROMPTS_EN;
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
    const [exportUrl, setExportUrl] = useState(null);
    const [showExportMenu, setShowExportMenu] = useState(false);

    const handleExportGoogle = async () => {
        setIsExportingGoogle(true);
        setExportUrl(null); // Reset previous url
        try {
            const formattedSources = sources.map(s => ({
                type: s.type || 'sefaria',
                title: s.title,
                citation: s.ref,
                hebrew: Array.isArray(s.he) ? s.he.join('\n') : s.he,
                english: Array.isArray(s.en) ? s.en.join('\n') : s.en,
                viewMode: s.viewMode || 'bilingual'
            }));
            const url = await exportToGoogleDoc(sheetTitle, formattedSources);
            setExportUrl(url); // Show link
            // Try to open also, but if blocked, user has link
            window.open(url, '_blank', 'noopener,noreferrer');
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
            const { exportToDocx } = await import('../services/docxExport');
            await exportToDocx(sheetTitle, sources);
        } catch (error) {
            console.error("DocX Export Error:", error);
            alert("Failed to export DocX");
        }
        setShowExportMenu(false);
    };

    const handleRefine = (source) => {
        const query = `Please explain the source "${source.ref}" and provide more context about it.`;
        onSendMessage(query);
    };

    return (
        <div className="sheet-view">
            {!chatStarted && (
                /* Removed unified header duplicates */
                null
            )}

            {chatStarted && (
                <header className="sheet-header">
                    {/* Controls moved to UnifiedHeader */}

                    <input
                        type="text"
                        className="title-input"
                        value={sheetTitle}
                        onChange={(e) => onTitleChange(e.target.value)}
                        placeholder="Untitled Source Sheet"
                    />

                    <SheetToolbar
                        onAddCustom={handleAddCustom}
                        onAddHeader={handleAddHeader}
                        onUndo={onUndo}
                        onRedo={onRedo}
                        canUndo={canUndo}
                        canRedo={canRedo}
                        onClearSheet={onClearSheet}
                        showExportMenu={showExportMenu}
                        setShowExportMenu={setShowExportMenu}
                        isExportingGoogle={isExportingGoogle}
                        handleExportGoogle={handleExportGoogle}
                        handleExportDocx={handleExportDocx}
                        handleExportPDF={handleExportPDF}
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
                                <div className="central-hero-logo-container">
                                    <span className="hero-text-chevruta">Chevruta</span>
                                    <span className="hero-text-ai">.AI</span>
                                    <span className="hero-text-sparkle">✦</span>
                                </div>
                                <p className="gemini-subtitle" style={{ maxWidth: '600px', margin: '0 auto 2rem auto', fontSize: '1.1rem', color: 'var(--text-secondary)', lineHeight: '1.6' }}>
                                    {language === 'he'
                                        ? 'אני השותף שלך ליצירת דף מקורות יהודי. אני יכול לעזור לך למצוא מקורות, לתרגם טקסטים ולבנות דפי מקורות יפים.'
                                        : 'I am your AI partner in creating a Jewish text sheet. I can help you find sources, translate texts, and build beautiful source sheets.'}
                                </p>

                                <div className="central-input-wrapper">
                                    <form onSubmit={handleCentralSubmit} className="gemini-input-box">
                                        <textarea
                                            className="central-textarea"
                                            placeholder={language === 'he' ? 'על מה תרצה ללמוד היום?' : 'What would you like to learn about today?'}
                                            value={inputVal}
                                            onChange={(e) => setInputVal(e.target.value)}
                                            onKeyDown={handleKeyDown}
                                            rows={1}
                                            autoFocus
                                            dir={language === 'he' ? 'rtl' : 'ltr'}
                                        />
                                        <div className="input-actions">
                                            {/* We can add more buttons here later like mic or image */}
                                            <button type="submit" className="central-send-btn" disabled={!inputVal.trim()}>
                                                <svg xmlns="http://www.w3.org/2000/svg" height="24" viewBox="0 -960 960 960" width="24" fill="currentColor"><path d="M120-160v-640l760 320-760 320Zm80-120 474-200-474-200v140l240 60-240 60v140Zm0 0v-400 400Z" /></svg>
                                            </button>
                                        </div>
                                    </form>
                                </div>
                                <div className="empty-prompts-grid gemini-suggestions">
                                    {shuffledPrompts.map((prompt, i) => (
                                        <button
                                            key={i}
                                            className="gemini-pill"
                                            onClick={() => onSuggestionClick && onSuggestionClick(prompt)}
                                        >
                                            <span className="pill-text">{prompt}</span>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        ) : (
                            <div className="central-hero">
                                <h2 className="gemini-headline" style={{ fontSize: '2rem', marginBottom: '1rem' }}>Build your sheet</h2>
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
                                    onRefine={handleRefine}
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
                    <Link to="/changelog" className="version-tag"> • v1.1.4</Link>
                </div>
                <div className="footer-legal">
                    <a href="/privacy.html">Privacy Policy</a> • <Link to="/terms">Terms of Service</Link>
                </div>
            </footer>
        </div >
    );
};

import PropTypes from 'prop-types';

SheetView.propTypes = {
    sources: PropTypes.arrayOf(PropTypes.shape({
        ref: PropTypes.string.isRequired,
        he: PropTypes.oneOfType([PropTypes.string, PropTypes.arrayOf(PropTypes.string)]),
        en: PropTypes.oneOfType([PropTypes.string, PropTypes.arrayOf(PropTypes.string)]),
        type: PropTypes.string
    })).isRequired,
    onRemoveSource: PropTypes.func.isRequired,
    onUpdateSource: PropTypes.func.isRequired,
    onReorder: PropTypes.func,
    onClearSheet: PropTypes.func.isRequired,
    onUndo: PropTypes.func.isRequired,
    onRedo: PropTypes.func.isRequired,
    canUndo: PropTypes.bool.isRequired,
    canRedo: PropTypes.bool.isRequired,
    language: PropTypes.string.isRequired,
    onSuggestionClick: PropTypes.func,
    sheetTitle: PropTypes.string.isRequired,
    onTitleChange: PropTypes.func.isRequired,
    onSendMessage: PropTypes.func.isRequired,
    chatStarted: PropTypes.bool.isRequired,
    onAddSource: PropTypes.func.isRequired,
    userSheets: PropTypes.array,
    onLoadSheet: PropTypes.func,
    darkMode: PropTypes.bool.isRequired,
    toggleDarkMode: PropTypes.func.isRequired,
    toggleLanguage: PropTypes.func.isRequired
};

export default SheetView;
