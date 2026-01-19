import React from 'react';
import { useAuth } from '../../contexts/AuthContext';

const UserMenu = () => {
    const { currentUser, login, logout } = useAuth();

    if (!currentUser) {
        return (
            <button
                onClick={login}
                className="login-btn"
                style={{
                    background: 'transparent',
                    border: '1px solid var(--border-color)',
                    padding: '0.4rem 0.8rem',
                    borderRadius: '20px',
                    cursor: 'pointer',
                    fontSize: '0.9rem',
                    color: 'var(--text-primary)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem'
                }}
            >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M21.35 11.1H12.18V13.83H18.69C18.36 17.64 15.19 19.27 12.19 19.27C8.36 19.27 5.01 16.25 5.01 12.23C5.01 8.21 8.36 5.19 12.19 5.19C14.12 5.19 15.68 5.96 16.76 6.96L19.2 4.46C17.48 2.83 14.99 1.63 12.19 1.63C6.47 1.63 2 6.13 2 12.24C2 18.35 6.47 22.85 12.19 22.85C17.65 22.85 21.65 18.73 21.65 12.87C21.65 12.24 21.57 11.64 21.35 11.1Z" fill="#4285F4" fillRule="evenodd" />
                </svg>
                Sign In
            </button>
        );
    }

    return (
        <div className="user-menu" style={{ display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
            <div
                className="user-avatar"
                title={currentUser.displayName}
                style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '50%',
                    overflow: 'hidden',
                    border: '2px solid var(--primary-color)'
                }}
            >
                <img
                    src={currentUser.photoURL}
                    alt={currentUser.displayName}
                    referrerPolicy="no-referrer"
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
            </div>
            <button
                onClick={logout}
                title="Sign Out"
                style={{
                    background: 'transparent',
                    border: 'none',
                    cursor: 'pointer',
                    color: 'var(--text-secondary)',
                    padding: '4px'
                }}
            >
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
                    <polyline points="16 17 21 12 16 7"></polyline>
                    <line x1="21" y1="12" x2="9" y2="12"></line>
                </svg>
            </button>
        </div>
    );
};

export default UserMenu;
