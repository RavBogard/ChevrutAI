---
phase: 02-hebrew-typography
plan: "01"
subsystem: frontend-typography
tags: [hebrew, fonts, css, fontsource, rtl, nikud]
dependency_graph:
  requires: []
  provides: [font-frank-ruhl-libre, css-var-font-hebrew, sheetpreview-css-foundation]
  affects: [src/main.jsx, src/App.css, src/components/sheet/SheetPreview.css]
tech_stack:
  added: ["@fontsource-variable/frank-ruhl-libre@5.2.8"]
  patterns: ["Fontsource variable font import at entry point", "Scoped RTL with unicode-bidi: embed", "CSS variable font-family fallback chain"]
key_files:
  created: ["src/components/sheet/SheetPreview.css"]
  modified: ["src/main.jsx", "src/App.css", "package.json"]
decisions:
  - "Fontsource import placed as first line of main.jsx before index.css to ensure @font-face declarations are available when CSS selectors referencing the font are parsed"
  - "Font fallback chain: Frank Ruhl Libre Variable -> Frank Ruhl Libre -> David (macOS) -> Arial Hebrew -> serif"
  - "SheetPreview.css is standalone and not imported from App.css — Phase 4 will extend it with @media print rules"
metrics:
  duration: "2 minutes"
  completed_date: "2026-03-04"
  tasks_completed: 3
  files_changed: 4
---

# Phase 2 Plan 1: Hebrew Typography Foundation Summary

Frank Ruhl Libre Variable installed via Fontsource with nikud-safe line-height (1.9) and scoped RTL bilingual column CSS.

## What Was Built

Three targeted changes establish the typography foundation that Plan 02-02 (SheetPreview component) builds on:

1. **Frank Ruhl Libre Variable installed** (`@fontsource-variable/frank-ruhl-libre` v5.2.8) — includes Hebrew WOFF2 subset with unicode-range U+0590-05FF covering nikud (vowel marks)
2. **Entry-point import** added as the first line of `src/main.jsx`, before `index.css`, ensuring `@font-face` declarations are registered before any CSS selectors referencing the font family are parsed
3. **`--font-hebrew` CSS variable updated** in `src/App.css :root` from Heebo (sans-serif) to Frank Ruhl Libre Variable with a full fallback chain
4. **`.text-heb` line-height fixed** from 1.6 to 1.9 — satisfies TYPO-01 requirement of 1.8+ minimum for nikud clearance
5. **`SheetPreview.css` created** — complete bilingual column layout with scoped RTL (`direction: rtl; unicode-bidi: embed`), responsive mobile stacking, and single-language fallback modifiers

## Commits

| Task | Commit | Description |
|------|--------|-------------|
| Task 1 | ab4ae6d | feat(02-01): install Frank Ruhl Libre Variable and add entry-point import |
| Task 2 | a92fda5 | feat(02-01): fix --font-hebrew CSS variable and .text-heb line-height |
| Task 3 | 6b1c108 | feat(02-01): create SheetPreview.css with complete bilingual column styles |

## Verification Results

All 5 plan verification checks passed:

1. `@fontsource-variable/frank-ruhl-libre` in package.json dependencies — PASS
2. `import '@fontsource-variable/frank-ruhl-libre'` as first line of src/main.jsx — PASS
3. `--font-hebrew: 'Frank Ruhl Libre Variable', ...` in App.css :root — PASS
4. `.text-heb { line-height: 1.9 }` in App.css — PASS
5. `unicode-bidi: embed` in SheetPreview.css — PASS
6. `npm run build` exits 0 — PASS (built in 5.10s)

## Deviations from Plan

None — plan executed exactly as written.

## Key Design Notes

- `unicode-bidi: embed` on both `.source-col--hebrew` and `.source-col--english` prevents bidi bleed across column boundaries — critical for mixed RTL/LTR flex layout
- `dir="ltr"` on `.source-bilingual-row` wrapper (applied in JSX by Plan 02-02) anchors physical column order so Hebrew always renders on the right regardless of inherited document direction
- Hebrew stacks on top in mobile view (`order: 1`) as the primary script for the synagogue/synagogue context this app serves
- `.title-input { font-family: 'Frank Ruhl Libre', serif }` was intentionally left unchanged — static variant name remains valid as a fallback per plan instructions

## Self-Check

Verified files exist and commits are present:

- src/main.jsx: FOUND
- src/App.css: FOUND
- src/components/sheet/SheetPreview.css: FOUND
- Commit ab4ae6d: FOUND
- Commit a92fda5: FOUND
- Commit 6b1c108: FOUND

## Self-Check: PASSED
