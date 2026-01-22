import React from 'react';

const ExportMenu = ({
    showExportMenu,
    setShowExportMenu,
    isExportingGoogle,
    handleExportGoogle,
    handleExportDocx,
    handleExportPDF,
    onClearSheet,
    // Google Docs sync props
    googleDocId,
    googleDocUrl,
    isSyncing,
    onSyncGoogleDoc,
    onUnlinkGoogleDoc
}) => {
    return (
        <div className="export-menu-container">
            <button className="export-main-btn" onClick={() => setShowExportMenu(!showExportMenu)}>
                Export ▾
            </button>
            {showExportMenu && (
                <div className="export-dropdown">
                    {/* If linked to Google Docs, show sync option first */}
                    {googleDocId ? (
                        <>
                            <button
                                onClick={() => { onSyncGoogleDoc(); setShowExportMenu(false); }}
                                disabled={isSyncing}
                                style={{ fontWeight: 'bold' }}
                            >
                                {isSyncing ? 'Syncing...' : '🔄 Sync to Google Docs'}
                            </button>
                            <a
                                href={googleDocUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                style={{
                                    display: 'block',
                                    padding: '8px 12px',
                                    fontSize: '0.85rem',
                                    color: '#1d4ed8',
                                    textDecoration: 'none'
                                }}
                            >
                                📄 Open Linked Doc
                            </a>
                            <button
                                onClick={() => { onUnlinkGoogleDoc(); setShowExportMenu(false); }}
                                style={{ fontSize: '0.85rem', color: '#666' }}
                            >
                                Unlink from Google Docs
                            </button>
                            <hr style={{ margin: '4px 0', border: 'none', borderTop: '1px solid #e5e7eb' }} />
                        </>
                    ) : (
                        <button
                            onClick={() => { handleExportGoogle(); setShowExportMenu(false); }}
                            disabled={isExportingGoogle || isSyncing}
                        >
                            {isExportingGoogle ? 'Exporting...' : 'Google Docs'}
                        </button>
                    )}
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
