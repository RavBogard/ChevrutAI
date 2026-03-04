# Roadmap: ChevrutAI — Jewish Text Sheet Maker

## Overview

ChevrutAI is being rebuilt from its working-but-debt-laden foundation into the best Jewish text sheet maker available. The six phases follow a strict dependency chain: the data layer must stabilize before UI is rebuilt on top of it, Hebrew typography must be correct before PDF export is tested, the editor must be complete before AI features write to it. Each phase delivers a coherent capability that can be verified independently before the next phase begins.

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [x] **Phase 1: Data Layer Foundation** - Migrate sheet state to Zustand, version Firestore schema, stabilize Sefaria text normalization
- [x] **Phase 2: Hebrew Typography and Bilingual Layout** - Establish correct Hebrew font rendering and synagogue bilingual column layout
- [ ] **Phase 3: Core Editor Rebuild** - Rebuild the editor panel on top of the stable store and typography
- [ ] **Phase 4: PDF Export and Public Sharing** - Add print-quality PDF export and public sheet URL sharing
- [ ] **Phase 5: AI Translation** - On-demand AI translation for sources lacking English text
- [ ] **Phase 6: AI Source Suggestions** - Topic-to-source suggestions via Gemini + Sefaria validation

## Phase Details

### Phase 1: Data Layer Foundation
**Goal**: Stable, versioned sheet state that existing user sheets survive and new features can safely build on
**Depends on**: Nothing (first phase)
**Requirements**: DATA-01, DATA-02, DATA-03, DATA-04, AUTH-01, AUTH-02
**Success Criteria** (what must be TRUE):
  1. User can open an existing sheet from before this rebuild without any data loss or broken display
  2. User can add, remove, and reorder sheet sources and undo/redo each action correctly
  3. Sheet state does not split between multiple hooks — a single Zustand store is the sole source of truth
  4. Sefaria text fetch works without runtime errors for Tanakh, Talmud, Mishnah, Rashi, and Zohar sources
  5. User stays logged in with Google across browser refresh (existing Firebase auth validated as working)
**Plans**: 5 plans

Plans:
- [x] 01-01-PLAN.md — Export and test flattenSefariaText against all 6 JaggedArray depths (DATA-03)
- [x] 01-02-PLAN.md — Create useSheetStore with Zustand 5 + zundo temporal middleware and store unit tests (DATA-01, DATA-04)
- [x] 01-03-PLAN.md — Add schemaVersion: 1 to Firestore writes and export loadSheetWithDefaults (DATA-02)
- [x] 01-04-PLAN.md — Wire EditorContainer to useSheetStore; create useAutosave; delete replaced hooks and context (DATA-01, DATA-04)
- [x] 01-05-PLAN.md — Write AuthContext validation tests for AUTH-01 and AUTH-02

### Phase 2: Hebrew Typography and Bilingual Layout
**Goal**: Hebrew text renders beautifully with correct RTL direction, vowel-point clearance, and synagogue bilingual column layout in the editor preview
**Depends on**: Phase 1
**Requirements**: TYPO-01, TYPO-02, TYPO-03, TYPO-04
**Success Criteria** (what must be TRUE):
  1. Hebrew text displays in Frank Ruhl Libre with no nikud (vowel mark) clipping into adjacent lines
  2. Sheet preview shows Hebrew in the right column and English in the left column, matching the standard synagogue bilingual format
  3. Hebrew column text flows right-to-left and English column text flows left-to-right, with no direction bleed into the app shell
  4. Preview renders the bilingual layout correctly at normal screen size before any export
**Plans**: 3 plans

Plans:
- [x] 02-01-PLAN.md — Font setup: install @fontsource-variable/frank-ruhl-libre, update --font-hebrew CSS var, fix line-height to 1.9, create SheetPreview.css (TYPO-01)
- [x] 02-02-PLAN.md — SheetPreview component with BilingualBlock dir="ltr" wrapper and per-column RTL scoping, wire into SheetView (TYPO-02, TYPO-03)
- [x] 02-03-PLAN.md — Integration tests validating all four TYPO requirements (TYPO-04)

### Phase 3: Core Editor Rebuild
**Goal**: Users can build a complete, well-structured sheet through a fast, minimal-friction editor
**Depends on**: Phase 2
**Requirements**: EDIT-01, EDIT-02, EDIT-03, EDIT-04, EDIT-05, EDIT-06, EDIT-07, EDIT-08
**Success Criteria** (what must be TRUE):
  1. User can search Sefaria by reference or keyword, preview Hebrew and English text, and add a source in two clicks or fewer
  2. User can drag sources into a different order and the reorder persists after browser refresh
  3. User can insert their own commentary block and a section header anywhere in the sheet between sources
  4. User sets a sheet title and the sheet saves automatically — no save button required
  5. Existing sheets appear in the user's library and are accessible from the dashboard
