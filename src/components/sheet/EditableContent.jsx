import React, { useState, useEffect, useRef } from 'react';

const EditableContent = ({ html, className, onChange, dir }) => {
    const [displayHtml, setDisplayHtml] = useState("");

    useEffect(() => {
        if (!html) {
            setDisplayHtml("");
            return;
        }

        let rawHtml = html;
        if (Array.isArray(html)) {
            // Normalize array content to paragraphs
            rawHtml = html.map(c => `<p>${c}</p>`).join("");
        } else {
            // Ensure block wrapping for consistency
            const trimmed = html.trim();
            const startsWithBlock = /^(<p|<div|<ul|<ol|<h[1-6])/.test(trimmed);
            if (!startsWithBlock && trimmed.length > 0) {
                rawHtml = `<p>${html}</p>`;
            }
        }
        setDisplayHtml(rawHtml);
    }, [html]);

    const handleBlur = (e) => {
        const val = e.currentTarget.innerHTML;
        // Simple equality check to avoid redundant updates
        if (val !== html) {
            onChange(val);
        }
    };

    return (
        <div
            className={className}
            dir={dir}
            contentEditable
            suppressContentEditableWarning
            onBlur={handleBlur}
            dangerouslySetInnerHTML={{ __html: displayHtml }}
            style={{ outline: 'none', minHeight: '1em' }}
        />
    );
};

export default EditableContent;
