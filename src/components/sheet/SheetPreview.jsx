import React from 'react';
import './SheetPreview.css';

// ---------------------------------------------------------------------------
// hasContent -- handles string, array, and null inputs
// Copied from SourceBlock.jsx to keep SheetPreview self-contained.
// ---------------------------------------------------------------------------
export const hasContent = (text) => {
  if (!text) return false;
  if (typeof text === 'string') return text.trim().length > 0;
  if (Array.isArray(text)) return text.length > 0 && text.some(t => t && typeof t === 'string' && t.trim().length > 0);
  return false;
};

// ---------------------------------------------------------------------------
// flattenToHtml -- converts Sefaria JaggedArray to an HTML string
// ---------------------------------------------------------------------------
export const flattenToHtml = (text) => {
  if (text === null || text === undefined) return '';
  if (typeof text === 'string') return text;
  if (Array.isArray(text)) {
    return text
      .map(item => {
        if (Array.isArray(item)) return item.join(' ');
        return item;
      })
      .filter(Boolean)
      .join('<br/>');
  }
  return '';
};

// ---------------------------------------------------------------------------
// SourceText -- renders a single column's HTML content
// Sefaria API content only -- add DOMPurify in future hardening phase.
// ---------------------------------------------------------------------------
export const SourceText = ({ html, dir, lang, className }) => {
  // eslint-disable-next-line react/no-danger
  return (
    <div
      className={className}
      dir={dir}
      lang={lang}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
};

// ---------------------------------------------------------------------------
// BilingualBlock -- determines layout variant and renders columns
// ---------------------------------------------------------------------------
export const BilingualBlock = ({ source, viewMode = 'bilingual' }) => {
  const showHebrew = viewMode !== 'english' && hasContent(source.he);
  const showEnglish = viewMode !== 'hebrew' && hasContent(source.en);

  if (!showHebrew && !showEnglish) {
    return <p className="sheet-no-content">No text available for this source.</p>;
  }

  let rowClass = 'source-bilingual-row';
  if (!showHebrew) rowClass += ' source-bilingual-row--english-only';
  if (!showEnglish) rowClass += ' source-bilingual-row--hebrew-only';

  return (
    <div className={rowClass} dir="ltr">
      {showEnglish && (
        <SourceText
          className="source-col source-col--english"
          dir="ltr"
          lang="en"
          html={flattenToHtml(source.en)}
        />
      )}
      {showHebrew && (
        <SourceText
          className="source-col source-col--hebrew"
          dir="rtl"
          lang="he"
          html={flattenToHtml(source.he)}
        />
      )}
    </div>
  );
};

// ---------------------------------------------------------------------------
// SheetPreview -- maps sources array to BilingualBlock renders
// ---------------------------------------------------------------------------
const SheetPreview = ({ sources }) => {
  if (!sources || sources.length === 0) return null;

  return (
    <div className="sheet-preview">
      {sources.map((source) => (
        <div key={source.ref} className="sheet-source-block">
          <div className="sheet-source-header">
            <span className="sheet-source-ref">{source.ref}</span>
          </div>
          <BilingualBlock
            source={source}
            viewMode={source.viewMode || 'bilingual'}
          />
        </div>
      ))}
    </div>
  );
};

export default SheetPreview;
