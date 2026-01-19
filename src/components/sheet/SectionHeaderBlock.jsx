import React from 'react';

const SectionHeaderBlock = ({ source, onRemove, onUpdate, dragHandleProps }) => {
    return (
        <div className="section-header-block" style={{ marginTop: '2rem', marginBottom: '1rem', position: 'relative' }}>
            <div className="drag-handle" {...dragHandleProps} title="Drag to reorder" style={{ position: 'absolute', left: '-20px', top: '5px' }}>
                <svg width="14" height="24" viewBox="0 0 14 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <circle cx="4" cy="4" r="2" fill="#9CA3AF" />
                    <circle cx="4" cy="12" r="2" fill="#9CA3AF" />
                    <circle cx="4" cy="20" r="2" fill="#9CA3AF" />
                </svg>
            </div>
            <input
                type="text"
                className="section-header-input"
                value={source.en || ''} // Reusing 'en' to store the header text
                onChange={(e) => onUpdate({ en: e.target.value })}
                placeholder="Section Header"
                style={{
                    width: '100%',
                    fontSize: '1.5rem',
                    fontFamily: 'var(--font-english-serif)',
                    fontWeight: 'bold',
                    border: 'none',
                    borderBottom: '2px solid var(--primary-color)',
                    background: 'transparent',
                    color: 'var(--sheet-text)',
                    padding: '0.5rem 0',
                    outline: 'none'
                }}
            />
            <button
                className="remove-btn"
                onClick={onRemove}
                title="Remove Header"
                style={{ position: 'absolute', right: '0', top: '0' }}
                data-html2canvas-ignore="true"
            >
                &times;
            </button>
        </div>
    );
};

export default SectionHeaderBlock;
