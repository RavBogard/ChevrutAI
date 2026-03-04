---
phase: 05-ai-translation
plan: "01"
subsystem: api
tags: [anthropic, claude, translation, serverless, vercel, rate-limiting, hebrew, aramaic]

# Dependency graph
requires: []
provides:
  - POST /api/translate serverless handler returning { translation, isAramaic, confidence, model }
  - @anthropic-ai/sdk installed and available for server-side use
  - TRANSLATION_SYSTEM_PROMPT that flags Aramaic and marks uncertain passages (satisfies AI-05)
affects:
  - 05-02-PLAN (UI button + label depends on this endpoint existing)
  - 05-03-PLAN (export label propagation depends on isAiTranslated field)

# Tech tracking
tech-stack:
  added:
    - "@anthropic-ai/sdk ^0.78.0"
  patterns:
    - "Vercel serverless handler: export default async function handler(req, res)"
    - "In-memory IP rate limiting via Map with windowStart+count"
    - "JSON parse with regex fallback: rawText.match(/\\{[\\s\\S]*\\}/) then JSON.parse"
    - "API key guard returning 500 before touching the model"

key-files:
  created:
    - api/translate.js
  modified:
    - package.json
    - package-lock.json

key-decisions:
  - "Claude Haiku 4.5 (claude-haiku-4-5-20251001) chosen over Gemini for classical Jewish language quality — rabbinic Hebrew and Talmudic Aramaic handling verified as superior in research"
  - "Rate limit 5/min (not 20 like chat.js) — translation calls are expensive; users rarely need more than a few per minute"
  - "Translation returns complete JSON (no streaming) — single source translation output is short; streaming adds complexity without UX benefit"
  - "AI translation stored in source.aiTranslation, never in source.en — preserves Sefaria data provenance"
  - "JSON fallback wraps raw text with confidence: 'low' when model returns prose instead of JSON"

patterns-established:
  - "Pattern 1: Serverless translate endpoint mirrors api/chat.js handler pattern with same eslint comment, export default, error shape"
  - "Pattern 2: TRANSLATION_SYSTEM_PROMPT instructs model to self-report isAramaic and use [Translator's note: uncertain] for ambiguous passages"

requirements-completed: [AI-01, AI-05]

# Metrics
duration: 2min
completed: 2026-03-04
---

# Phase 5 Plan 01: POST /api/translate Serverless Endpoint Summary

**Claude Haiku 4.5 translation endpoint with rate limiting, Aramaic detection, and uncertainty notation via structured JSON prompt**

## Performance

- **Duration:** 2 min
- **Started:** 2026-03-04T21:25:41Z
- **Completed:** 2026-03-04T21:26:56Z
- **Tasks:** 2/2
- **Files modified:** 3 (api/translate.js created, package.json updated, package-lock.json updated)

## Accomplishments
- Installed @anthropic-ai/sdk ^0.78.0 — Anthropic's official Node.js client with TypeScript types and built-in retry/backoff
- Created api/translate.js — full Vercel serverless handler for POST /api/translate using claude-haiku-4-5-20251001
- TRANSLATION_SYSTEM_PROMPT satisfies AI-05: instructs model to flag Aramaic via `isAramaic`, use `[Translator's note: uncertain]` for ambiguous passages, and `[unclear passage]` for untranslatable segments
- Rate limited to 5 req/min per IP (tighter than chat.js at 20/min — translation is more expensive)
- Response contract confirmed: `{ translation, isAramaic, confidence, model: 'claude-haiku-4-5-20251001' }`

## Task Commits

Each task was committed atomically:

1. **Task 1: Install @anthropic-ai/sdk** - `152984a` (chore)
2. **Task 2: Create api/translate.js endpoint** - `6bacaa5` (feat)

**Plan metadata:** (docs commit — see below)

## Files Created/Modified
- `api/translate.js` - POST /api/translate serverless handler: rate limiting, input validation, ANTHROPIC_API_KEY guard, Claude Haiku 4.5 call, JSON parse fallback, returns { translation, isAramaic, confidence, model }
- `package.json` - Added @anthropic-ai/sdk ^0.78.0 to dependencies
- `package-lock.json` - Updated lockfile for new dependency

## Decisions Made
- **Claude Haiku 4.5 over Gemini:** Research confirms Claude's superior handling of non-standard Hebrew registers (rabbinic Hebrew, Zoharic Aramaic); instruction-following ensures the Aramaic flagging and uncertainty notation prompt reliably executes
- **5 req/min rate limit:** Translation calls cost ~$0.003 each; users translate individual sources on demand (not in bulk); 5/min is ample for normal use
- **No streaming:** Translation returns a complete JSON object (< 400 output tokens); streaming adds complexity without UX benefit
- **JSON fallback with confidence: 'low':** Claude Haiku occasionally returns prose for very short or fragmentary texts; regex + fallback ensures the endpoint always returns the expected shape

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
- Node verify command for Task 1 used `!` which got shell-escaped — verified package.json directly via Read tool instead. No impact on execution.

## User Setup Required

**ANTHROPIC_API_KEY must be added to Vercel project environment variables before the endpoint will function.**

Steps:
1. Go to Vercel dashboard > Project Settings > Environment Variables
2. Add `ANTHROPIC_API_KEY` = your Anthropic API key (from https://console.anthropic.com/settings/keys)
3. Redeploy the project

To verify after deploy:
```bash
curl -X POST https://[your-vercel-url]/api/translate \
  -H "Content-Type: application/json" \
  -d '{"ref":"Berakhot 2a:1","hebrewText":"מֵאֵימָתַי קוֹרִין אֶת שְׁמַע"}'
```

Expected response:
```json
{
  "translation": "From when do we recite the Shema in the evening...",
  "isAramaic": false,
  "confidence": "high",
  "model": "claude-haiku-4-5-20251001"
}
```

## Next Phase Readiness
- 05-02 (UI button + AI label in SourceBlock) can now be implemented — endpoint contract is fixed
- 05-03 (Export label propagation) depends on 05-02 completing first
- Vercel WAF rule targeting `/api/translate` at 5 req/10s per IP is the recommended production complement to in-memory rate limiting (in-memory resets on cold start)

---
*Phase: 05-ai-translation*
*Completed: 2026-03-04*

## Self-Check: PASSED

| Item | Status |
|------|--------|
| api/translate.js | FOUND |
| package.json | FOUND |
| 05-01-SUMMARY.md | FOUND |
| Commit 152984a (chore: install @anthropic-ai/sdk) | FOUND |
| Commit 6bacaa5 (feat: create api/translate.js) | FOUND |
