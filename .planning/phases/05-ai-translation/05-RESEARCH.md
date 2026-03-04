# Phase 5: AI Translation - Research

**Researched:** 2026-03-04
**Domain:** AI translation API (Gemini/Claude), Vercel serverless functions, Firestore document patterns, React UI labeling
**Confidence:** HIGH

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| AI-01 | User can request AI translation for any source that has an empty English translation field (on-demand per source, not automatic) | API endpoint design + "Translate with AI" button pattern documented below |
| AI-02 | AI-translated text is visually labeled "AI Translation" in both the editor and on printed/exported output (label is non-dismissable) | CSS badge pattern + print media query + docx injection documented below |
| AI-05 | AI translation prompt explicitly instructs the model to flag Aramaic passages and note uncertainty | Exact prompt provided; Aramaic detection strategy documented |
</phase_requirements>

---

## Summary

Phase 5 adds on-demand AI translation for Sefaria sources that have no existing English translation. The work breaks into three tightly coupled deliverables: (1) a new Vercel serverless function `POST /api/translate` that calls an AI model, (2) a "Translate with AI" button in `SourceBlock.jsx` that appears only when `source.en` is empty and calls that endpoint, and (3) a persistent `isAiTranslated: true` badge that renders in the editor and survives print and DOCX export.

The existing codebase provides a direct template: `api/chat.js` uses `@google/generative-ai` with in-memory rate limiting and the same `export default async function handler(req, res)` Vercel pattern. The new `api/translate.js` file should follow the same structure but return JSON (no streaming needed), call the AI model with a translation-specific system prompt, and respond with `{ translation, isAramaic, confidence, model }`.

The critical model decision is **Claude Haiku 4.5 over Gemini for translation**. Independent reviews of classical Jewish language tasks specifically note Claude's superior handling of non-standard Hebrew registers (rabbinic Hebrew, Zoharic Aramaic). The cost difference is real ($1/$5 per MTok vs $0.30/$2.50 for Gemini 2.5 Flash) but is acceptable at low volume — a translation of 500 tokens costs approximately $0.003 with Haiku 4.5. Given the app's trust-sensitive context (religious educators producing liturgical content), Claude's stronger instruction-following and linguistic precision justify the premium.

**Primary recommendation:** Implement `POST /api/translate` using Claude Haiku 4.5 (`claude-haiku-4-5-20251001`). Store result in `source.aiTranslation` (never overwrite `source.en`). Display a non-dismissable "AI Translation" badge using a CSS class that is visible in both screen and print media, and inject a "(AI Translation)" label into DOCX export text.

---

## Existing API Assessment

### What Exists: `api/chat.js`

The sole existing serverless function at `C:/Users/dsbog/ChevrutAI/api/chat.js` establishes these patterns:

| Pattern | Implementation |
|---------|---------------|
| Runtime | Default Node.js (no `export const config`) |
| Export | `export default async function handler(req, res)` |
| Auth check | `process.env.GEMINI_API_KEY` guard returning 500 |
| Rate limiting | In-memory `Map` keyed on `x-forwarded-for` IP — 20 req/min window |
| Response format | Streaming (`text/plain; chunked`) for chat; should be JSON for translation |
| Library | `@google/generative-ai` version `^0.24.1` |
| Model | `process.env.GEMINI_MODEL_VERSION \|\| 'gemini-3-flash-preview'` |

**Note on `gemini-3-flash-preview`:** As of March 2026, the current stable Gemini Flash model is `gemini-2.5-flash`. The string `gemini-3-flash-preview` in `chat.js` references a preview model. This is fine for the chat endpoint but is a flag to document — the translation endpoint should NOT use this string.

**`vercel.json` routing:** The `"source": "/api/(.*)"` → `"destination": "/api/$1"` rewrite handles all files in `/api/`. A new `api/translate.js` file is automatically routed to `POST /api/translate` with no config changes needed.

### Endpoint Contract (New)

```
POST /api/translate
Content-Type: application/json

Request:
{
  "ref": "Berakhot 2a:1",          // source citation (for context)
  "hebrewText": "<string>"         // the he field from the source object
}

Response 200:
{
  "translation": "<English text>",
  "isAramaic": true | false,
  "confidence": "high" | "medium" | "low",
  "model": "claude-haiku-4-5-20251001"
}

Response 400: { "error": "Missing hebrewText" }
Response 429: { "error": "Too many requests. Please wait a moment." }
Response 500: { "error": "<message>" }
```

