import React from 'react';

const ExportMenu = ({ showExportMenu, setShowExportMenu, isExportingGoogle, handleExportGoogle, handleExportDocx, handleExportPDF, onClearSheet }) => {
    return (
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
                    <hr style={{ margin: '4px 0', border: 'none', borderTop: '1px solid #e5e7eb' }} />
                    <button
                        onClick={() => { onClearSheet(); setShowExportMenu(false); }}
                        style={{ color: '#ef4444' }}
                    >
                        Clear Sheet
                    </button>
                </div>
            )}
        </div>
    );
};

export default ExportMenu;
