import { useState, useRef, useCallback } from 'react';

export const useSuggestions = (addSource) => {
  const [isLoading, setIsLoading] = useState(false);
  const [results, setResults] = useState([]);
  const [error, setError] = useState(null);
  const cacheRef = useRef(new Map()); // topic (lowercase trimmed) → suggestions array

  const suggest = useCallback(async (topic) => {
    const trimmed = topic.trim();
    if (!trimmed) return;

    const key = trimmed.toLowerCase();
    if (cacheRef.current.has(key)) {
      setResults(cacheRef.current.get(key));
      setError(null);
      return;
    }

    setIsLoading(true);
    setError(null);
    setResults([]);
    try {
      const resp = await fetch('/api/suggest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic: trimmed })
      });
      if (!resp.ok) {
        const errBody = await resp.json().catch(() => ({}));
        throw new Error(errBody.error || `API error ${resp.status}`);
      }
      const { suggestions } = await resp.json();
      cacheRef.current.set(key, suggestions);
      setResults(suggestions);
    } catch (e) {
      setError(e.message || 'Something went wrong. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }, []); // addSource intentionally not in deps — it's called in addToSheet which closes over it

  const addToSheet = useCallback((suggestion) => {
    // addSource skips Sefaria re-fetch when both he and en are provided
    addSource({ ref: suggestion.ref, he: suggestion.he, en: suggestion.en });
  }, [addSource]);

  return { suggest, isLoading, results, error, addToSheet };
};
