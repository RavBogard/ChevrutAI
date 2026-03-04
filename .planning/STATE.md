# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-03-04)

**Core value:** Rabbi goes from topic to beautiful, print-ready sheet in minutes — with AI helping find sources and fill translation gaps.
**Current focus:** Phase 1 — Data Layer Foundation

## Current Position

Phase: 1 of 6 (Data Layer Foundation)
Plan: 3 of 5 in current phase
Status: In progress
Last activity: 2026-03-04 — Completed 01-03 (Firestore schemaVersion writes + loadSheetWithDefaults + 5 unit tests)

Progress: [##░░░░░░░░] 10%

## Performance Metrics

**Velocity:**
- Total plans completed: 1
- Average duration: 2 minutes
- Total execution time: 2 minutes

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| 1 - Data Layer Foundation | 1 | 2 min | 2 min |

**Recent Trend:**
- Last 5 plans: 01-01 (2 min)
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

### Pending Todos

None yet.

### Blockers/Concerns

- [Phase 4]: Cross-browser print behavior with mixed Hebrew/English columnar layout needs integration testing in Chrome, Firefox, and Safari with 10+ source sheets before marking Phase 4 complete — research flagged this as needing validation
- [Phase 5]: Gemini classical Hebrew and Aramaic translation quality is MEDIUM confidence — needs prompt iteration and human review with actual Talmud Bavli, Mishnah, and Rashi passages before shipping
- [Phase 6]: Sefaria API rate limits are undocumented — use sequential (not concurrent) ref resolution from day one; validate actual threshold during Phase 6
- [Deferred/01-01]: firebase.test.js has a pre-existing mock constructor failure (GoogleAuthProvider) unrelated to this plan — needs investigation

## Session Continuity

Last session: 2026-03-04
Stopped at: Completed 01-01-PLAN.md (flattenSefariaText TDD)
Resume file: None
