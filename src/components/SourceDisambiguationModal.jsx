import React from 'react';
import './SourceDisambiguationModal.css';

const SourceDisambiguationModal = ({ isOpen, originalRef, options, onSelect, onCancel }) => {
    if (!isOpen) return null;

    return (
        <div className="disambiguation-overlay">
            <div className="disambiguation-modal">
                <div className="disambiguation-header">
                    <h3>Source Not Found</h3>
                    <p>We couldn't find exact text for: <strong>{originalRef}</strong></p>
                    <p className="subtext">But we found these similar results in the library. Did you mean one of these?</p>
                </div>

                <div className="disambiguation-list">
                    {options.map((option, index) => (
                        <button key={index} className="disambiguation-option" onClick={() => onSelect(option)}>
                            <h4>{option.ref}</h4>
                            {option.he && <div className="opt-text he" dir="rtl">{option.he}</div>}
                            {option.en && <div className="opt-text en">{option.en}</div>}
                        </button>
                    ))}
                </div>

                <div className="disambiguation-footer">
                    <button className="cancel-btn" onClick={onCancel}>Cancel Add</button>
                </div>
            </div>
        </div>
    );
};

export default SourceDisambiguationModal;
