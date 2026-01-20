import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { subscribeToUserSheets } from '../../services/firebase';
import { useNavigate } from 'react-router-dom';

const HomeView = () => {
    const { currentUser, login } = useAuth();
    const [sheets, setSheets] = useState([]);
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();

    useEffect(() => {
        if (!currentUser) {
            // eslint-disable-next-line react-hooks/set-state-in-effect
            setSheets([]);

            setLoading(false);
            return;
        }

        const unsubscribe = subscribeToUserSheets(currentUser.uid, (fetchedSheets) => {
            setSheets(fetchedSheets);
            setLoading(false);
        });

        return () => unsubscribe();
    }, [currentUser]);

    const handleCreateNew = () => {
        // Navigate to a new sheet route
        navigate('/sheet/new');
    };

    const handleOpenSheet = (sheetId) => {
        navigate(`/sheet/${sheetId}`);
    };

    // --- Unauthenticated View (Landing Page) ---
    if (!currentUser) {
        return (
            <div className="home-container landing-page">
                <header className="home-header">
                    <div className="logo-section">
                        <h1>Chevruta.AI</h1>
                        <span className="beta-badge">Beta</span>
                    </div>
                </header>

                <main className="landing-hero">
                    <div className="hero-content">
                        <h2>Build Beautiful Source Sheets in Seconds</h2>
                        <p className="hero-subtitle">
                            Powered by Sefaria & Gemini AI. The smartest way to create, edit, and share Jewish texts.
                        </p>

                        <button className="cta-button google-login" onClick={login}>
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <path d="M21.35 11.1H12.18V13.83H18.69C18.36 17.64 15.19 19.27 12.19 19.27C8.36 19.27 5.01 16.25 5.01 12.23C5.01 8.21 8.36 5.19 12.19 5.19C14.12 5.19 15.68 5.96 16.76 6.96L19.2 4.46C17.48 2.83 14.99 1.63 12.19 1.63C6.47 1.63 2 6.13 2 12.24C2 18.35 6.47 22.85 12.19 22.85C17.65 22.85 21.65 18.73 21.65 12.87C21.65 12.24 21.57 11.64 21.35 11.1Z" fill="currentColor" fillRule="evenodd" />
                            </svg>
                            Sign In with Google
                        </button>

                        <p className="no-account-subtext">No account required to start, but needed to save.</p>
                    </div>

                    {/* Visual Placeholder / Screenshot could go here */}
                </main>
            </div>
        );
    }

    // --- Authenticated View (Dashboard) ---
    return (
        <div className="home-container dashboard">
            <header className="dashboard-header">
                <div className="logo-section">
                    <h1>Chevruta.AI</h1>
                </div>
                <div className="user-profile">
                    <img src={currentUser.photoURL} alt={currentUser.displayName} className="avatar" />
                    <button className="logout-btn-text" onClick={() => window.location.reload()}>Log Out</button>
                    {/* Note: Logout isn't implemented in context well yet, usually just reloading or creating new session works for MVP. 
                        Actually UserMenu handles this inside the app. For now just Avatar. */ }
                </div>
            </header>

            <main className="dashboard-content">
                <section className="welcome-section">
                    <div>
                        <h2>Welcome back, {currentUser.displayName?.split(' ')[0] || 'Scholar'}</h2>
                        <p style={{ opacity: 0.9, marginTop: '0.5rem' }}>Ready to learn something new today?</p>
                    </div>
                    <button className="cta-button new-sheet-btn" onClick={handleCreateNew}>
                        + Create New Sheet
                    </button>
                </section>

                <section className="recent-sheets-section">
                    <h3>My Sheets</h3>

                    {loading ? (
                        <div className="sheets-grid">
                            {[1, 2, 3].map(i => (
                                <div key={i} className="sheet-card skeleton-card">
                                    <div className="skeleton skeleton-preview"></div>
                                    <div className="sheet-card-footer">
                                        <div className="skeleton skeleton-title"></div>
                                        <div className="skeleton skeleton-date"></div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : sheets.length === 0 ? (
                        <div className="branded-empty-state">
                            <svg width="80" height="80" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20" />
                            </svg>
                            <p>No sheets yet. Start your first journey!</p>
                        </div>
                    ) : (
                        <div className="sheets-grid">
                            {sheets.map((sheet) => (
                                <div key={sheet.id} className="sheet-card" onClick={() => handleOpenSheet(sheet.id)}>
                                    <div className="sheet-card-preview">
                                        <div className="preview-line"></div>
                                        <div className="preview-line short"></div>
                                        <div className="preview-line"></div>
                                    </div>
                                    <div className="sheet-card-footer">
                                        <h4 className="sheet-title">{sheet.title || "Untitled Sheet"}</h4>
                                        <span className="sheet-date">
                                            {sheet.updatedAt?.seconds ? new Date(sheet.updatedAt.seconds * 1000).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) : 'Just now'}
                                        </span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </section>
            </main>
        </div>
    );
};

export default HomeView;
