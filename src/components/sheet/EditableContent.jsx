import React, { useState, useEffect } from 'react';

const EditableContent = ({ html, className, onChange, dir }) => {
    const [displayHtml, setDisplayHtml] = useState("");

    useEffect(() => {
        if (!html) {
            // eslint-disable-next-line react-hooks/set-state-in-effect
            setDisplayHtml("");
            return;
        }
        if (Array.isArray(html)) {
             
            setDisplayHtml(html.map(c => `<p>${c}</p>`).join(""));
        } else {
            // If it looks like it already has block tags, leave it. Otherwise wrap in P.
            const trimmed = html.trim();
            if (trimmed.startsWith('<p') || trimmed.startsWith('<div') || trimmed.startsWith('<ul') || trimmed.startsWith('<ol')) {
                 
                setDisplayHtml(html);
            } else {
                 
                setDisplayHtml(`<p>${html}</p>`);
            }
        }
    }, [html]);

    const handleBlur = (e) => {
        const val = e.currentTarget.innerHTML;
        if (val !== displayHtml) {
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