---

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `@anthropic-ai/sdk` | `^0.x` (latest) | Claude API client for Node.js | Official Anthropic SDK; TypeScript-typed; handles retries |
| `@google/generative-ai` | `^0.24.1` (already installed) | Gemini API (keep for chat endpoint) | Already in production |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `@vercel/firewall` | optional | App-level rate limiting | Only if WAF is not available on Vercel plan |

**Rate limiting approach for translation endpoint:** The existing in-memory pattern from `chat.js` is acceptable as a starting baseline (mirrors existing production code exactly). The translation endpoint warrants a **tighter limit**: 5 requests per minute per IP (vs 20 for chat). This is because translation calls are more expensive and users will not need to translate more than a few sources in a minute in normal use.

The in-memory approach resets on cold start, meaning determined abusers could exploit this with concurrent requests hitting fresh instances. For v1, this is an acceptable tradeoff. A Vercel WAF rule targeting `/api/translate` at 5 req/10s per IP is the production-grade complement and should be noted in the implementation plan as a recommended Vercel dashboard action.

### Installation

```bash
npm install @anthropic-ai/sdk
```

No other new dependencies required. The `ANTHROPIC_API_KEY` environment variable must be added to Vercel project settings.

---

## Model Decision: Claude Haiku 4.5 over Gemini

### Capability Evidence

**Claude advantage for classical Jewish languages (MEDIUM confidence — sourced from Talmud & Tech blog review, single source but directly relevant):**
- Claude 3 was specifically tested on rabbinic Hebrew and Zoharic Aramaic generation and demonstrated superior handling of non-standard Hebrew registers
- Claude showed better understanding of specialized linguistic registers within classical Jewish languages
- The advantage is most pronounced for archaic vocabulary and period-appropriate syntactic structures — directly relevant to Talmudic Aramaic

**No formal benchmarks exist** for Talmudic Aramaic translation quality between Claude and Gemini. This is the honest state of the evidence.

**Why this still favors Claude for this app:**
1. Classical Talmudic Aramaic (Babylonian dialect, 3rd–6th century CE) is a genuinely low-resource language in most LLM training corpora. The model that performs better on adjacent tasks (Zoharic Aramaic, rabbinic Hebrew) is a reasonable proxy.
2. Claude's stronger instruction-following means the prompt requirement "explicitly flag if text is Aramaic, note uncertainty on difficult passages" is more reliably executed.
3. Religious educators will notice translation quality errors immediately. Claude's consistency in structured scholarly output justifies the modest cost premium.

**Gemini arguments (honest):**
- Gemini 2.5 Flash is 3x cheaper for input, 6x cheaper for output
- Gemini has Sefaria-scale Hebrew content in training (Sefaria publishes openly)
- For modern Hebrew, Gemini likely performs comparably

**Verdict: Use Claude Haiku 4.5.** The app's trust surface with religious educators makes quality the dominant criterion over cost at this volume. If costs become a concern at scale, the model string is a single environment variable — swap to Gemini 2.5 Flash later with no architecture change.

### Pricing Reference

| Model | Input (per 1M tokens) | Output (per 1M tokens) | Typical translation call cost |
|-------|-----------------------|------------------------|-------------------------------|
| Claude Haiku 4.5 | $1.00 | $5.00 | ~$0.003 (500 in / 400 out tokens) |
| Claude Sonnet 4.6 | $3.00 | $15.00 | ~$0.008 |
| Gemini 2.5 Flash | $0.30 | $2.50 | ~$0.001 |
| Gemini 2.0 Flash | $0.10 | $0.40 | ~$0.0002 |

