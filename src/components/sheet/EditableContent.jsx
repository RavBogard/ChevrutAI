import React, { useState, useEffect, useRef } from 'react';

// Helper to inject data-segment-index
const injectSegmentIndices = (html) => {
    if (!html) return "";
    // Create a temporary container to parse and manipulate HTML
    const div = document.createElement('div');
    div.innerHTML = html;

    // Select block-level elements
    const blocks = div.querySelectorAll('p, div, li, h1, h2, h3, h4, h5, h6');

    // If no blocks found but text exists, wrap in p
    if (blocks.length === 0 && div.textContent.trim()) {
        return `<p data-segment-index="0">${html}</p>`;
    }

    blocks.forEach((block, index) => {
        block.setAttribute('data-segment-index', index);
    });

    return div.innerHTML;
};

// Hook to apply highlights manually to avoid React re-renders of the contentEditable
const useSegmentHighlight = (ref, highlightedIndex) => {
    useEffect(() => {
        if (!ref.current) return;

        // Remove all existing highlights
        const existing = ref.current.querySelectorAll('.segment-highlight');
        existing.forEach(el => el.classList.remove('segment-highlight'));

        if (highlightedIndex !== null && highlightedIndex !== undefined) {
            // Find the Nth segment with a data attribute
            // We specifically look for the data attribute to be robust
            const segments = ref.current.querySelectorAll('[data-segment-index]');

            // Convert NodeList to Array to find the one with matching index
            // (Elements might not be in DOM order if something weird happened, but usually they are)
            // Ideally we query specifically:
            const target = ref.current.querySelector(`[data-segment-index="${highlightedIndex}"]`);

            if (target) {
                target.classList.add('segment-highlight');
            } else if (segments[highlightedIndex]) {
                // Fallback to index-based if attribute search fails (e.g. if indices got messy)
                segments[highlightedIndex].classList.add('segment-highlight');
            }
        }
    }, [highlightedIndex, ref]);
};

const EditableContent = ({ html, className, onChange, dir, onHoverSegment, onFocusSegment, highlightedIndex }) => {
    const [displayHtml, setDisplayHtml] = useState("");
    const containerRef = useRef(null);
    const isInternalUpdate = useRef(false);

    // Apply the highlighting hook
    useSegmentHighlight(containerRef, highlightedIndex);

    useEffect(() => {
        if (isInternalUpdate.current) {
            isInternalUpdate.current = false;
            return;
        }

        if (!html) {
            setDisplayHtml("");
            return;
        }

        let rawHtml = html;
        if (Array.isArray(html)) {
            rawHtml = html.map(c => `<p>${c}</p>`).join("");
        } else {
            // Ensure block wrapping
            const trimmed = html.trim();
            const startsWithBlock = /^(<p|<div|<ul|<ol|<h[1-6])/.test(trimmed);
            if (!startsWithBlock) {
                rawHtml = `<p>${html}</p>`;
            }
        }

        // Inject indices for highlighting
        setDisplayHtml(injectSegmentIndices(rawHtml));

    }, [html]);

    const handleBlur = (e) => {
        const val = e.currentTarget.innerHTML;

        // Clean: Remove data-segment-index attributes before saving
        const div = document.createElement('div');
        div.innerHTML = val;
        div.querySelectorAll('[data-segment-index]').forEach(el => el.removeAttribute('data-segment-index'));
        const cleanVal = div.innerHTML;

        if (cleanVal !== html) {
            onChange(cleanVal);
        }
        isInternalUpdate.current = true;
    };

    return (
        <div
            ref={containerRef}
            className={className}
            dir={dir}
            contentEditable
            suppressContentEditableWarning
            onBlur={handleBlur}
            dangerouslySetInnerHTML={{ __html: displayHtml }}
            style={{ outline: 'none', minHeight: '1em' }}
            // Segment Highlighting Events
            onMouseOver={(e) => {
                const target = e.target.closest('[data-segment-index]');
                if (target) {
                    const index = parseInt(target.getAttribute('data-segment-index'), 10);
                    if (!isNaN(index) && onHoverSegment) {
                        onHoverSegment(index);
                    }
                }
            }}
            onMouseLeave={() => {
                if (onHoverSegment) onHoverSegment(null);
            }}
            // Using onMouseDown/onKeyUp to catch cursor movements reasonably well
            onMouseDown={(e) => {
                const target = e.target.closest('[data-segment-index]');
                if (target) {
                    const index = parseInt(target.getAttribute('data-segment-index'), 10);
                    if (!isNaN(index) && onFocusSegment) {
                        onFocusSegment(index);
                    }
                }
            }}
            onKeyUp={(e) => {
                // Check selection
                const selection = window.getSelection();
                if (selection.rangeCount > 0) {
                    const node = selection.anchorNode;
                    const element = node.nodeType === 3 ? node.parentElement : node;
                    const target = element.closest('[data-segment-index]');
                    if (target) {
                        const index = parseInt(target.getAttribute('data-segment-index'), 10);
                        if (!isNaN(index) && onFocusSegment) {
                            onFocusSegment(index);
                        }
                    }
                }
            }}
        />
    );
};

export default EditableContent;
