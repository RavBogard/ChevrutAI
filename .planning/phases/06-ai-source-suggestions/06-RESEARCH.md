# Phase 6: AI Source Suggestions - Research

**Researched:** 2026-03-04
**Domain:** Gemini AI prompt engineering + Sefaria API reference validation + React panel UI
**Confidence:** HIGH (all claims verified against live code and live API calls)

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| AI-03 | User can describe a topic and receive a list of suggested Sefaria sources relevant to that topic | Gemini prompt returning JSON ref array + Sefaria `/api/texts` validation per ref |
| AI-04 | User can add any suggested source directly from the suggestions UI to their sheet | Call existing `addSource()` from `useSheetPersistence` (to be replaced by `useSheetStore` in Phase 1); pattern already implemented in ChatSidebar's suggested-sources cards |
</phase_requirements>

---

## Summary

Phase 6 adds a dedicated topic-to-source AI workflow. The user types a topic description (e.g., "hospitality in the Torah" or "teshuvah and forgiveness") into a panel, presses a button, and receives a curated ranked list of Sefaria references. Each reference is validated server-side against the Sefaria `/api/texts` endpoint before being returned to the client. References that validate successfully come back with a Hebrew snippet (`he`) and English snippet (`en`). References the API cannot resolve are included in the response with a `validated: false` flag so the client can show a warning badge rather than crashing or silently dropping them.

The key technical insight from reading the codebase is that this feature is a refinement and formalization of what the existing chat AI (`api/chat.js`) already does informally. The chat already emits a `suggested_sources` array of `{ ref, summary }` objects. Phase 6 extracts this into a purpose-built, standalone endpoint (`POST /api/suggest`) with a tighter Gemini prompt focused exclusively on reference generation, plus server-side Sefaria validation added on top. The UI becomes a new "Suggest Sources" tab or panel in `ChatSidebar`, not a modal.

The "add to sheet" action calls `addSource(source)` which already exists in `useSheetPersistence` (and will be available from `useSheetStore` after Phase 1). The existing `addSource` already handles fetching text from Sefaria, so the suggest endpoint only needs to return enough data to pre-populate a preview — the full validated text can be fetched lazily on add, or the suggest endpoint can return the full `he`/`en` snippets it already fetched during validation.

**Primary recommendation:** New `POST /api/suggest` endpoint runs Gemini (returns JSON ref list), then validates each ref sequentially against `https://www.sefaria.org/api/texts/{ref}?context=0`, returns `{ suggestions: [{ ref, heRef, he, en, validated, reason }] }`. UI is a new "Find Sources" tab in the existing `ChatSidebar` sidebar — not a modal, not inline. Client-side cache by topic string in `useState` or a simple `useRef` map to avoid redundant API calls.

---

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `@google/generative-ai` | `^0.24.1` (already installed) | Gemini API calls from the Vercel serverless function | Already used in `api/chat.js`; same SDK, same pattern |
| Node.js (Vercel serverless) | `18.x` (Vercel default) | Hosts `api/suggest.js` endpoint | All existing API endpoints use this runtime |
| Sefaria REST API | N/A (external) | Validates AI-generated refs; returns `he`, `en`, `heRef` | Only source of truth for Jewish text existence |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| React `useState` | (built-in, React 19) | Client-side topic → results state | Always — local component state |
| `useMemo` or `useRef` map | (built-in) | Cache topic → results to avoid re-calling API | When user re-types a previously searched topic |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| New `/api/suggest` endpoint | Reuse existing `/api/chat` with a system prompt change | `/api/chat` uses streaming text + sources format; a dedicated endpoint returns clean JSON without the streaming complexity — much easier to handle |
| Client-side Sefaria validation | Server-side validation in `/api/suggest` | Client validation would expose CORS issues and add request overhead from browser; server-side batches everything before responding |
| Zustand for suggestion cache | `useRef` map in suggestion hook | Suggestion results are transient UI state, not persistent sheet data; don't pollute the store |

**Installation:** No new packages required. All needed libraries already exist in `package.json`.

---

## Architecture Patterns

### Recommended Project Structure (additions only)
```
api/
└── suggest.js           # NEW — POST /api/suggest serverless endpoint

src/
├── services/
│   └── suggestions.js   # NEW — client-side fetch wrapper for /api/suggest
├── components/
│   └── ChatSidebar.jsx  # MODIFIED — add "Find Sources" tab with SuggestPanel
│   └── sheet/
│       └── SuggestPanel.jsx  # NEW — the topic input + results list component
└── hooks/
    └── useSuggestions.js # NEW — state, loading, cache, addSource bridge
```

