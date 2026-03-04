---
phase: 06-ai-source-suggestions
plan: "01"
subsystem: api
tags: [gemini, sefaria, serverless, validation, rate-limiting]
dependency_graph:
  requires: ["@google/generative-ai (already in package.json)", "GEMINI_API_KEY env var"]
  provides: ["POST /api/suggest endpoint", "validateRef utility function"]
  affects: ["06-02-PLAN.md (UI consumes this endpoint)"]
tech_stack:
  added: []
  patterns: ["Gemini JSON mode (responseMimeType: application/json)", "Sequential Sefaria validation loop", "Map-based in-memory rate limiting"]
key_files:
  created:
    - api/suggest.js
  modified: []
decisions:
  - "Sequential for-of Sefaria validation (not Promise.all) — Sefaria rate limits are undocumented; sequential is safe"
  - "responseMimeType: application/json passed to Gemini getGenerativeModel — enforces JSON output mode; fallback markdown-fence stripping added for older models"
  - "Results sorted validated-first before returning — better UX for UI consumer (06-02)"
  - "data.text field used (not data.en) — Sefaria live API uses 'text' for English content"
  - "data.error checked explicitly after resp.ok — Sefaria returns HTTP 200 for invalid refs with error in body"
metrics:
  duration: "4 minutes"
  completed: "2026-03-04"
  tasks_completed: 1
  files_created: 1
  files_modified: 0
---

# Phase 06 Plan 01: POST /api/suggest Serverless Endpoint Summary

**One-liner:** Gemini JSON-mode endpoint that generates 5-8 Sefaria refs for a topic and validates each sequentially, returning validated and unvalidated entries with Hebrew/English snippets.

## What Was Built

`api/suggest.js` — a Vercel serverless function at `POST /api/suggest` that:

1. Accepts `{ topic: string }` in the request body
2. Calls Gemini (with `responseMimeType: 'application/json'`) to generate 5-8 Sefaria reference strings
3. Validates each ref sequentially against `https://www.sefaria.org/api/texts/{encoded}?context=0`
4. Returns `{ suggestions: [...] }` with validated and unvalidated entries sorted validated-first

## Interface for Plan 06-02

**Request:** `POST /api/suggest` with `Content-Type: application/json` body `{ "topic": "hospitality" }`

**Response:**
```json
{
  "suggestions": [
    {
      "ref": "Genesis 18:1",
      "heRef": "בראשית י״ח:א׳",
      "he": "first 200 chars of Hebrew text...",
      "en": "first 200 chars of English text...",
      "validated": true,
      "reason": null
    },
    {
      "ref": "FakeBook 99:99",
      "heRef": null,
      "he": null,
      "en": null,
      "validated": false,
      "reason": "Could not find title in reference: FakeBook 99.99"
    }
  ]
}
```

**Error responses:**
- `400 { error: 'topic is required' }` — missing/empty topic
- `400 { error: 'Invalid JSON body' }` — malformed JSON
- `405 { error: 'Method not allowed' }` — non-POST request
- `429 { error: 'Too many requests...' }` — exceeds 20 req/min from same IP
- `500 { error: 'Server configuration error' }` — missing GEMINI_API_KEY
- `500 { error: 'Failed to parse AI response' }` — Gemini returned non-JSON

## Gotchas Documented

1. **Sefaria uses `data.text` not `data.en`** — the English content field is named `text` in Sefaria API responses. Using `data.en` would always produce empty snippets.

2. **Sefaria returns HTTP 200 for invalid refs** — when a ref does not exist, Sefaria still returns HTTP 200 but includes `data.error` (a string) in the body. Code checks `data.error` explicitly after `resp.ok`.

3. **Empty text is also invalid** — after checking for `data.error`, code also checks that at least one of `he` or `en` is non-empty. Some valid-looking refs return empty arrays for both fields.

4. **`normalizeSnippet` strips HTML tags** — Sefaria text fields may contain `<i>`, `<b>`, and other inline HTML. The helper strips all tags before truncating to 200 chars.

5. **Sequential validation required** — Sefaria's rate limits are undocumented. `Promise.all()` could trigger rate limiting for 8 concurrent requests. The `for...of` loop processes one at a time.

## Deviations from Plan

None — plan executed exactly as written.

## Self-Check

- [x] `api/suggest.js` exists at `C:/Users/dsbog/ChevrutAI/api/suggest.js`
- [x] All 8 structural checks pass (validateRef, data.error, responseMimeType, for-of loop, isRateLimited, topic is required, suggestions.sort, Empty text returned)
- [x] Commit `7515404` exists