Source: [Anthropic pricing page](https://platform.claude.com/docs/en/about-claude/pricing), [Google AI pricing](https://ai.google.dev/pricing) (verified March 2026)

---

## Architecture Patterns

### Recommended Project Structure (additions only)

```
api/
├── chat.js               # existing — do not modify
└── translate.js          # NEW — POST /api/translate

src/
├── components/
│   └── sheet/
│       ├── SourceBlock.jsx       # add "Translate with AI" button + AI label
│       └── AiTranslationLabel.jsx  # NEW — reusable badge component
├── services/
│   └── aiTranslation.js          # NEW — fetch wrapper for /api/translate
└── App.css                       # add .ai-translation-badge CSS
```

### Pattern 1: Serverless Translate Endpoint

**What:** `api/translate.js` follows the same Vercel handler pattern as `api/chat.js` but calls Claude instead of Gemini and returns a JSON object (not a stream).

**When to use:** Any time `source.en` is empty and the user clicks "Translate with AI."

```javascript
// api/translate.js
/* eslint-env node */
import Anthropic from '@anthropic-ai/sdk';

const rateLimitMap = new Map();
const RATE_LIMIT_WINDOW_MS = 60000;
const MAX_REQUESTS_PER_WINDOW = 5; // tighter than chat (20)

function isRateLimited(ip) {
    const now = Date.now();
    const record = rateLimitMap.get(ip);
    if (!record || now - record.windowStart > RATE_LIMIT_WINDOW_MS) {
        rateLimitMap.set(ip, { windowStart: now, count: 1 });
        return false;
    }
    if (record.count >= MAX_REQUESTS_PER_WINDOW) return true;
    record.count++;
    return false;
}

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const clientIP = req.headers['x-forwarded-for'] || req.socket?.remoteAddress || 'unknown';
    if (isRateLimited(clientIP)) {
        return res.status(429).json({ error: 'Too many requests. Please wait a moment before trying again.' });
    }

    let body = req.body;
    if (typeof body === 'string') {
        try { body = JSON.parse(body); } catch {
            return res.status(400).json({ error: 'Invalid JSON body' });
        }
    }

    const { ref, hebrewText } = body || {};
    if (!hebrewText || typeof hebrewText !== 'string' || !hebrewText.trim()) {
        return res.status(400).json({ error: 'Missing or empty hebrewText' });
    }

    // eslint-disable-next-line no-undef
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
        return res.status(500).json({ error: 'Server configuration error: Missing ANTHROPIC_API_KEY' });
    }

    try {
        const anthropic = new Anthropic({ apiKey });
        const message = await anthropic.messages.create({
            model: 'claude-haiku-4-5-20251001',
            max_tokens: 1500,
            system: TRANSLATION_SYSTEM_PROMPT,
            messages: [
                {
                    role: 'user',
                    content: `Source reference: ${ref || 'Unknown'}\n\nText to translate:\n${hebrewText}`
                }
            ]
        });

        const rawText = message.content[0].text;
        // Parse the structured JSON response from the model
        let result;
        try {
            const jsonMatch = rawText.match(/\{[\s\S]*\}/);
            result = JSON.parse(jsonMatch ? jsonMatch[0] : rawText);
        } catch {
            // If model didn't return JSON, wrap the raw text
            result = { translation: rawText, isAramaic: false, confidence: 'low' };
        }

        return res.status(200).json({
            translation: result.translation || rawText,
            isAramaic: result.isAramaic || false,
            confidence: result.confidence || 'medium',
            model: 'claude-haiku-4-5-20251001'
        });

    } catch (error) {
        console.error('Anthropic API Error:', error);
        return res.status(500).json({ error: error.message });
    }
}
```

### Pattern 2: Translation System Prompt

This is the exact prompt to use. It satisfies all three AI-05 requirements: high-quality translation, Aramaic flagging, and uncertainty notation.

```javascript
// Assign to TRANSLATION_SYSTEM_PROMPT constant in api/translate.js
const TRANSLATION_SYSTEM_PROMPT = `You are an expert scholar of classical Jewish texts with deep knowledge of Biblical Hebrew, Mishnaic Hebrew, Talmudic Aramaic (Babylonian and Jerusalem dialects), and the Aramaic of the Zohar.

Your task is to translate the provided Hebrew or Aramaic text into clear, scholarly English suitable for a Jewish educator's source sheet.

CRITICAL INSTRUCTIONS:
1. First, identify the primary language of the text: Biblical Hebrew, Mishnaic Hebrew, Talmudic Aramaic, Zoharic Aramaic, or mixed.
2. If the text is primarily Aramaic (Talmudic/Zoharic), set "isAramaic": true and note this explicitly in translation.
3. For difficult, ambiguous, or uncertain passages, add a bracketed note: [Translator's note: uncertain — possible meaning: X]
4. Do NOT invent a translation when the text is genuinely unclear. Use "[unclear passage]" for untranslatable segments.
5. Preserve proper nouns, divine names, and technical halakhic terms in transliteration when appropriate (e.g., "Shabbat," "mitzvah," "teshuvah").
6. Match the register of the original: legal texts should sound precise, narrative should sound literary, mystical texts should preserve their elevated style.

RESPONSE FORMAT: Respond ONLY with valid JSON in exactly this structure:
{
  "translation": "<the full English translation>",
  "isAramaic": <true if primarily Aramaic, false if primarily Hebrew>,
  "confidence": "<high if straightforward text, medium if some ambiguity, low if significant uncertainty>",
  "languageNote": "<optional: brief note on language, e.g., 'Babylonian Talmudic Aramaic with some Hebrew terms'>"
}`;
```

### Pattern 3: Frontend Service and State Update

```javascript
// src/services/aiTranslation.js
export const translateWithAI = async (ref, hebrewText) => {
    const response = await fetch('/api/translate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ref, hebrewText })
    });

    if (!response.ok) {
        const err = await response.json().catch(() => ({ error: response.statusText }));
        throw new Error(err.error || `Translation failed: ${response.status}`);
    }

    return response.json();
    // Returns: { translation, isAramaic, confidence, model }
};
```

**SourceBlock.jsx integration:** The "Translate with AI" button should only appear when `!hasContent(source.en)`. On click, it calls `translateWithAI`, then calls `onUpdate({ aiTranslation: result.translation, isAiTranslated: true, aiTranslationMeta: { isAramaic: result.isAramaic, confidence: result.confidence, model: result.model } })`. This writes to the new fields, never touching `source.en`.

When rendering, the English column displays `source.aiTranslation` (with the badge) when `source.isAiTranslated === true`, rather than `source.en`.

### Pattern 4: AI Translation Badge (Non-Dismissable)

```jsx
// src/components/sheet/AiTranslationLabel.jsx
import React from 'react';

const AiTranslationLabel = ({ isAramaic, confidence }) => (
    <div className="ai-translation-badge">
        <span className="ai-translation-badge__icon" aria-hidden="true">✦</span>
        <span className="ai-translation-badge__text">AI Translation</span>
        {isAramaic && (
            <span className="ai-translation-badge__aramaic">
                (Aramaic text — verify with scholar)
            </span>
        )}
        {confidence === 'low' && (
            <span className="ai-translation-badge__uncertainty">
                · Some passages uncertain
            </span>
        )}
    </div>
);

export default AiTranslationLabel;
```

```css
/* App.css additions */

/* AI Translation Badge - visible in screen AND print */
.ai-translation-badge {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 0.3rem;
  font-size: 0.72rem;
  font-weight: 600;
  color: #7c3aed;           /* purple — distinct from normal version-label */
  background: #f5f3ff;
  border: 1px solid #c4b5fd;
  border-radius: 4px;
  padding: 0.2rem 0.5rem;
  margin-top: 0.4rem;
  letter-spacing: 0.01em;
  /* No cursor pointer — it is non-dismissable */
}

.ai-translation-badge__aramaic,
.ai-translation-badge__uncertainty {
  color: #b45309;           /* amber — warning tone */
  font-weight: 500;
}

/* CRITICAL: badge must survive print */
@media print {
  .ai-translation-badge {
    display: flex !important;
    border: 1px solid #9ca3af !important;
    background: transparent !important;
    color: #374151 !important;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }
}
```

### Pattern 5: DOCX Export Label Injection

In `src/services/docxExport.js`, the `englishText` for an AI-translated source currently just renders `formatText(source.en)`. Since `source.en` is empty (that is why AI was needed), and the translation is in `source.aiTranslation`, the export must:

1. Use `source.aiTranslation` when `source.isAiTranslated === true`
2. Prepend `[AI Translation] ` to the text in the cell

```javascript
// In exportToDocx, replace the englishText line:
const englishText = source.isAiTranslated
    ? `[AI Translation] ${formatText(source.aiTranslation)}`
    : formatText(source.en);
```

This satisfies AI-02 for DOCX export without requiring docx library-level styling changes.

### Anti-Patterns to Avoid

- **Overwriting `source.en`:** Never put AI translation into the `en` field. Sefaria `en` fields are Sefaria-licensed translations. Mixing AI output into that field corrupts the data provenance.
- **Auto-translating on load:** Translation must be explicitly triggered by the user per AI-01. Do not run translation in `handleAddSource`.
- **Making the badge dismissable:** AI-02 requires the label to be non-dismissable. No `×` close button on the badge.
- **Streaming translation:** Unlike chat, translation returns a complete JSON object. Streaming adds complexity without UX benefit for a single source (< 400 tokens output).
- **Using the same rate limit as chat (20/min):** Translation is more expensive. Use 5/min.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Hebrew/Aramaic language detection | Custom character-range regex | Claude prompt — ask the model | Classical Aramaic uses Hebrew script; Unicode ranges cannot distinguish the languages |
| Translation quality validation | Post-processing heuristics | Claude's confidence field + uncertainty notes | Model knows when it is uncertain; regex cannot detect semantic ambiguity |
| Retry/backoff on 429 | Custom retry loop | `@anthropic-ai/sdk` built-in retries | SDK handles exponential backoff automatically |

**Key insight:** Language detection by script is impossible for Hebrew vs. Aramaic — both use the same Unicode block (U+0590–U+05FF). The only reliable detector is the model itself, which is why the prompt asks Claude to self-report `isAramaic`.

---

## Common Pitfalls

### Pitfall 1: Model Returns Prose Instead of JSON

**What goes wrong:** Claude Haiku occasionally ignores format instructions for very short or fragmentary texts and returns prose instead of the required JSON.

**Why it happens:** Short input (a single word or sentence fragment) reduces the model's confidence in the structured output path.

**How to avoid:** Always parse with a regex match for the first `{...}` block (`rawText.match(/\{[\s\S]*\}/)`), and have a fallback that wraps the raw text in the expected shape with `confidence: 'low'`.

**Warning signs:** `JSON.parse` throws on the raw response text.

### Pitfall 2: Empty `hebrewText` from Array Sources

**What goes wrong:** Sefaria returns some texts (especially Talmud) as arrays of strings (segments). If `source.he` is passed directly to the API as an array, the model receives `[object Array]` as the text.

**Why it happens:** The `he` field in the store can be `string | string[]`. See `hasContent()` in `SourceBlock.jsx` which already handles this.

**How to avoid:** In `aiTranslation.js`, normalize before sending:
```javascript
const normalizeText = (text) => {
    if (!text) return '';
    if (Array.isArray(text)) return text.filter(Boolean).join('\n');
    return String(text);
};
// Use normalizeText(source.he) before sending
```

**Warning signs:** Translation comes back as a translation of "[object Array]" — the tell is the model translates literal bracket characters.

### Pitfall 3: Translation Loading State Not Gated on `isAiTranslated`

**What goes wrong:** If the "Translate" button is not disabled during the API call, the user can click it multiple times, firing multiple concurrent requests for the same source and charging the API multiple times.

**Why it happens:** React state for `isTranslating` is per-component; if the component re-renders during the request, the `useState` flag can reset.

**How to avoid:** Disable the button with a local `isTranslating` state. Since translation is per-source, use a source-level state keyed by index or id.

**Warning signs:** Multiple identical `POST /api/translate` requests in the network tab.

### Pitfall 4: Print Badge Hidden by `data-html2canvas-ignore`

**What goes wrong:** The `source-controls` div in `SourceBlock.jsx` uses `data-html2canvas-ignore="true"`. If the AI badge is placed inside `source-controls`, it will be hidden in PDF export (which uses html2pdf.js).

**Why it happens:** `data-html2canvas-ignore` is already applied to the controls section for PDF rendering.

**How to avoid:** Render `AiTranslationLabel` inside the English text column (`text-eng` div), below the `EditableContent`, NOT inside `source-controls`. This is also the correct semantic placement.

### Pitfall 5: Firestore Sanitizer Strips `undefined` but Not `false`

**What goes wrong:** The existing `sanitize()` function in `firebase.js` removes keys with `undefined` values. If `isAiTranslated` is accidentally set to `undefined` rather than `false` for non-translated sources, the key is dropped on save. This is fine and expected — the field simply won't exist. On load, the UI must treat missing `isAiTranslated` as `false`.

**How to avoid:** Always check `source.isAiTranslated === true` (strict equality), never `source.isAiTranslated` truthy-only, in render conditions.

---

## Code Examples

### Complete Button Rendering Logic in SourceBlock

```jsx
// Source: pattern derived from existing SourceBlock.jsx hasContent() + source-controls pattern

const [isTranslating, setIsTranslating] = useState(false);

const handleAiTranslate = async () => {
    setIsTranslating(true);
    try {
        const heText = Array.isArray(source.he)
            ? source.he.filter(Boolean).join('\n')
            : source.he || '';
        const result = await translateWithAI(source.ref, heText);
        onUpdate({
            aiTranslation: result.translation,
            isAiTranslated: true,
            aiTranslationMeta: {
                isAramaic: result.isAramaic,
                confidence: result.confidence,
                model: result.model
            }
        });
    } catch (err) {
        showToast(`Translation failed: ${err.message}`, 'error');
    } finally {
        setIsTranslating(false);
    }
};

// Render in English column, replacing the "No English text available" block:
{!hasContent(source.en) && !source.isAiTranslated && (
    <div className="empty-content-msg">
        No English text available.{' '}
        <button
            className="translate-ai-btn"
            onClick={handleAiTranslate}
            disabled={isTranslating}
        >
            {isTranslating ? 'Translating...' : 'Translate with AI'}
        </button>
    </div>
)}

{source.isAiTranslated && (
    <>
        <EditableContent
            className="text-eng"
            dir="ltr"
            html={source.aiTranslation}
            onChange={(val) => onUpdate({ aiTranslation: val })}
        />
        <AiTranslationLabel
            isAramaic={source.aiTranslationMeta?.isAramaic}
            confidence={source.aiTranslationMeta?.confidence}
        />
    </>
)}
```

### Firestore Persistence (No Changes Needed)

The existing `saveSheetToFirestore` in `firebase.js` uses `setDoc` with `merge: true` and a `sanitize()` helper that recursively strips `undefined`. Since the new fields (`aiTranslation`, `isAiTranslated`, `aiTranslationMeta`) are added to individual source objects within the `sources` array, they persist automatically when the autosave debounce fires.

The `sources` array is stored as-is on the Firestore document. No schema migration is needed. When loading an old sheet without these fields, `source.isAiTranslated` will be `undefined`, which the `=== true` check treats as false.

**Firestore document shape (after translation):**
```json
{
  "id": "abc123",
  "title": "Shabbat Sources",
  "sources": [
    {
      "ref": "Berakhot 2a:1",
      "he": "מֵאֵימָתַי קוֹרִין...",
      "en": "",
      "aiTranslation": "From when do we recite the Shema in the evening...",
      "isAiTranslated": true,
      "aiTranslationMeta": {
        "isAramaic": false,
        "confidence": "high",
        "model": "claude-haiku-4-5-20251001"
      },
      "viewMode": "bilingual"
    }
  ]
}
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Gemini Flash for all AI in this app | Claude Haiku 4.5 for translation, keep Gemini for chat | Phase 5 | Two API keys; translation quality improves for classical texts |
| `gemini-3-flash-preview` string in chat.js | Current stable is `gemini-2.5-flash` | March 2026 | The chat.js preview model may be deprecated; not in scope for Phase 5 but worth noting |
| In-memory rate limiting (20/min) | In-memory rate limiting (5/min for translate) | Phase 5 | Tighter limit for expensive endpoint |

**Deprecated/outdated:**
- `gemini-3-flash-preview`: Not an officially documented stable model ID. The correct current stable alias is `gemini-2.5-flash`. This is a risk in the existing `chat.js` but out of scope for Phase 5.
- Claude 3 Haiku (`claude-3-haiku-20240307`): Deprecated, retiring April 19, 2026. Do not use. Use `claude-haiku-4-5-20251001`.

---

## Plan Breakdown Recommendation

Phase 5 splits into **3 plans** with clear sequencing. Plan A has no dependencies. Plans B and C depend on Plan A.

### Plan A: `POST /api/translate` Serverless Endpoint

**Scope:** Create `api/translate.js`. Install `@anthropic-ai/sdk`. Add `ANTHROPIC_API_KEY` to Vercel env. Implement rate limiting (5/min). Implement the translation prompt. Return `{ translation, isAramaic, confidence, model }`. Manual curl test against the deployed endpoint.

**Dependencies:** None (can be deployed and tested independently).

**Estimated complexity:** Small — mirrors `api/chat.js` structure exactly.

### Plan B: UI — Translate Button + AI Label in SourceBlock

**Scope:** Create `src/services/aiTranslation.js`. Create `src/components/sheet/AiTranslationLabel.jsx`. Modify `SourceBlock.jsx` to show button when `!hasContent(source.en) && !source.isAiTranslated`, call the endpoint, and call `onUpdate()` with the three new fields. Add `AiTranslationLabel` below the English text for AI-translated sources. Add CSS to `App.css`.

**Dependencies:** Plan A must be deployed (or mocked locally).

**Estimated complexity:** Medium — touches existing component state, conditional render paths.

### Plan C: Export Label Propagation

**Scope:** Modify `src/services/docxExport.js` to prepend `[AI Translation] ` to `englishText` when `source.isAiTranslated`. Verify print CSS badge visibility via `@media print`. Smoke test PDF print and DOCX download for an AI-translated source.

**Dependencies:** Plan B (need `isAiTranslated` and `aiTranslation` fields to exist in store before export logic is meaningful).

**Estimated complexity:** Small — two targeted changes in two files.

---

## Open Questions

1. **Does the project owner want to expose `aiTranslationMeta.confidence` to users?**
   - What we know: The meta object stores confidence; the badge currently shows a note only at `low`
   - What's unclear: Whether `medium` confidence should also show a warning
   - Recommendation: Show warning for `low` only (matches AI-05 requirement to "note uncertainty"); `medium` is normal for ambiguous classical texts

2. **Should AI-translated text be editable?**
   - What we know: `EditableContent` is used for all text; `onUpdate({ aiTranslation: val })` supports edits
   - What's unclear: Whether the product owner wants to allow editing (a scholar correcting the translation) or lock it
   - Recommendation: Allow editing via `EditableContent` — consistent with existing `source.en` editing; educators may want to refine the translation

3. **What happens if the user switches `viewMode` to 'hebrew' and then back to 'bilingual' for an AI-translated source?**
   - What we know: `viewMode` is stored per-source; the English column rendering is conditional
   - What's unclear: No ambiguity — `source.isAiTranslated` persists independently of `viewMode`; both fields coexist safely

---

## Sources

### Primary (HIGH confidence)
- [Anthropic Models Overview](https://platform.claude.com/docs/en/about-claude/models/overview) — current model IDs, pricing, capabilities verified March 2026
- [Anthropic Client SDKs](https://platform.claude.com/docs/en/api/client-sdks) — `@anthropic-ai/sdk` npm package, TypeScript usage pattern
- [Google AI Pricing](https://ai.google.dev/pricing) — Gemini 2.5 Flash and 2.0 Flash token prices
- Existing codebase: `api/chat.js`, `src/services/ai.js`, `src/services/firebase.js`, `src/components/sheet/SourceBlock.jsx`, `src/services/docxExport.js` — patterns read directly

### Secondary (MEDIUM confidence)
- [Vercel Rate Limiting Guide](https://vercel.com/kb/guide/add-rate-limiting-vercel) — WAF rule approach for per-endpoint IP rate limiting
- [Vercel Securing AI Apps](https://vercel.com/kb/guide/securing-ai-app-rate-limiting) — in-memory vs. edge rate limiting tradeoffs
- Claude vs Gemini for multilingual translation — multiple sources (localizejs.com, machinetranslation.com) confirm general Claude strength in nuanced language tasks

### Tertiary (LOW confidence)
- [Talmud & Tech: Claude 3 vs ChatGPT4](https://www.ezrabrand.com/p/claude-3-vs-chatgpt4-a-comparative) — sole source for Claude advantage on Zoharic Aramaic and rabbinic Hebrew. Single informal review; not peer-reviewed. Still the most directly relevant evidence available.

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — `@anthropic-ai/sdk` verified from official Anthropic docs; existing `@google/generative-ai` already in production
- Architecture patterns: HIGH — endpoint pattern derived directly from existing `api/chat.js`; store integration derived from existing `handleUpdateSource`; Firestore persistence derived from existing `sanitize()` and `saveSheetToFirestore`
- Model recommendation (Claude over Gemini): MEDIUM — pricing verified from official sources; quality recommendation based on limited direct evidence for Talmudic Aramaic specifically
- Rate limiting: HIGH — in-memory pattern mirrors existing production code; Vercel WAF guidance from official Vercel docs
- Pitfalls: HIGH — all derived from direct codebase reading (array `he` fields, `data-html2canvas-ignore`, sanitizer behavior)

**Research date:** 2026-03-04
**Valid until:** 2026-06-01 (Gemini model IDs may change; Claude model IDs are versioned and stable; Anthropic SDK is actively maintained)
