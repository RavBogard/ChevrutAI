// src/components/editor/SearchResultCard.jsx
// Presentational card for a single Sefaria search result.
// Displays ref label, Hebrew snippet (RTL), English snippet (LTR), and "Add to Sheet" button.
// No state, no store access — purely presentational.

const SearchResultCard = ({ result, onAdd }) => {
  const truncate = (text, max = 200) => {
    if (!text) return '';
    return text.length > max ? text.slice(0, max) + '...' : text;
  };

  const heSnippet = truncate(result.he);
  const enSnippet = truncate(result.en);
  const hasEnglish = result.en && result.en.trim().length > 0;

  return (
    <div className="search-result-card">
      <div className="result-ref">{result.ref}</div>
      <div className="result-he" dir="rtl">
        {heSnippet}
      </div>
      {hasEnglish ? (
        <div className="result-en" dir="ltr">
          {enSnippet}
        </div>
      ) : (
        <div className="result-en empty-content-msg" dir="ltr">
          No English translation available
        </div>
      )}
      <button
        className="add-to-sheet-btn"
        onClick={() => onAdd(result)}
        type="button"
      >
        Add to Sheet
      </button>
    </div>
  );
};

export default SearchResultCard;
