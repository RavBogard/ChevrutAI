# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-03-04)

**Core value:** Rabbi goes from topic to beautiful, print-ready sheet in minutes — with AI helping find sources and fill translation gaps.
**Current focus:** Phase 1 — Data Layer Foundation

## Current Position

Phase: 1 of 6 (Data Layer Foundation)
Plan: 3 of 5 complete (01-01, 01-02, 01-03 done; 01-04 next)
Status: In progress
Last activity: 2026-03-04 — Completed 01-03 (Firestore schemaVersion: 1 on all writes + loadSheetWithDefaults with ?? defaults + 5 unit tests)

Progress: [###░░░░░░░] 15%

## Performance Metrics

**Velocity:**
- Total plans completed: 3
- Average duration: 8 minutes
- Total execution time: 24 minutes

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| 1 - Data Layer Foundation | 3 | 24 min | 8 min |

**Recent Trend:**
- Last 5 plans: 01-01 (2 min), 01-03 (12 min), 01-02 (10 min)
- Trend: -

*Updated after each plan completion*

## Accumulated Context

### Decisions

Decisions are logged in PROJECT.MD Key Decisions table.
Recent decisions affecting current work:

- [Pre-Phase 1]: CSS @media print + window.print() is the only viable Hebrew PDF export — all JS PDF libraries (@react-pdf/renderer, jsPDF, html2pdf.js) have unfixed Hebrew rendering failures as of March 2026
- [Pre-Phase 1]: Frank Ruhl Libre must be self-hosted WOFF2 in /public/fonts/ — CDN delivery is unreliable at print time
- [Pre-Phase 1]: direction: rtl must never be set on the HTML root — scoped per-column only
- [Pre-Phase 1]: Firestore public read rule must be scoped to isPublic == true, not allow read: if true at collection level
- [01-01]: Added flattenSefariaText as parallel export alongside private normalizeText — avoids refactor risk to 3 existing internal callers
- [01-01]: flattenSefariaText uses filter(Boolean) unlike normalizeText — correctly handles Sefaria sparse/gap nodes in JaggedArrays
- [01-03]: schemaVersion: 1 written unconditionally on every saveSheetToFirestore call so all documents are eventually versioned without a migration script
- [01-03]: schemaVersion: 0 is the sentinel for pre-versioning documents; loadSheetWithDefaults() uses ?? (nullish coalescing) to apply safe defaults
- [01-03]: Firebase SDK vi.mocks must use function() constructors (not arrow functions) for exports used with 'new' keyword
- [01-02]: zundo partialize alone is insufficient to exclude status flags from undo history — equality option required: (a, b) => a.sources === b.sources && a.title === b.title prevents false history entries on set() calls that don't change tracked fields
- [01-02]: Middleware nesting order subscribeWithSelector(devtools(temporal(...))) is required — subscribeWithSelector must be outermost to enable .subscribe(selector, cb) pattern for Plan 04 autosave

### Pending Todos

None yet.

### Blockers/Concerns

- [Phase 4]: Cross-browser print behavior with mixed Hebrew/English columnar layout needs integration testing in Chrome, Firefox, and Safari with 10+ source sheets before marking Phase 4 complete — research flagged this as needing validation
- [Phase 5]: Gemini classical Hebrew and Aramaic translation quality is MEDIUM confidence — needs prompt iteration and human review with actual Talmud Bavli, Mishnah, and Rashi passages before shipping
- [Phase 6]: Sefaria API rate limits are undocumented — use sequential (not concurrent) ref resolution from day one; validate actual threshold during Phase 6
- [Resolved/01-03]: firebase.test.js GoogleAuthProvider mock constructor failure fixed — use function() constructor not arrow function in vi.mock

## Session Continuity

Last session: 2026-03-04
Stopped at: Completed 01-02-PLAN.md (useSheetStore + zundo temporal + 26 unit tests)
Resume file: None
