---
phase: 05-ai-translation
plan: "02"
subsystem: ui
tags: [react, ai-translation, anthropic, badge, SourceBlock, fetch, css, print]

# Dependency graph
requires:
  - phase: 05-01
    provides: POST /api/translate endpoint returning { translation, isAramaic, confidence, model }
provides:
  - translateWithAI fetch wrapper and normalizeText helper in src/services/aiTranslation.js
  - Non-dismissable AiTranslationLabel badge component (ai-translation-badge CSS class)
  - SourceBlock.jsx translate button (shows when source.en empty and isAiTranslated is not true)
  - SourceBlock.jsx AI translation render branch (editable aiTranslation + badge inside English column)
  - CSS for .ai-translation-badge, .translate-ai-btn, @media print badge survival
affects:
  - 05-03-PLAN (docxExport.js uses source.isAiTranslated + source.aiTranslation established here)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "translateWithAI fetch wrapper throws Error with server message on non-OK response"
    - "normalizeText: handles string | string[] | falsy — joins arrays with newline"
    - "AiTranslationLabel: pure presentational component, no state, non-dismissable"
    - "SourceBlock three-way render: isAiTranslated -> aiTranslation+badge | !hasContent(en) -> translate button | hasContent(en) -> EditableContent"
    - "isTranslating useState per-component prevents double-submit during async API call"
    - "source.en never overwritten — AI writes to aiTranslation/isAiTranslated/aiTranslationMeta only"
    - "AiTranslationLabel inside English column div (NOT .source-controls with data-html2canvas-ignore)"

key-files:
  created:
    - src/services/aiTranslation.js
    - src/components/sheet/AiTranslationLabel.jsx
  modified:
    - src/components/sheet/SourceBlock.jsx
    - src/App.css

key-decisions:
  - "AiTranslationLabel placed inside the English column flex div (not .source-controls) to ensure badge is visible in PDF/html2canvas export"
  - "Three-way conditional render in SourceBlock: isAiTranslated takes priority, then no-en shows button, then has-en shows EditableContent — strict isAiTranslated === true check per research pitfall #5"
  - "source.en is never written by translate flow — preserves Sefaria data provenance; edits go to aiTranslation field"
  - "Button disabled during isTranslating state to prevent double-submit concurrent API calls"

patterns-established:
  - "Pattern 1: aiTranslation.js fetch wrapper — normalizeText + translateWithAI with error throw"
  - "Pattern 2: AiTranslationLabel — non-dismissable badge with conditional isAramaic and confidence='low' indicators"
  - "Pattern 3: Three-way English column render with isAiTranslated priority check"

requirements-completed: [AI-01, AI-02]

# Metrics
duration: 2min
completed: 2026-03-04
---

# Phase 5 Plan 02: AI Translation UI — Translate Button and Badge in SourceBlock Summary

**React fetch service + non-dismissable AI Translation badge component + SourceBlock translate button wired to /api/translate, with CSS print media rule ensuring badge survives PDF export**

## Performance

- **Duration:** 2 min
- **Started:** 2026-03-04T21:29:41Z
- **Completed:** 2026-03-04T21:31:34Z
- **Tasks:** 2/2
- **Files modified:** 4 (2 created, 2 modified)

## Accomplishments
- Created `src/services/aiTranslation.js` — `normalizeText` handles `string | string[] | falsy` sources (prevents `[object Array]` being sent to the API), `translateWithAI` POSTs to `/api/translate` and throws with the server's error message on non-OK responses
- Created `src/components/sheet/AiTranslationLabel.jsx` — non-dismissable badge with conditional Aramaic warning (`isAramaic`) and uncertainty note (`confidence === 'low'`); no close button per AI-02
- Updated `src/components/sheet/SourceBlock.jsx` — three-way render: `isAiTranslated === true` shows editable `aiTranslation` + badge; `!hasContent(en)` shows translate button (disabled during `isTranslating`); `hasContent(en)` shows existing `EditableContent`; badge is inside the English column div, NOT inside `.source-controls` (which has `data-html2canvas-ignore="true"`)
- Updated `src/App.css` — `.ai-translation-badge`, `.ai-translation-badge__aramaic`, `.ai-translation-badge__uncertainty`, `.translate-ai-btn`, `@media print` badge rule with `print-color-adjust: exact`
- Build passes (`npm run build` exit 0); no new lint errors in plan files

## Task Commits

Each task was committed atomically:

1. **Task 1: Create aiTranslation service and AiTranslationLabel component** - `0d474ce` (feat)
2. **Task 2: Update SourceBlock.jsx and add CSS to App.css** - `2243c21` (feat)

**Plan metadata:** (docs commit — see below)

## Files Created/Modified
- `src/services/aiTranslation.js` - normalizeText helper + translateWithAI fetch wrapper for POST /api/translate; throws Error with server message on non-OK status
- `src/components/sheet/AiTranslationLabel.jsx` - Non-dismissable AI Translation badge; conditional Aramaic warning and uncertainty indicator; PropTypes for isAramaic (bool) and confidence (string)
- `src/components/sheet/SourceBlock.jsx` - Added useToast, translateWithAI, normalizeText, AiTranslationLabel imports; isTranslating state; handleAiTranslate async handler; three-way English column render
- `src/App.css` - Added .ai-translation-badge, .ai-translation-badge__aramaic/__uncertainty, .translate-ai-btn/:disabled, @media print badge rule

## Decisions Made
- **Badge placement inside English column:** AiTranslationLabel must NOT be inside `.source-controls` (line 77 of SourceBlock) because that div has `data-html2canvas-ignore="true"` — placing the badge there would hide it in PDF export. It is placed inside the English column flex div (line 129–164), below the EditableContent.
- **Strict `isAiTranslated === true` check:** Firestore sanitize() removes undefined keys; `source.isAiTranslated` will be missing on old sources (treated as false with `=== true` strict check but would be truthy if stored as 1 — strict equality prevents false positives).
- **source.en never written by translate flow:** `onUpdate` writes to `aiTranslation`, `isAiTranslated`, `aiTranslationMeta` only. Sefaria-licensed `en` field is never overwritten to preserve data provenance.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
- Task 2 automated verify command used `!` in node -e which triggered shell escaping; resolved by writing the verify script to a `.cjs` file and running `node verify-task2.cjs`. No impact on implementation.

## User Setup Required

None - no external service configuration required for the UI layer. (ANTHROPIC_API_KEY setup documented in 05-01-SUMMARY.md for the endpoint itself.)

## Next Phase Readiness
- 05-03 (DOCX export label propagation + print CSS smoke test) can now be implemented — `source.isAiTranslated` and `source.aiTranslation` fields established in store
- The interactive flow (button click -> /api/translate -> badge renders) can be verified in a running dev server once ANTHROPIC_API_KEY is configured in Vercel environment

---
*Phase: 05-ai-translation*
*Completed: 2026-03-04*

## Self-Check: PASSED

| Item | Status |
|------|--------|
| src/services/aiTranslation.js | FOUND |
| src/components/sheet/AiTranslationLabel.jsx | FOUND |
| src/components/sheet/SourceBlock.jsx (modified) | FOUND |
| src/App.css (modified) | FOUND |
| Commit 0d474ce (feat: create aiTranslation service and AiTranslationLabel) | FOUND |
| Commit 2243c21 (feat: update SourceBlock and add CSS) | FOUND |
| npm run build — exit 0 | PASSED |
| No new lint errors in plan files | PASSED |
