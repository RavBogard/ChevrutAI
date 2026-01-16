import { Link } from 'react-router-dom';

const SourceBlock = ({ source, onRemove, onUpdate, dragHandleProps }) => {
    // ... existing SourceBlock code ...
};

// ... existing SortableSourceItem code ...

const SheetView = ({ sources, onRemoveSource, onUpdateSource, onReorder }) => {
    // ... existing SheetView logic ...

    return (
        <div className="sheet-view">
            <div className="sheet-header">
                <h1>New Source Sheet</h1>
                <div className="header-actions">
                    <button className="export-btn google-btn" onClick={handleExportGoogle} disabled={isExportingGoogle}>
                        {isExportingGoogle ? 'Exporting...' : 'Export to Docs'}
                    </button>
                    <button className="export-btn" onClick={handleExportPDF}>Download PDF</button>
                </div>
                <p className="sheet-meta">Created with ChevrutAI</p>
            </div>

            <div className="sheet-paper" id="sheet-export-area">
                {sources.length === 0 ? (
                    <div className="empty-state">
                        <p>Your sheet is empty.</p>
                        <p>Ask Chevruta Bot to find texts for you!</p>
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
                                    key={source.ref}
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
                    <Link to="/privacy">Privacy Policy</Link> • <Link to="/terms">Terms of Service</Link>
                </div>
            </footer>
        </div>
    );
};

export default SheetView;
