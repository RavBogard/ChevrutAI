import React, { useState } from 'react';
import { useSuggestions } from '../../hooks/useSuggestions';

const SuggestPanel = ({ addSource }) => {
  const [topic, setTopic] = useState('');
  const { suggest, isLoading, results, error, addToSheet } = useSuggestions(addSource);
  const [addedRefs, setAddedRefs] = useState(new Set());

  const handleSubmit = (e) => {
    e.preventDefault();
    if (topic.trim()) suggest(topic);
  };

  const handleAdd = (suggestion) => {
    addToSheet(suggestion);
    setAddedRefs(prev => new Set([...prev, suggestion.ref]));
  };

  return (
    <div className="suggest-panel">
      <form onSubmit={handleSubmit} className="suggest-form">
        <textarea
          className="suggest-textarea"
          placeholder="Describe a topic (e.g., 'repentance and second chances')"
          value={topic}
          onChange={e => setTopic(e.target.value)}
          rows={2}
        />
        <button
          type="submit"
          className="suggest-submit-btn"
          disabled={isLoading || !topic.trim()}
        >
          {isLoading ? 'Searching...' : 'Find Sources'}
        </button>
      </form>

      {error && (
        <div className="suggest-error" role="alert">{error}</div>
      )}

      {!error && !isLoading && results.length === 0 && (
        <div className="suggest-empty">
          Describe a topic to get source suggestions from across the Jewish library.
        </div>
      )}

      <div className="suggest-results">
        {results.map((s, i) => (
          <SuggestionCard
            key={s.ref + i}
            suggestion={s}
            isAdded={addedRefs.has(s.ref)}
            onAdd={() => handleAdd(s)}
          />
        ))}
      </div>
    </div>
  );
};

const SuggestionCard = ({ suggestion, isAdded, onAdd }) => (
  <div className={`suggestion-card${!suggestion.validated ? ' suggestion-card--unvalidated' : ''}`}>
    <div className="suggestion-info">
      <strong className="suggestion-ref">
        {suggestion.ref}
        {!suggestion.validated && (
          <span
            className="validation-warning"
            title={suggestion.reason ? `Could not verify: ${suggestion.reason}` : 'Could not verify in Sefaria'}
          >
            {' '}Unverified
          </span>
        )}
      </strong>
      {suggestion.heRef && (
        <span className="suggestion-he-ref" dir="rtl">{suggestion.heRef}</span>
      )}
      {suggestion.he && (
        <p className="suggestion-he-preview" dir="rtl">
          {suggestion.he.length > 120 ? suggestion.he.substring(0, 120) + '...' : suggestion.he}
        </p>
      )}
      {suggestion.en && (
        <p className="suggestion-en-preview">
          {suggestion.en.length > 100 ? suggestion.en.substring(0, 100) + '...' : suggestion.en}
        </p>
      )}
    </div>
    <button
      className={`add-source-btn${isAdded ? ' added' : ''}`}
      onClick={onAdd}
      disabled={isAdded || !suggestion.validated}
      title={!suggestion.validated ? 'Source not found in Sefaria — cannot add' : undefined}
    >
      {isAdded ? (
        <>
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12"></polyline>
          </svg>
          Added
        </>
      ) : '+ Add'}
    </button>
  </div>
);

export default SuggestPanel;
