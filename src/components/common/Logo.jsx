import React from 'react';

const Logo = ({ className = '', onClick }) => {
    return (
        <div
            className={`chevruta-logo ${className}`}
            onClick={onClick}
            style={{
                display: 'flex',
                alignItems: 'center',
                fontFamily: 'var(--font-english-serif)',
                cursor: onClick ? 'pointer' : 'default',
                lineHeight: 1
            }}
            title="Chevruta.AI"
        >
            <span style={{ fontSize: '1.5em', fontWeight: '700', color: 'var(--sheet-text)', letterSpacing: '-0.02em' }}>Chevruta</span>
            <span style={{ fontSize: '1.5em', fontWeight: '700', background: 'linear-gradient(135deg, #8b5cf6 0%, #f97316 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>.AI</span>
            <span style={{ fontSize: '1em', background: 'linear-gradient(135deg, #8b5cf6 0%, #f97316 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', marginLeft: '0.1em', transform: 'translateY(-0.2em)' }}>✦</span>
        </div>
    );
};

export default Logo;
