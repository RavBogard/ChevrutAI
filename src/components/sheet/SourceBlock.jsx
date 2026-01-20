import React, { useState } from 'react';
import { getSefariaTextByVersion } from '../../services/sefaria';
import EditableContent from './EditableContent';

const SourceBlock = ({ source, onRemove, onUpdate, dragHandleProps, onRefine }) => {
    const viewMode = source.viewMode || 'bilingual';
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
                        onChange={(e) => onUpdate({ viewMode: e.target.value })}
                        className="view-toggle"
                    >
                        <option value="bilingual">Bilingual</option>
                        <option value="hebrew">Hebrew Only</option>
                        <option value="english">English Only</option>
                    </select>

                    {/* Refine Button (Magic Sparkle) */}
                    <button
                        className="icon-btn refine-btn"
                        onClick={() => onRefine && onRefine(source)}
                        title="Ask AI to Explain/Refine"
                        style={{ color: '#8b5cf6', marginRight: '4px' }}
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z" /></svg>
                    </button>

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

export default SourceBlock;
