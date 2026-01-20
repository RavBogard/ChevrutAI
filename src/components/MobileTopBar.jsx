import React from 'react';
import UserMenu from './auth/UserMenu';

const MobileTopBar = ({
    onToggleSidebar,
    darkMode,
    toggleDarkMode,
    language,
    toggleLanguage
}) => {
    return (
        <div className="mobile-top-bar">
            {/* Left: Hamburger */}
            <button className="mobile-header-btn hamburger" onClick={onToggleSidebar} title="Open Menu">
                <svg xmlns="http://www.w3.org/2000/svg" height="24" viewBox="0 -960 960 960" width="24" fill="currentColor">
                    <path d="M120-240v-80h720v80H120Zm0-200v-80h720v80H120Zm0-200v-80h720v80H120Z" />
                </svg>
            </button>

            {/* Right: Controls Group */}
            <div className="mobile-header-controls">
                {/* Language */}
                <button
                    className="mobile-header-btn"
                    onClick={toggleLanguage}
                    title="Toggle Language"
                    style={{ fontFamily: 'var(--font-hebrew)', fontWeight: 'bold' }}
                >
                    {language === 'en' ? 'עב' : 'En'}
                </button>

                {/* Theme */}
                <button
                    className="mobile-header-btn"
                    onClick={toggleDarkMode}
                    title="Toggle Theme"
                >
                    {darkMode ? (
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="5"></circle><line x1="12" y1="1" x2="12" y2="3"></line><line x1="12" y1="21" x2="12" y2="23"></line><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line><line x1="1" y1="12" x2="3" y2="12"></line><line x1="21" y1="12" x2="23" y2="12"></line><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line></svg>
                    ) : (
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path></svg>
                    )}
                </button>

                {/* User Profile */}
                <UserMenu />
            </div>
        </div>
    );
};

export default MobileTopBar;
