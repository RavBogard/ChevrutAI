// src/components/editor/SearchPanel.jsx
// Search panel for looking up Sefaria texts by reference or keyword.
// Two-mode search: getSefariaText (direct ref) first, searchSefariaText (keyword) as fallback.
// All search state is local useState — nothing goes into useSheetStore.
// After "Add to Sheet", query and results are cleared.

import { useState, useRef, useCallback } from 'react';
import { getSefariaText, searchSefariaText } from '../../services/sefaria';
import useSheetStore from '../../stores/useSheetStore';
import SearchResultCard from './SearchResultCard';

const SearchPanel = () => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const debounceRef = useRef(null);

  const handleSearch = useCallback((value) => {
    setQuery(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!value.trim()) {
      setResults([]);
      setError(null);
      return;
    }
    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      setError(null);
      try {
        const direct = await getSefariaText(value);
        if (direct && !direct.error) {
          setResults([{
            ref: direct.ref,
            he: direct.he,
            en: direct.en,
            versionTitle: direct.versionTitle || null,
            versions: direct.versions || [],
          }]);
        } else {
          const hits = await searchSefariaText(value);
          if (hits && hits.length > 0) {
            setResults(hits);
          } else {
            setResults([]);
            setError('No results found. Try a more specific reference.');
          }
        }
      } catch {
        setError('Search failed. Check your connection.');
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 400);
  }, []);

  const handleAdd = useCallback((result) => {
    useSheetStore.getState().addSource({
      type: 'source',
      ref: result.ref,
      he: result.he,
      en: result.en,
      versionTitle: result.versionTitle || null,
      versions: result.versions || [],
    });
    setQuery('');
    setResults([]);
    setError(null);
  }, []);

  return (
    <div className="search-panel">
      <input
        type="text"
        className="search-input"
        placeholder="Search by reference or keyword (e.g. Genesis 1:1)"
        value={query}
        onChange={(e) => handleSearch(e.target.value)}
        autoFocus
        aria-label="Search Sefaria texts"
      />
      {loading && (
        <div className="search-loading" aria-live="polite">Searching...</div>
      )}
      {error && (
        <div className="search-error" role="alert">{error}</div>
      )}
      <div className="search-results" aria-label="Search results">
        {results.map((r) => (
          <SearchResultCard key={r.ref} result={r} onAdd={handleAdd} />
        ))}
      </div>
    </div>
  );
};

export default SearchPanel;
