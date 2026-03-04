import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { subscribeToUserSheets, deleteSheetFromFirestore } from '../../services/firebase';

const SheetLibrary = () => {
    const { currentUser } = useAuth();
    const navigate = useNavigate();
    const [sheets, setSheets] = useState([]);
    const [searchQuery, setSearchQuery] = useState('');

    useEffect(() => {
        if (!currentUser) return;
        const unsubscribe = subscribeToUserSheets(currentUser.uid, setSheets);
        return unsubscribe;
    }, [currentUser]);

    // SHARE-04: Client-side filter by title
    // Rationale: Firestore has no substring/contains query.
    // Array.filter on already-loaded data has zero latency cost for personal libraries.
    const filteredSheets = useMemo(() => {
        if (!searchQuery.trim()) return sheets;
        return sheets.filter(sheet =>
            sheet.title?.toLowerCase().includes(searchQuery.toLowerCase())
        );
    }, [sheets, searchQuery]);

    if (!currentUser) {
        return (
            <div className="library-empty-auth" style={{ padding: '2rem', textAlign: 'center' }}>
                <p>Please <a href="#/">log in</a> to view your library.</p>
            </div>
        );
    }

    return (
        <div className="sheet-library">
            <div className="library-header">
                <h1 className="library-title">My Source Sheets</h1>
                <Link to="/" className="library-new-btn">+ New Sheet</Link>
            </div>

            <div className="library-search">
                <input
                    type="search"
                    className="library-search-input"
                    placeholder="Search sheets by title..."
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    aria-label="Search sheets"
                />
            </div>

            {filteredSheets.length === 0 ? (
                <div className="library-empty" style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
                    {searchQuery.trim()
                        ? `No sheets match "${searchQuery}".`
                        : 'No sheets yet. Create your first source sheet!'}
                </div>
            ) : (
                <div className="library-grid">
                    {filteredSheets.map(sheet => (
                        <div key={sheet.id} className="library-card">
                            <div
                                className="library-card-title"
                                onClick={() => navigate(`/sheet/${sheet.id}`)}
                                role="button"
                                tabIndex={0}
                                onKeyDown={e => e.key === 'Enter' && navigate(`/sheet/${sheet.id}`)}
                            >
                                {sheet.title || 'Untitled'}
                            </div>
                            <div className="library-card-meta">
                                {sheet.isPublic && (
                                    <span className="library-public-badge">Public</span>
                                )}
                                {sheet.updatedAt?.toDate && (
                                    <span className="library-card-date">
                                        {sheet.updatedAt.toDate().toLocaleDateString()}
                                    </span>
                                )}
                            </div>
                            <div className="library-card-actions">
                                <button
                                    className="library-open-btn"
                                    onClick={() => navigate(`/sheet/${sheet.id}`)}
                                >
                                    Open
                                </button>
                                <button
                                    className="library-delete-btn"
                                    onClick={() => {
                                        if (window.confirm(`Delete "${sheet.title || 'Untitled'}"?`)) {
                                            deleteSheetFromFirestore(sheet.id);
                                        }
                                    }}
                                    aria-label={`Delete ${sheet.title || 'Untitled'}`}
                                >
                                    Delete
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default SheetLibrary;