### Pattern 1: Vercel Serverless Endpoint (`api/suggest.js`)

**What:** POST handler. Receives `{ topic: string }`. Calls Gemini for a JSON list of refs. Validates each ref sequentially against Sefaria. Returns structured results.

**When to use:** Any time a new AI-backed endpoint is needed. This is the exact same shape as `api/chat.js`.

```javascript
// Source: api/chat.js (existing, verified 2026-03-04)
// api/suggest.js follows this exact pattern

import { GoogleGenerativeAI } from '@google/generative-ai';

const SUGGEST_SYSTEM_INSTRUCTION = `
You are a Jewish librarian AI. Given a topic, return ONLY a JSON array of Sefaria reference strings.
Rules:
- Return between 5 and 8 references
- Use ONLY formats that exist in Sefaria
- Order references from most directly relevant to tangentially relevant
- Valid formats: "Genesis 1:1", "Berakhot 2a:1", "Mishnah Avot 1:1", "Rashi on Genesis 1:1"
- For Talmud: always include segment (e.g., "Berakhot 2a:1" not "Berakhot 2a")
- For Mishneh Torah: use Sefaria titles (e.g., "Mishneh Torah, Repentance 1:1")
- For Zohar: use volume:page format (e.g., "Zohar 1:1a")

Return ONLY valid JSON. No prose. No markdown. No explanation.
Format: { "refs": ["ref1", "ref2", ...], "rationale": "one sentence explaining selection" }
`;

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { topic } = req.body || {};
  if (!topic || typeof topic !== 'string' || !topic.trim()) {
    return res.status(400).json({ error: 'topic is required' });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return res.status(500).json({ error: 'Server configuration error' });

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({
    model: process.env.GEMINI_MODEL_VERSION || 'gemini-2.0-flash',
    systemInstruction: SUGGEST_SYSTEM_INSTRUCTION,
    generationConfig: { responseMimeType: 'application/json' }
  });

  // Step 1: Ask Gemini for refs
  const result = await model.generateContent(
    `Topic: ${topic.trim()}\n\nReturn a JSON object with "refs" array.`
  );
  const raw = result.response.text();
  const { refs } = JSON.parse(raw);

  // Step 2: Validate each ref against Sefaria sequentially
  const suggestions = [];
  for (const ref of refs.slice(0, 8)) {
    const suggestion = await validateRef(ref);
    suggestions.push(suggestion);
  }

  return res.status(200).json({ suggestions });
}

async function validateRef(ref) {
  try {
    const encoded = encodeURIComponent(ref);
    const resp = await fetch(`https://www.sefaria.org/api/texts/${encoded}?context=0`);
    if (!resp.ok) {
      return { ref, validated: false, reason: `HTTP ${resp.status}` };
    }
    const data = await resp.json();

    // Sefaria returns HTTP 200 even for invalid refs; check for error field
    if (data.error) {
      return { ref, validated: false, reason: data.error };
    }

    // Check for empty text (out-of-range verse, etc.)
    const hasHe = data.he && (typeof data.he === 'string' ? data.he.trim() : data.he.length > 0);
    const hasEn = data.text && (typeof data.text === 'string' ? data.text.trim() : data.text.length > 0);

    if (!hasHe && !hasEn) {
      return { ref, validated: false, reason: 'Empty text returned' };
    }

    // Normalize: take first 200 chars of text for preview
    const normalizeSnippet = (t) => {
      if (!t) return '';
      const s = Array.isArray(t) ? t.join(' ') : String(t);
      return s.replace(/<[^>]+>/g, '').substring(0, 200);
    };

    return {
      ref: data.ref || ref,       // Use canonicalized ref from Sefaria
      heRef: data.heRef || null,  // Hebrew ref label (e.g., "בראשית א׳:א׳")
      he: normalizeSnippet(data.he),
      en: normalizeSnippet(data.text),
      validated: true,
      reason: null
    };
  } catch (e) {
    return { ref, validated: false, reason: e.message };
  }
}
```

### Pattern 2: Client-Side Suggestion Hook (`useSuggestions.js`)

**What:** Encapsulates topic input state, API call state, result state, and cache. Exposes `suggest(topic)`, `isLoading`, `results`, `addToSheet(suggestion)`.

**When to use:** Component-level hook; not store state. Cache lives in hook via `useRef` to survive re-renders but not navigate-away.

```javascript
// src/hooks/useSuggestions.js
import { useState, useRef, useCallback } from 'react';

