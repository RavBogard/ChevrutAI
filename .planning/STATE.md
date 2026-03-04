---
gsd_state_version: 1.0
milestone: v1.0
milestone_name: milestone
status: in_progress
last_updated: "2026-03-04T20:36:45Z"
progress:
  total_phases: 6
  completed_phases: 1
  total_plans: 20
  completed_plans: 8
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-03-04)

**Core value:** Rabbi goes from topic to beautiful, print-ready sheet in minutes — with AI helping find sources and fill translation gaps.
**Current focus:** Phase 2 — Hebrew Typography and Bilingual Layout

## Current Position

Phase: 2 of 6 (Hebrew Typography and Bilingual Layout)
Plan: 3 of 4 complete (02-01, 02-02, 02-03 done)
Status: In progress — 02-04 is next
Last activity: 2026-03-04 — Completed 02-03 (TYPO test suite — 57 tests verifying all four TYPO requirements — TYPO-04 complete)

Progress: [######░░░░] 40%

## Performance Metrics

**Velocity:**
- Total plans completed: 8
- Average duration: 5 minutes
- Total execution time: 33 minutes

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| 1 - Data Layer Foundation | 5 | 29 min | 6 min |
| 2 - Hebrew Typography | 3 | 7 min | 2.3 min |

**Recent Trend:**
- Last 5 plans: 01-04 (3 min), 01-05 (2 min), 02-01 (2 min), 02-02 (3 min), 02-03 (2 min)
- Trend: Fast

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
- [01-04]: Messages stay in local useState inside EditorContainer for Phase 1 — store owns only title and sources per research open question #2
- [01-04]: addSource keeps Sefaria fetch + disambiguation logic in EditorContainer and delegates store.addSource as the final write — async logic stays out of Zustand store
- [01-04]: useSheetStore.temporal.getState().clear() called on every sheet load to prevent undo history crossing sheet boundaries
- [01-05]: AuthContext exposes login (wrapping loginWithGoogle) not loginWithGoogle directly in context value — AUTH-01 test asserts typeof login === 'function'
- [01-05]: Firebase mock pattern for React component tests: vi.mock('../services/firebase') capturing subscribeToAuth callback in module-level variable, reset in beforeEach
- [02-01]: Fontsource import placed as first line of main.jsx before index.css — @font-face declarations must be registered before CSS selectors referencing the font family are parsed (Pitfall 3 from research)
- [02-01]: Frank Ruhl Libre Variable fallback chain: Variable -> Static -> David (macOS) -> Arial Hebrew -> serif — covers all platforms
- [02-01]: SheetPreview.css is standalone, not imported from App.css — Phase 4 will extend it with @media print rules
- [02-03]: CSS assertions use fs.readFileSync in vitest/node context — jsdom cannot compute CSS variables or cascade, so class presence + raw CSS file checks are the correct verification pattern for TYPO-01
- [02-03]: RTL bleed test uses row.contains(el) on each [dir=rtl] element — more reliable DOM API for verifying RTL containment than ancestor traversal

### Pending Todos

None yet.

### Blockers/Concerns

- [Phase 4]: Cross-browser print behavior with mixed Hebrew/English columnar layout needs integration testing in Chrome, Firefox, and Safari with 10+ source sheets before marking Phase 4 complete — research flagged this as needing validation
- [Phase 5]: Gemini classical Hebrew and Aramaic translation quality is MEDIUM confidence — needs prompt iteration and human review with actual Talmud Bavli, Mishnah, and Rashi passages before shipping
- [Phase 6]: Sefaria API rate limits are undocumented — use sequential (not concurrent) ref resolution from day one; validate actual threshold during Phase 6
- [Resolved/01-03]: firebase.test.js GoogleAuthProvider mock constructor failure fixed — use function() constructor not arrow function in vi.mock

## Session Continuity

Last session: 2026-03-04
Stopped at: Completed 02-03-PLAN.md (TYPO test suite — 57 tests verifying all four TYPO requirements — TYPO-04 complete)
Resume file: None
