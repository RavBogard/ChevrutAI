import React from 'react';
import ExportMenu from './ExportMenu';
import ShareButton from './ShareButton';

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
    handleExportPDF,
    // Google Docs Sync Props
    googleDocId,
    googleDocUrl,
    isSyncing,
    onSyncGoogleDoc,
    onUnlinkGoogleDoc
}) => {
    return (
        <div className="sheet-toolbar" data-html2canvas-ignore="true">
            {/* Group 1: Add Content - Prominent Primary Actions */}
            <div className="toolbar-group add-group">
                <button
                    className="toolbar-btn primary-action-btn"
                    onClick={onAddCustom}
                    title="Add Text Block"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                    Add Note
                </button>
                <button
                    className="toolbar-btn primary-action-btn"
                    onClick={onAddHeader}
                    title="Add Section Header"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 6h16"></path><path d="M4 12h16"></path><path d="M4 18h8"></path></svg>
                    Add Header
                </button>
            </div>

            <div className="toolbar-divider"></div>

            {/* Group 2: History (Undo/Redo) - Subtle */}
            <div className="toolbar-group history-group">
                <button
                    className="toolbar-btn icon-only subtle-btn"
                    onClick={onUndo}
                    disabled={!canUndo}
                    aria-label="Undo"
                    title="Undo"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 7v6h6"></path><path d="M21 17a9 9 0 0 0-9-9 9 9 0 0 0-6 2.3L3 13"></path></svg>
                </button>
                <button
                    className="toolbar-btn icon-only subtle-btn"
                    onClick={onRedo}
                    disabled={!canRedo}
                    aria-label="Redo"
                    title="Redo"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 7v6h-6"></path><path d="M3 17a9 9 0 0 1 9-9 9 9 0 0 1 6 2.3l3 2.7"></path></svg>
                </button>
            </div>

            <div className="toolbar-divider"></div>

            {/* Group 3: Export & Actions */}
            <div className="toolbar-group action-group">
                <ShareButton />
                <ExportMenu
                    showExportMenu={showExportMenu}
                    setShowExportMenu={setShowExportMenu}
                    isExportingGoogle={isExportingGoogle}
                    handleExportGoogle={handleExportGoogle}
                    handleExportDocx={handleExportDocx}
                    handleExportPDF={handleExportPDF}
                    onClearSheet={onClearSheet}
                    // Google Docs sync
                    googleDocId={googleDocId}
                    googleDocUrl={googleDocUrl}
                    isSyncing={isSyncing}
                    onSyncGoogleDoc={onSyncGoogleDoc}
                    onUnlinkGoogleDoc={onUnlinkGoogleDoc}
                />
            </div>
        </div>
    );
};

export default SheetToolbar;