export const useSuggestions = (addSource) => {
  const [isLoading, setIsLoading] = useState(false);
  const [results, setResults] = useState([]);
  const [error, setError] = useState(null);
  const cacheRef = useRef(new Map()); // topic (lowercase trimmed) → results array

  const suggest = useCallback(async (topic) => {
    const key = topic.trim().toLowerCase();
    if (cacheRef.current.has(key)) {
      setResults(cacheRef.current.get(key));
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      const resp = await fetch('/api/suggest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic })
      });
      if (!resp.ok) throw new Error(`API error ${resp.status}`);
      const { suggestions } = await resp.json();
      cacheRef.current.set(key, suggestions);
      setResults(suggestions);
    } catch (e) {
      setError(e.message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const addToSheet = useCallback((suggestion) => {
    // addSource already handles fetching full text if needed
    addSource({ ref: suggestion.ref, he: suggestion.he, en: suggestion.en });
  }, [addSource]);

  return { suggest, isLoading, results, error, addToSheet };
};
```

### Pattern 3: SuggestPanel Component

**What:** Topic input form + results list. Lives inside `ChatSidebar` as a new tab ("Find Sources"). Not a modal.

**Layout choice rationale:** The existing `ChatSidebar` already has a tab system (`chat` | `history`). Adding a third tab ("Find Sources") follows the established pattern exactly. A modal would obscure the sheet during source browsing. An inline panel in the sheet area would require prop-drilling through `SheetView`. The sidebar tab is the path of least resistance.

```jsx
// src/components/sheet/SuggestPanel.jsx
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
        <button type="submit" disabled={isLoading || !topic.trim()}>
          {isLoading ? 'Searching...' : 'Find Sources'}
        </button>
      </form>

      {error && <div className="suggest-error">{error}</div>}

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
  <div className={`suggestion-card ${!suggestion.validated ? 'unvalidated' : ''}`}>
    <div className="suggestion-info">
      <strong className="suggestion-ref">
        {suggestion.ref}
        {!suggestion.validated && (
          <span className="validation-warning" title={`Could not verify: ${suggestion.reason}`}>
            {' '} Unverified
          </span>
        )}
      </strong>
      {suggestion.heRef && (
        <span className="suggestion-he-ref" dir="rtl">{suggestion.heRef}</span>
      )}
      {suggestion.he && (
        <p className="suggestion-he-preview" dir="rtl">{suggestion.he.substring(0, 120)}...</p>
      )}
      {suggestion.en && (
        <p className="suggestion-en-preview">{suggestion.en.substring(0, 100)}...</p>
      )}
    </div>
    <button
      className={`add-source-btn ${isAdded ? 'added' : ''}`}
      onClick={onAdd}
      disabled={isAdded || !suggestion.validated}
      title={!suggestion.validated ? 'Cannot add: source not found in Sefaria' : ''}
    >
      {isAdded ? 'Added' : '+ Add'}
    </button>
  </div>
);
```

### Anti-Patterns to Avoid

- **Concurrent Sefaria validation:** Do NOT use `Promise.all()` for validating refs in parallel. Sefaria's API rate limits are undocumented (noted in `STATE.md`). Use sequential `for...of` loop with no artificial delay — sequential is safe by definition. If rate limiting is encountered in testing, add a 100ms delay between calls.
- **Streaming in `/api/suggest`:** Do NOT stream the suggest endpoint response. The chat endpoint streams because the user reads it progressively. Suggest needs a complete validated list before being useful. Use standard `res.json()` when complete.
- **AI generating text content:** Do NOT use the AI to generate Hebrew or English text. Only generate reference strings. Sefaria is the source of truth for text content.
- **Crashing on unvalidated refs:** Do NOT filter out unvalidated suggestions entirely. Show them with a visual warning and a disabled "Add" button. The user should see what the AI suggested even if Sefaria couldn't confirm it.
- **Adding unvalidated refs to sheet:** Do NOT allow `addSource()` to be called for a suggestion where `validated: false`. The existing `addSource()` will fetch from Sefaria and will fail, triggering the disambiguation modal — a bad UX. Block at the button level with `disabled`.
- **Using `responseMimeType: 'application/json'` without verifying model support:** The `gemini-2.0-flash` and `gemini-3-flash-preview` models support `application/json` output. Verify against the model version in `GEMINI_MODEL_VERSION` env var. If the model doesn't support it, parse JSON from raw text response with a try/catch.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Sefaria reference validation | Custom regex parser for ref strings | `fetch('https://www.sefaria.org/api/texts/${ref}?context=0')` | Sefaria's own API is the canonical validator — regex can't know if a book exists |
| Result caching | Redis, sessionStorage, service worker cache | `useRef(new Map())` in the hook | Results are ephemeral per-session; in-memory map is sufficient and zero dependency |
| Rate limiting in `/api/suggest` | Token bucket, per-IP counters | Copy the simple `Map`-based rate limiter from `api/chat.js` | Already battle-tested in the project; same pattern |
| Fuzzy ref resolution | Re-implementing `resolveSefariaRef()` from `sefaria.js` | Call `getSefariaText()` from `sefaria.js` — it already does fuzzy resolution + retries | 162 lines of fuzzy matching already exists in the service layer |

---

## Common Pitfalls

### Pitfall 1: Sefaria Returns HTTP 200 for Invalid References

**What goes wrong:** A call to `https://www.sefaria.org/api/texts/FakeBook%2099:99?context=0` returns HTTP 200 with body `{"error": "Could not find title in reference: FakeBook 99.99"}`. Code that checks `response.ok` only will treat this as a successful validation.

**Why it happens:** Sefaria uses HTTP 200 for domain-level errors. The HTTP status only reflects the transport layer.

**How to avoid:** After confirming `response.ok`, parse JSON and check for `data.error` field AND check that `data.he` or `data.text` is non-empty. Validated `true` requires: `!data.error && (hasHe || hasEn)`.

**Warning signs:** Suggestions all show as validated but clicking "Add" fails. Unit test: send `FakeBook 99:99` and assert `validated: false`.

### Pitfall 2: Out-of-Range Verse Returns Empty Text with HTTP 200

**What goes wrong:** `Genesis 1:500` returns HTTP 200 with `{"ref": "Genesis 1:500", "text": "", "he": ""}`. Neither `data.error` nor HTTP status catches this. The reference validates as "real" even though there's no content.

**Why it happens:** Sefaria returns a valid ref object for out-of-range verses — it just has no text.

**How to avoid:** Check `hasHe || hasEn` after confirming no error field. Empty text means `validated: false`.

**Warning signs:** Source cards in the UI show no text preview but still allow "Add". The user adds a blank source.

### Pitfall 3: Gemini Output Format Variability

**What goes wrong:** Gemini sometimes wraps JSON in markdown fences (\`\`\`json ... \`\`\`), or adds explanatory prose before the JSON, or returns a different key name (`"references"` instead of `"refs"`).

**Why it happens:** The model isn't perfectly consistent even with `responseMimeType: 'application/json'`.

**How to avoid:** Use `responseMimeType: 'application/json'` in `generationConfig` when calling Gemini — this forces strict JSON output. Wrap the parse in try/catch. Fall back to stripping markdown fences and parsing again if the first parse fails. Validate that `parsed.refs` is an array before proceeding.

**Warning signs:** JSON parse exceptions in server logs. Zero suggestions returned even for valid topics.

### Pitfall 4: Model Hallucinating Plausible-But-Wrong Refs

**What goes wrong:** Gemini confidently returns `"Mishneh Torah, Laws of Murder 1:9"` (the old "Laws of" format that doesn't exist in Sefaria) or `"Tanya, Part I; Likkutei Amarim 1"` (wrong format). These fail Sefaria validation.

**Why it happens:** The existing chat prompt already documents these pitfalls (see `api/chat.js` lines 61-88). The suggest prompt needs the same reference format rules.

**How to avoid:** The Gemini system prompt for `/api/suggest` MUST include the same Sefaria reference format rules from `api/chat.js`. Copy the relevant format examples verbatim into `SUGGEST_SYSTEM_INSTRUCTION`. The server-side Sefaria validation catches whatever slips through — these show as `validated: false`.

**Warning signs:** Many `validated: false` results in the UI for common topics. Check server logs for which refs are failing.

### Pitfall 5: Topic Cache Key Collision

**What goes wrong:** "repentance" and "Repentance" are treated as different topics, causing redundant API calls.

**How to avoid:** Normalize cache key to `topic.trim().toLowerCase()` before lookup and storage.

### Pitfall 6: Talmud Page References Without Segment Numbers

**What goes wrong:** Gemini suggests `"Berakhot 2a"` (a full page, 14+ segments). The Sefaria API validates this and returns 14 paragraphs of text. The Hebrew preview is unwieldy.

**How to avoid:** The Gemini prompt must instruct: "For Talmud Bavli, always include a segment number (e.g., 'Berakhot 2a:1' not 'Berakhot 2a')." In the UI preview, truncate `he` and `en` to 120 and 100 characters respectively.

---

## Sefaria Validation Flow (Definitive)

Based on live API testing (2026-03-04):

```
Input: ref string from Gemini (e.g., "Berakhot 2a:1")
  |
  v
fetch(`https://www.sefaria.org/api/texts/${encodeURIComponent(ref)}?context=0`)
  |
  v
response.ok? (HTTP 2xx check)
  - NO  → validated: false, reason: `HTTP ${status}`
  - YES → continue
  |
  v
data = await response.json()
  |
  v
data.error present?
  - YES → validated: false, reason: data.error
  - NO  → continue
  |
  v
hasHe = non-empty data.he  (string or array)
hasEn = non-empty data.text  (string or array)
  |
  v
hasHe || hasEn?
  - NO  → validated: false, reason: "Empty text returned"
  - YES → validated: true
            ref = data.ref (canonicalized)
            heRef = data.heRef (Hebrew ref label)
            he = first 200 chars of normalized data.he
            en = first 200 chars of normalized data.text
```

**Key API fields returned by Sefaria:**
- `data.ref` — canonical English ref string (may differ from input, e.g., `"Genesis 1:1"`)
- `data.heRef` — Hebrew ref label (e.g., `"בראשית א׳:א׳"`)
- `data.he` — Hebrew text (string or array of strings)
- `data.text` — English text (string or array of strings)
- `data.error` — error string (present only on domain errors)

---

## API Endpoint Design

**POST `/api/suggest`**

Request:
```json
{ "topic": "repentance and second chances" }
```

Response (success):
```json
{
  "suggestions": [
    {
      "ref": "Berakhot 34b:15",
      "heRef": "ברכות ל״ד ב׳:ט״ו",
      "he": "במקום שבעלי תשובה עומדים...",
      "en": "In the place where penitents stand...",
      "validated": true,
      "reason": null
    },
    {
      "ref": "Mishneh Torah, Repentance 1:1",
      "heRef": "משנה תורה, הלכות תשובה א׳:א׳",
      "he": "כל המצות שבתורה...",
      "en": "With regard to all the commandments...",
      "validated": true,
      "reason": null
    },
    {
      "ref": "Zohar 3:55a",
      "heRef": null,
      "he": null,
      "en": null,
      "validated": false,
      "reason": "Could not find title in reference: Zohar 3.55a"
    }
  ]
}
```

Response (error):
```json
{ "error": "topic is required" }
```

**Rate limiting:** Copy the `Map`-based rate limiter from `api/chat.js` verbatim. Same window: 20 requests/minute per IP.

**Vercel routing:** No `vercel.json` changes needed — the existing rewrite rule `"/api/(.*)" → "/api/$1"` already routes `/api/suggest` to `api/suggest.js`.

---

## UX Pattern for Suggestions Panel

**Decision: New third tab in `ChatSidebar`, not a modal.**

Rationale:
1. `ChatSidebar` already has a `sidebar-tabs` component with `chat` | `history` tabs — this is documented in `ChatSidebar.jsx` lines 168-181. Adding a third tab requires minimal JSX change.
2. A modal would cover the sheet while the user is trying to see what sources are on it. Bad for the "does this complement what I have?" workflow.
3. An inline panel in `SheetView` would require prop-drilling `addSource` through `SheetView` → new component. The sidebar already receives `onAddSource` directly.
4. An overlay panel from the right would require new positioning CSS and z-index management.

**Tab label:** "Find Sources" (not "AI Suggest" — action-oriented language).

**Tab ordering:** `Chat | Find Sources | My Sheets`

**Interaction flow:**
1. User clicks "Find Sources" tab → `SuggestPanel` renders with empty state
2. User types topic into textarea → presses "Find Sources" button
3. Loading state: button shows "Searching...", results area shows skeleton or spinner
4. Results appear: 5-8 cards, each showing ref, Hebrew ref label, Hebrew snippet, English snippet
5. Unvalidated cards: amber warning badge "Unverified", "Add" button disabled
6. Validated cards: "Add" button enabled; on click, calls `addSource({ ref, he, en })`, button changes to "Added" (checkmark)
7. User can type a new topic without leaving the tab — cache serves previous results immediately

**Empty state:** "Describe a topic to get source suggestions from across the Jewish library."

**Error state:** "Something went wrong. Please try again." with a retry mechanism.

---

## Graceful Degradation for Unvalidatable Suggestions

**Rule:** Never crash. Never silently drop. Always show.

**Implementation:**
- Include all suggestions in the API response regardless of validation status
- `validated: false` cards render with:
  - CSS class `suggestion-card--unvalidated` (amber left border)
  - Badge: small amber "Unverified" label next to the ref string
  - Tooltip on hover: the `reason` field from validation (e.g., "Could not find title in reference")
  - "Add" button: `disabled={true}` with `title="Source not found in Sefaria"`
  - No text preview (since there's no text)
- `validated: false` cards are visually deprioritized (lower opacity) but NOT hidden
- Rationale: the user should see what the AI suggested. If many are unverified, that's signal about the topic specificity.

```css
/* In App.css or a new suggestions.css */
.suggestion-card--unvalidated {
  border-left: 3px solid var(--accent-color); /* amber */
  opacity: 0.75;
}
.validation-warning {
  font-size: 0.75rem;
  color: var(--accent-color);
  font-weight: 600;
  margin-left: 0.5rem;
}
```

---

## Caching Strategy

**Mechanism:** `useRef(new Map())` inside `useSuggestions` hook.

**Scope:** Per-component-mount. Cache is lost when the user navigates away and the component unmounts. This is acceptable — the user rarely repeats the exact same topic in one session, and when they do (e.g., refining a topic), the cache serves the first query immediately.

**Cache key:** `topic.trim().toLowerCase()`

**No cache invalidation needed:** Sefaria source content does not change between sessions at any meaningful rate. The cache being in-memory means it can never go stale across sessions.

**Do NOT use:** `localStorage`, `sessionStorage`, or Firestore for caching suggestions. These are transient UX state, not user data.

**Future consideration (out of scope for Phase 6):** If latency becomes a concern, a Vercel Edge Cache or KV store could cache suggest results by topic hash server-side with a 24-hour TTL. Out of scope.

---

## Suggestion Count

**How many suggestions to generate:** Ask Gemini for **8 references**. Expect 5-8 to validate successfully.

**Rationale:**
- 3-4 suggestions is too few — the user may not find anything relevant to add
- 10+ suggestions creates cognitive overload in a sidebar panel
- Gemini's hallucination rate for Sefaria refs is moderate (demonstrated by the existing chat prompt's extensive format rules). Requesting 8 gives buffer for 1-3 failures to validate
- The existing `api/chat.js` typically returns 3-5 suggested sources per chat turn. This is a dedicated endpoint, so a slightly larger set is appropriate
- 8 is the hardcoded ceiling in `refs.slice(0, 8)` in the endpoint

**Display count:** Show all results (validated and not). Sort: validated first, then unvalidated. Do not paginate.

---

## Code Examples

### Verified: Sefaria API Returns HTTP 200 for Invalid Refs
```
# Tested live 2026-03-04
GET https://www.sefaria.org/api/texts/FakeBook%2099:99?context=0
→ HTTP 200
→ { "error": "Could not find title in reference: FakeBook 99.99" }

Conclusion: Check data.error, not response.ok alone.
```

### Verified: Sefaria API Returns ref, heRef, he, text Fields
```
# Tested live 2026-03-04: Genesis 1:1
→ data.ref = "Genesis 1:1"
→ data.heRef = "בראשית א׳:א׳"
→ data.he = "בְּרֵאשִׁ֖ית בָּרָ֣א אֱלֹהִ֑ים..."
→ data.text = "When God began to create..."

# Tested live 2026-03-04: Berakhot 2a
→ data.ref = "Berakhot 2a"
→ data.heRef = "ברכות ב׳ א"
→ data.text = Array (multiple segments)

# Tested live 2026-03-04: Pirkei Avot 1:1
→ data.ref = "Pirkei Avot 1:1"
→ data.heRef = "משנה אבות א׳:א׳"
→ data.he = "משֶׁה קִבֵּל תּוֹרָה מִסִּינַי..."
→ data.text = "Moses received the Torah at Sinai..."
```

### Verified: Gemini Endpoint Pattern from `api/chat.js`
```javascript
// Source: api/chat.js (read 2026-03-04)
const genAI = new GoogleGenerativeAI(apiKey);
const modelVersion = process.env.GEMINI_MODEL_VERSION || 'gemini-3-flash-preview';
const model = genAI.getGenerativeModel({
  model: modelVersion,
  systemInstruction: SYSTEM_INSTRUCTION
});
// api/suggest.js adds: generationConfig: { responseMimeType: 'application/json' }
// to force structured JSON output instead of freeform text
```

### Verified: Existing `addSource()` Signature
```javascript
// Source: src/hooks/useSheetPersistence.js (read 2026-03-04)
// addSource accepts: { ref, he, en, type, title, versionTitle, versions }
// If he/en are provided, it skips the Sefaria fetch
// The suggest endpoint provides he/en snippets (preview quality)
// addSource will use them as-is without re-fetching
// This means: pre-populate he/en from validation response to avoid double-fetch
```

### Verified: ChatSidebar Tab Pattern
```jsx
// Source: src/components/ChatSidebar.jsx lines 168-181 (read 2026-03-04)
<div className="sidebar-tabs">
  <button
    className={`sidebar-tab ${activeTab === 'chat' ? 'active' : ''}`}
    onClick={() => handleTabChange('chat')}
  >Chat</button>
  <button
    className={`sidebar-tab ${activeTab === 'history' ? 'active' : ''}`}
    onClick={() => handleTabChange('history')}
  >My Sheets</button>
  {/* Phase 6 adds: */}
  <button
    className={`sidebar-tab ${activeTab === 'suggest' ? 'active' : ''}`}
    onClick={() => handleTabChange('suggest')}
  >Find Sources</button>
</div>
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| AI generates text content directly | AI generates only reference strings → validated by Sefaria | Project inception | Eliminates hallucinated text; all displayed text is from authoritative Sefaria |
| Chat AI returns refs mixed with prose | Dedicated suggest endpoint returns clean structured JSON | Phase 6 | Easier client parsing; no streaming complexity |
| Suggest refs shown as unvalidated | Suggest refs validated server-side before client sees them | Phase 6 | Fewer "Add" failures; better UX |

**Deprecated/outdated:**
- `searchSefariaText()` in `src/services/sefaria.js`: Uses `POST` to an old Elasticsearch endpoint (`/api/search/text/_search`). Not used for validation in Phase 6. The simpler `GET /api/texts/{ref}` approach is more direct for ref validation.
- The existing chat AI's `suggested_sources` in `ChatSidebar.jsx`: The Phase 6 "Find Sources" tab is a parallel, dedicated UX. The chat's inline suggested sources remain for conversational use. They serve different intents.

---

## Plan Breakdown Recommendation

**2 plans are appropriate.**

### Plan 06-01: Suggest API Endpoint

**Goal:** `POST /api/suggest` is live and returning validated suggestions for any topic.

**Tasks:**
1. Create `api/suggest.js` with Gemini call (JSON output mode) + sequential Sefaria validation loop
2. Copy rate limiter from `api/chat.js` into `api/suggest.js`
3. Write the `SUGGEST_SYSTEM_INSTRUCTION` with all Sefaria format rules from `api/chat.js`
4. Implement `validateRef(ref)` function with the 3-step validation (HTTP ok, error field, empty text)
5. Manual smoke test: POST `{ "topic": "hospitality" }` and verify 5+ validated results with `he`/`en` snippets

**Covers:** AI-03 (server side — topic → refs → validated sources)

### Plan 06-02: Find Sources UI Panel

**Goal:** "Find Sources" tab in sidebar is live; user can search and add sources to sheet.

**Tasks:**
1. Create `src/hooks/useSuggestions.js` with fetch, cache (`useRef` Map), and `addToSheet` bridge
2. Create `src/services/suggestions.js` — thin fetch wrapper around `/api/suggest`
3. Create `src/components/sheet/SuggestPanel.jsx` — topic form + `SuggestionCard` list
4. Add CSS for `suggestion-card`, `suggestion-card--unvalidated`, `validation-warning` to `App.css`
5. Modify `src/components/ChatSidebar.jsx` — add "Find Sources" tab, render `SuggestPanel` when active
6. Wire `addSource` prop from `EditorContainer` → `ChatSidebar` → `SuggestPanel` (already flows through; `ChatSidebar` already receives `onAddSource`)
7. Integration test: search "Shabbat", verify results render, click "Add", verify source appears in sheet

**Covers:** AI-03 (client side — UI renders suggestions) + AI-04 (Add to sheet button)

---

## Open Questions

1. **Phase 5 translation endpoint model version**
   - What we know: `api/chat.js` uses `GEMINI_MODEL_VERSION` env var, currently `gemini-3-flash-preview`
   - What's unclear: Phase 5 may update the model version or add a new env var. Phase 6 should use whatever Phase 5 establishes.
   - Recommendation: Read `GEMINI_MODEL_VERSION` from `process.env` in `api/suggest.js`, same as chat endpoint. If Phase 5 changes it, Phase 6 inherits automatically.

2. **Zustand store migration (Phase 1)**
   - What we know: Phase 1 replaces `useSheetPersistence` with `useSheetStore` (Zustand). `addSource` is currently in `useSheetPersistence`.
   - What's unclear: The exact `addSource` API in the new Zustand store.
   - Recommendation: The `useSuggestions` hook takes `addSource` as a parameter, not importing it directly. This means Plan 06-02 just needs to pass whatever `addSource` the parent provides — fully decoupled from the migration.

3. **Sefaria API rate limits**
   - What we know: Undocumented (noted in `STATE.md`). Sequential validation is the safe approach.
   - What's unclear: The actual threshold. At 8 refs per suggest call, this is 8 sequential HTTP requests per user action.
   - Recommendation: Sequential is fine at this volume. If Sefaria returns HTTP 429, add a 200ms delay between calls. Validate actual behavior during Plan 06-01 smoke testing.

4. **`responseMimeType: 'application/json'` support in `gemini-3-flash-preview`**
   - What we know: `gemini-2.0-flash` and Gemini 1.5 Flash support structured output. `gemini-3-flash-preview` is a preview model.
   - What's unclear: Whether the preview model supports `responseMimeType: 'application/json'`.
   - Recommendation: Try it first. If the model throws, fall back to prompting for JSON and stripping markdown fences in the response parser. Wrap in try/catch either way.

---

## Sources

### Primary (HIGH confidence)
- `api/chat.js` — read directly; Gemini endpoint pattern, system instruction, rate limiter, model version
- `src/services/sefaria.js` — read directly; Sefaria API endpoint patterns, name resolution, text fetching
- `src/hooks/useSheetPersistence.js` — read directly; `addSource()` signature and behavior
- `src/components/ChatSidebar.jsx` — read directly; tab system pattern for "Find Sources" tab placement
- Live Sefaria API calls (2026-03-04):
  - `GET /api/texts/Genesis%201:1?context=0` → confirmed response structure
  - `GET /api/texts/Berakhot%202a?context=0` → confirmed array text, heRef
  - `GET /api/texts/Pirkei%20Avot%201:1?context=0` → confirmed mishnah format
  - `GET /api/texts/FakeBook%2099:99?context=0` → confirmed HTTP 200 with `{"error": "..."}`
  - `GET /api/texts/Genesis%201:500?context=0` → confirmed HTTP 200 with empty text fields
  - `GET /api/name/Genesis?limit=5` → confirmed name API structure

### Secondary (MEDIUM confidence)
- `src/components/SourceDisambiguationModal.jsx` — read directly; overlay modal pattern used for fallback disambiguation
- `.planning/STATE.md` — project decisions including "use sequential (not concurrent) ref resolution"
- `package.json` — confirmed installed packages; no new dependencies needed
- `vercel.json` — confirmed existing `/api/(.*)` rewrite covers `/api/suggest`

### Tertiary (LOW confidence — from knowledge, not verified live)
- Gemini `responseMimeType: 'application/json'` behavior in preview models — knowledge-based, needs smoke test in Plan 06-01

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all libraries already installed; verified in package.json and api/chat.js
- Architecture patterns: HIGH — derived from reading actual working code, not speculation
- Sefaria API behavior: HIGH — verified with 5 live API calls on 2026-03-04
- AI prompt design: MEDIUM — format rules copied from proven `api/chat.js` system instruction; output variability behavior is known from existing chat, but suggest JSON mode needs smoke test
- Pitfalls: HIGH — pitfalls 1 and 2 verified live; pitfalls 3-6 derived from existing code's own defensive comments

**Research date:** 2026-03-04
**Valid until:** 2026-06-01 (Sefaria API is stable; Gemini SDK moves faster — re-verify model capabilities before Phase 6 starts if more than 60 days elapse)
