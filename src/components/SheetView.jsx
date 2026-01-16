import React, { useState } from 'react';

const SourceBlock = ({ source, onRemove }) => {
    const [viewMode, setViewMode] = useState('bilingual'); // bilingual, hebrew, english

    // Helper to render content safely (Sefaria API can return strings or arrays)
    const renderText = (text) => {
        if (Array.isArray(text)) {
            return text.map((t, i) => <p key={i} dangerouslySetInnerHTML={{ __html: t }} />);
        }
        return <p dangerouslySetInnerHTML={{ __html: text }} />;
    };

    return (
        <div className="source-block">
            <div className="source-header">
                <h3>{source.ref}</h3>
                <div className="source-controls">
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
                {(viewMode === 'bilingual' || viewMode === 'english') && (
                    <div className="text-eng" dir="ltr">
                        {renderText(source.en)}
                    </div>
                )}

                {(viewMode === 'bilingual' || viewMode === 'hebrew') && (
                    <div className="text-heb" dir="rtl">
                        {renderText(source.he)}
                    </div>
                )}
            </div>
        </div>
    );
};

const SheetView = ({ sources, onRemoveSource }) => {
    return (
        <div className="sheet-view">
            <div className="sheet-header">
                <h1>New Source Sheet</h1>
                <p className="sheet-meta">Created with ChevrutAI</p>
            </div>

            <div className="sheet-paper">
                {sources.length === 0 ? (
                    <div className="empty-state">
                        <p>Your sheet is empty.</p>
                        <p>Ask Chevruta Bot to find texts for you!</p>
                    </div>
                ) : (
                    sources.map((source, index) => (
                        <SourceBlock
                            key={`${source.ref}-${index}`}
                            source={source}
                            onRemove={() => onRemoveSource(index)}
                        />
                    ))
                )}
            </div>
        </div>
    );
};

export default SheetView;
