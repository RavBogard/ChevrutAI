import React from 'react';
import ExportMenu from './ExportMenu';

const SheetToolbar = ({
    onAddCustom,
    onAddHeader,
    onUndo,
    onRedo,
    canUndo,
    canRedo,
    onClearSheet,
    // Export Props
    showExportMenu,
    setShowExportMenu,
    isExportingGoogle,
    handleExportGoogle,
    handleExportDocx,
    handleExportPDF
}) => {
    return (
        <div className="sheet-toolbar" data-html2canvas-ignore="true">
            {/* Group 1: Add Content */}
            <div className="toolbar-group add-group">
                <button
                    className="toolbar-btn add-btn"
                    onClick={onAddCustom}
                    title="Add Custom Note"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                    </svg>
                    <span>Add Note</span>
                </button>
                <button
                    className="toolbar-btn add-btn"
                    onClick={onAddHeader}
                    title="Add Section Header"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M4 6h16"></path>
                        <path d="M4 12h16"></path>
                        <path d="M4 18h8"></path>
                    </svg>
                    <span>Add Header</span>
                </button>
            </div>

            <div className="toolbar-divider"></div>

            {/* Group 2: History (Undo/Redo) */}
            <div className="toolbar-group history-group">
                <button
                    className="toolbar-btn icon-only"
                    onClick={onUndo}
                    disabled={!canUndo}
                    aria-label="Undo"
                    title="Undo"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M3 7v6h6"></path>
                        <path d="M21 17a9 9 0 0 0-9-9 9 9 0 0 0-6 2.3L3 13"></path>
                    </svg>
                </button>
                <button
                    className="toolbar-btn icon-only"
                    onClick={onRedo}
                    disabled={!canRedo}
                    aria-label="Redo"
                    title="Redo"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M21 7v6h-6"></path>
                        <path d="M3 17a9 9 0 0 1 9-9 9 9 0 0 1 6 2.3l3 2.7"></path>
                    </svg>
                </button>
            </div>

            <div className="toolbar-divider"></div>

            {/* Group 3: Actions (Export & New) */}
            <div className="toolbar-group action-group">
                <ExportMenu
                    showExportMenu={showExportMenu}
                    setShowExportMenu={setShowExportMenu}
                    isExportingGoogle={isExportingGoogle}
                    handleExportGoogle={handleExportGoogle}
                    handleExportDocx={handleExportDocx}
                    handleExportPDF={handleExportPDF}
                    onClearSheet={onClearSheet}
                />

                <button
                    className="toolbar-btn new-sheet-btn-toolbar"
                    onClick={onClearSheet}
                    title="Start New Sheet"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                        <polyline points="14 2 14 8 20 8"></polyline>
                        <line x1="12" y1="18" x2="12" y2="12"></line>
                        <line x1="9" y1="15" x2="15" y2="15"></line>
                    </svg>
                </button>
            </div>
        </div>
    );
};

export default SheetToolbar;