**Plans**: 4 plans

Plans:
- [x] 03-01-PLAN.md — Patch addSource uuid assignment, create DividerBlock and SortableItem (EDIT-03, EDIT-04, EDIT-06)
- [x] 03-02-PLAN.md — Build SearchPanel and SearchResultCard with debounced two-mode Sefaria search (EDIT-01, EDIT-02)
- [ ] 03-03-PLAN.md — Build SheetCanvas (DnD + block rendering) and EditorToolbar (EDIT-03, EDIT-04, EDIT-05, EDIT-06, EDIT-07)
- [ ] 03-04-PLAN.md — Wire all components into EditorContainer; smoke test all 8 EDIT requirements (EDIT-01 through EDIT-08)

### Phase 4: PDF Export and Public Sharing
**Goal**: Users can produce a print-ready PDF and share a read-only sheet URL with students
**Depends on**: Phase 3
**Requirements**: EXPRT-01, EXPRT-02, EXPRT-03, EXPRT-04, SHARE-01, SHARE-02, SHARE-03, SHARE-04
**Success Criteria** (what must be TRUE):
  1. User clicks "Print / Export PDF" and the browser print dialog produces a PDF with selectable Hebrew and English text (no image rasterization)
  2. Printed output shows the bilingual column layout with Hebrew RTL preserved — no editor chrome (sidebar, buttons, navigation) appears
  3. Source blocks do not split across page breaks unnecessarily
  4. User marks a sheet public and shares its URL; a recipient without a login can view the sheet read-only
  5. User can filter their sheet library by title to find a specific sheet
**Plans**: 3 plans

Plans:
- [ ] 04-01-PLAN.md — Replace html2pdf.js with window.print() and add complete @media print stylesheet (EXPRT-01, EXPRT-02, EXPRT-03, EXPRT-04)
- [ ] 04-02-PLAN.md — Create firestore.rules with public/private read scoping; add setSheetPublic and getUserSheets to firebase.js (SHARE-01, SHARE-02)
- [ ] 04-03-PLAN.md — Upgrade ShareButton to toggle isPublic; create SheetLibrary component; wire /library route; add read-only mode to EditorContainer (SHARE-01, SHARE-02, SHARE-03, SHARE-04)

### Phase 5: AI Translation
**Goal**: Users can get an AI-generated English translation for any Sefaria source that has no existing translation, with clear attribution
**Depends on**: Phase 4
**Requirements**: AI-01, AI-02, AI-05
**Success Criteria** (what must be TRUE):
  1. A "Translate with AI" button appears on source blocks where the English translation field is empty; it does not appear on already-translated sources
  2. After the user requests translation, the AI translation appears with a non-dismissable "AI Translation — verify before use" label in both the editor and on printed output
  3. The AI translation is stored separately from the Sefaria source text and does not overwrite it
**Plans**: 3 plans

Plans:
- [ ] 05-01-PLAN.md — Create POST /api/translate serverless endpoint with Claude Haiku 4.5, rate limiting (5/min), and AI-05 system prompt (AI-01, AI-05)
- [ ] 05-02-PLAN.md — UI: Translate with AI button + AiTranslationLabel badge in SourceBlock, aiTranslation service, CSS with print rules (AI-01, AI-02)
- [ ] 05-03-PLAN.md — DOCX export: prepend [AI Translation] label when source.isAiTranslated is true (AI-02)

### Phase 6: AI Source Suggestions
**Goal**: Users can describe a topic and receive a ranked list of relevant Sefaria sources they can add to their sheet directly
**Depends on**: Phase 5
**Requirements**: AI-03, AI-04
**Success Criteria** (what must be TRUE):
  1. User enters a topic description and receives a list of Sefaria source references with Hebrew preview snippets
  2. User clicks "Add to sheet" on any suggested source and it appears in the editor immediately
  3. Suggestions that cannot be validated against the Sefaria API degrade gracefully (shown with a warning, not a crash)
**Plans**: 2 plans

Plans:
- [ ] 06-01-PLAN.md — Create POST /api/suggest serverless endpoint with Gemini JSON output and sequential Sefaria validation (AI-03)
- [ ] 06-02-PLAN.md — Build Find Sources tab in ChatSidebar with SuggestPanel, useSuggestions hook, and suggestion card CSS (AI-03, AI-04)

## Progress

**Execution Order:**
Phases execute in numeric order: 1 → 2 → 3 → 4 → 5 → 6

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Data Layer Foundation | 5/5 | Complete | 2026-03-04 |
| 2. Hebrew Typography and Bilingual Layout | 3/3 | Complete | 2026-03-04 |
| 3. Core Editor Rebuild | 2/4 | In progress | - |
| 4. PDF Export and Public Sharing | 0/3 | Not started | - |
| 5. AI Translation | 0/3 | Not started | - |
| 6. AI Source Suggestions | 0/2 | Not started | - |
