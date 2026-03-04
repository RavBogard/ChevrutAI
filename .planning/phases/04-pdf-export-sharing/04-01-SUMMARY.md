---
phase: 04-pdf-export-sharing
plan: 01
subsystem: ui
tags: [print, css, pdf-export, window-print, media-print, rtl, hebrew]

# Dependency graph
requires:
  - phase: 03-core-editor
    provides: SheetView.jsx with handleExportPDF, App.css with existing print block, sheet layout classes

provides:
  - window.print() based PDF export preserving Hebrew text selectability and RTL layout
  - complete @media print block hiding all editor chrome and fixing overflow clipping
  - page-break-inside: avoid on .sortable-item for clean multi-page printing
  - 23 fewer packages in bundle (html2pdf.js removed)

affects: [phase-5-sources, phase-6-polish, any future print/export work]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Browser-native window.print() for PDF export — no JS PDF library"
    - "@media print CSS override pattern — overflow:visible on shell containers to defeat hidden overflow clipping"
    - "page-break-inside:avoid on block-level .sortable-item wrapper (not flex .source-content children)"
    - "document.title swap pattern for PDF filename hint: set before window.print(), restore after"

key-files:
  created:
    - src/test/unit/SheetViewExport.test.jsx
    - src/test/unit/PrintCSS.test.js
  modified:
    - src/components/SheetView.jsx
    - src/App.css
    - package.json
    - package-lock.json

key-decisions:
  - "window.print() replaces html2pdf.js — browser-native print preserves Hebrew text selectability and delegates Unicode BiDi to the browser rendering engine; html2pdf.js rasterizes Hebrew as unselectable images with confirmed RTL/nikud bugs"
  - "overflow:visible !important must be set on both .app-shell and .shell-content in @media print — AppShell.css sets overflow:hidden on both, which clips all content after the first viewport when printing"
  - "page-break-inside:avoid applied to .sortable-item (block-level wrapper) not .source-content (flex container) — per CSS fragmentation spec, page-break on flex containers is unreliable in Chrome/Firefox"
  - "document.title swap pattern sets filename hint: prevTitle stored, sheetTitle set before window.print(), prevTitle restored after; fallback to 'Source Sheet' when sheetTitle is empty"

patterns-established:
  - "Print CSS override: @media print block in App.css overrides AppShell.css overflow:hidden — keep all print overrides consolidated in single @media print block"
  - "TDD for CSS: vitest + fs.readFileSync raw file assertions — jsdom cannot compute print media queries, static CSS string analysis is correct pattern"

requirements-completed: [EXPRT-01, EXPRT-02, EXPRT-03, EXPRT-04]

# Metrics
duration: 4min
completed: 2026-03-04
---

# Phase 4 Plan 1: PDF Export via window.print() Summary

**Replaced html2pdf.js with browser-native window.print() and a 9-section @media print stylesheet that hides editor chrome, fixes overflow clipping, and preserves bilingual Hebrew/English flex columns on paper**

## Performance

- **Duration:** 4 min
- **Started:** 2026-03-04T21:07:27Z
- **Completed:** 2026-03-04T21:11:26Z
- **Tasks:** 2
- **Files modified:** 4 (SheetView.jsx, App.css, package.json, package-lock.json)

## Accomplishments

- Removed html2pdf.js and 23 dependent packages from the bundle — Hebrew text is now selectable in PDF output instead of rasterized as images
- Added complete @media print block to App.css: hides sidebar, header, toolbar, footer, gemini inputs; fixes critical overflow:hidden clipping on .app-shell and .shell-content; page-break-inside:avoid on .sortable-item for multi-page printing
- Preserved bilingual Hebrew/English flex column layout in print via `display: flex !important` on .source-content
- 18 TDD tests pass (3 window.print() behavior + 15 CSS rule assertions)

## Task Commits

Each task was committed atomically (TDD: RED then GREEN):

1. **Task 1 RED: Failing tests for window.print()** - `c1bfa68` (test)
2. **Task 1 GREEN: Replace html2pdf.js with window.print()** - `17dfe85` (feat)
3. **Task 2 RED: Failing CSS tests for @media print block** - `808afbe` (test)
4. **Task 2 GREEN: Add complete @media print block to App.css** - `2f963ce` (feat)

**Plan metadata:** (docs commit — see below)

_Note: TDD tasks have two commits each: failing test (RED) then implementation (GREEN)_

## Files Created/Modified

- `src/components/SheetView.jsx` — Removed `import html2pdf from 'html2pdf.js'` (line 7); replaced handleExportPDF body (was 10 lines calling html2pdf()) with 4-line window.print() implementation with document.title swap
- `src/App.css` — Replaced 12-line minimal print block with 100-line comprehensive @media print block (9 sections)
- `package.json` — html2pdf.js removed from dependencies
- `package-lock.json` — 23 packages removed
- `src/test/unit/SheetViewExport.test.jsx` — 3 tests: window.print() called, title set/restored, empty title fallback
- `src/test/unit/PrintCSS.test.js` — 15 tests: overflow:visible, display:none chrome, page-break-inside, flex columns, dark mode defeat

## Decisions Made

- Used document.title swap pattern (set title → print → restore) rather than a `@page { size }` approach — this provides the PDF filename hint in browser save dialog without requiring user to configure anything
- Consolidated all print rules into single existing @media print block in App.css — not a second block and not in SheetPreview.css — consistent with plan spec and avoids cascade conflicts
- Kept vi.mock('html2pdf.js') in SheetFlow.test.jsx — the mock stubs a non-existent module (Vitest intercepts before resolution), and the tests pass; removing it is a cleanup-only change deferred to avoid scope creep

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- PDF export is fully functional via browser-native print dialog
- Cross-browser validation (Chrome, Firefox, Safari) with 10+ source sheets still needed before marking Phase 4 complete — flagged in STATE.md blockers since Phase 3
- Ready for Phase 4 Plan 2 (next export/sharing plan if it exists) or Phase 5

---
*Phase: 04-pdf-export-sharing*
*Completed: 2026-03-04*

## Self-Check: PASSED
