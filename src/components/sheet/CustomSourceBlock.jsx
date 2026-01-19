import React from 'react';
import EditableContent from './EditableContent';

const CustomSourceBlock = ({ source, onRemove, onUpdate, dragHandleProps }) => {
    return (
        <div className="source-block custom-source-block" style={{ borderLeftColor: '#f59e0b' }}>
            <div className="source-header">
                <div className="header-left">
                    <div className="drag-handle" {...dragHandleProps} title="Drag to reorder">
                        <svg width="14" height="24" viewBox="0 0 14 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <circle cx="4" cy="4" r="2" fill="#9CA3AF" />
                            <circle cx="4" cy="12" r="2" fill="#9CA3AF" />
                            <circle cx="4" cy="20" r="2" fill="#9CA3AF" />
                            <circle cx="10" cy="4" r="2" fill="#9CA3AF" />
                            <circle cx="10" cy="12" r="2" fill="#9CA3AF" />
                            <circle cx="10" cy="20" r="2" fill="#9CA3AF" />
                        </svg>
                    </div>
                    <div className="custom-title-input-wrapper">
                        <input
                            type="text"
                            className="custom-source-title"
                            value={source.title || ''}
                            onChange={(e) => onUpdate({ title: e.target.value })}
                            placeholder="Title (Optional)"
                        />
                    </div>
                </div>
                <div className="source-controls" data-html2canvas-ignore="true">
                    <button className="remove-btn" onClick={onRemove} title="Remove Block">
                        &times;
                    </button>
                </div>
            </div>

            <div className="source-content" style={{ flexDirection: 'column', gap: '0.5rem' }}>
                <EditableContent
                    className="custom-text-content"
                    html={source.en} // reusing 'en' field for content to simplify export logic
                    onChange={(val) => onUpdate({ en: val })}
                    dir="ltr" // Default LTR, user can type Hebrew if they want but alignment is left for now. 
                // Ideally we could add a toggle for RTL/LTR for custom blocks.
                />
            </div>
        </div>
    );
};

export default CustomSourceBlock;
