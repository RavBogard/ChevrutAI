---
gsd_state_version: 1.0
milestone: v1.0
milestone_name: milestone
status: in_progress
last_updated: "2026-03-04T22:10:00Z"
progress:
  total_phases: 6
  completed_phases: 6
  total_plans: 20
  completed_plans: 20
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-03-04)

**Core value:** Rabbi goes from topic to beautiful, print-ready sheet in minutes — with AI helping find sources and fill translation gaps.
**Current focus:** Phase 6 — AI Source Suggestions (In Progress)

## Current Position

Phase: 6 of 6 (AI Source Suggestions) — COMPLETE
Plan: 2 of 2 complete (06-01 and 06-02 done)
Status: ALL PLANS COMPLETE — full project delivered
Last activity: 2026-03-04 — Completed 06-02 (Find Sources UI: useSuggestions hook + SuggestPanel + ChatSidebar tab wiring + App.css)

Progress: [################] 100%

## Performance Metrics

**Velocity:**
- Total plans completed: 17
- Average duration: 3.4 minutes
- Total execution time: 48 minutes

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| 1 - Data Layer Foundation | 5 | 29 min | 6 min |
| 2 - Hebrew Typography | 3 | 7 min | 2.3 min |
| 3 - Core Editor | 4 | 13 min | 3.3 min |
| 4 - PDF Export & Sharing | 3 | 17 min | 5.7 min |
| 5 - AI Translation (complete) | 3 | 6 min | 2 min |
| 6 - AI Source Suggestions (complete) | 2 of 2 | 12 min | 6 min |

**Recent Trend:**
- Last 5 plans: 05-02 (2 min), 05-03 (2 min), 06-01 (4 min), 06-02 (8 min)
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
- [01-03]: schemaVersion: 1 written unconditionally on every saveSheetToFirestore call so all documents are eventually versioned without a migration script
- [01-02]: Middleware nesting order subscribeWithSelector(devtools(temporal(...))) is required — subscribeWithSelector must be outermost to enable .subscribe(selector, cb) pattern for Plan 04 autosave
- [01-04]: addSource keeps Sefaria fetch + disambiguation logic in EditorContainer and delegates store.addSource as the final write — async logic stays out of Zustand store
- [01-05]: AuthContext exposes login (wrapping loginWithGoogle) not loginWithGoogle directly in context value — AUTH-01 test asserts typeof login === 'function'
- [02-01]: Frank Ruhl Libre Variable fallback chain: Variable -> Static -> David (macOS) -> Arial Hebrew -> serif — covers all platforms
- [03-03]: PointerSensor activationConstraint: { distance: 8 } is the DnD bug fix — original SheetView had no constraint causing drag to steal focus from contentEditable
- [03-04]: Local state for chat (messages), userSheets, Google Docs, and disambiguation stays in EditorContainer — useSheetStore does not have sendMessage/deleteSheet/userSheets; Phase 4 will migrate or clean up
- [04-01]: window.print() replaces html2pdf.js — browser-native print preserves Hebrew text selectability; html2pdf.js rasterizes Hebrew as unselectable images with confirmed RTL/nikud bugs
- [04-01]: overflow:visible !important on both .app-shell and .shell-content in @media print — AppShell.css sets overflow:hidden on both, clipping print content after first viewport
- [04-01]: page-break-inside:avoid on .sortable-item (block wrapper) not .source-content (flex container) — CSS fragmentation spec: page-break on flex containers is unreliable in Chrome/Firefox
- [04-01]: document.title swap pattern: set sheetTitle before window.print(), restore after — provides PDF filename hint in browser save dialog
- [04-02]: allow create uses request.resource.data.ownerId (not resource.data) — on first-time save the document does not exist yet, resource would always fail
- [04-02]: setSheetPublic uses setDoc merge:true so only isPublic is written — prevents race condition with autosave
- [04-02]: getUserSheets is one-time getDocs (not onSnapshot) — SheetLibrary does not need real-time updates on initial load
- [04-03]: isPublic placed in EditorContainer local state (not useSheetPersistence which does not exist) — same pattern as googleDocId/isSyncing; initialized from rawDoc.isPublic on sheet load
- [04-03]: isReadOnly = !isOwner where isOwner checks currentUser + userSheets.some(s => s.id === currentSheetId) — gates entire editor chrome without extra Firestore reads
- [04-03]: ShareButton wired through EditorToolbar (actual toolbar) not SheetToolbar/SheetView (legacy component not mounted in EditorContainer)
- [04-03]: SheetLibrary uses subscribeToUserSheets (real-time) for live updates while library is open
- [05-01]: Claude Haiku 4.5 chosen for translation over Gemini — superior rabbinic Hebrew and Talmudic Aramaic handling
- [05-01]: Rate limit 5/min for translate endpoint (vs 20/min for chat) — translation is expensive, users translate individual sources on demand
- [05-01]: AI translation stored in source.aiTranslation, never source.en — preserves Sefaria data provenance
- [05-02]: AiTranslationLabel placed inside English column div (NOT .source-controls with data-html2canvas-ignore) — ensures badge visible in PDF/html2canvas export
- [05-02]: SourceBlock uses strict isAiTranslated === true check — Firestore sanitize() removes undefined keys; missing field on old sources treated as false
- [05-02]: source.en never overwritten by translate flow — Sefaria data provenance preserved; AI writes to aiTranslation/isAiTranslated/aiTranslationMeta
- [05-03]: formatText called on source.aiTranslation in docxExport (not raw value) — strips HTML from editable field before writing to DOCX cell
- [05-03]: isAiTranslated === true strict check in docxExport — consistent with SourceBlock.jsx; undefined on old sources evaluates false, no false positives
- [06-01]: Sequential for-of Sefaria validation (not Promise.all) — Sefaria rate limits are undocumented; sequential is safe from day one
- [06-01]: responseMimeType: application/json enforces Gemini JSON output; markdown-fence fallback stripping added for older model versions
- [06-01]: data.text field (not data.en) is Sefaria's English content field — verified against live API 2026-03-04
- [06-01]: data.error checked after resp.ok — Sefaria returns HTTP 200 with error body for invalid refs; this is the primary validation failure mode
- [06-02]: Prop-based addSource (not store import) in SuggestPanel — decoupled from Phase 1 Zustand migration, testable in isolation
- [06-02]: useRef(new Map()) cache with toLowerCase() key — avoids redundant fetch for same topic; useRef avoids re-renders on cache write
- [06-02]: CSS class names distinct from chat tab (.suggestion-card vs .source-suggestion-card) — prevents style collision between two tabs

### Pending Todos

None yet.

### Blockers/Concerns

- [Phase 4]: Cross-browser print behavior with mixed Hebrew/English columnar layout needs integration testing in Chrome, Firefox, and Safari with 10+ source sheets before marking Phase 4 complete — research flagged this as needing validation
- [Phase 4]: firestore.rules must be deployed via `firebase deploy --only firestore:rules` before public sharing goes live — not automated in any plan yet
- [Phase 5]: ANTHROPIC_API_KEY must be added to Vercel project environment variables before api/translate.js will function — manual Vercel dashboard step
- [Phase 5]: Translation quality for classical Hebrew/Aramaic needs human review with actual Talmud Bavli, Mishnah, and Rashi passages after deploy
- [Phase 6]: Sefaria API rate limits are undocumented — use sequential (not concurrent) ref resolution from day one; validate actual threshold during Phase 6

## Session Continuity

Last session: 2026-03-04
Stopped at: Completed 06-02-PLAN.md (Find Sources UI: useSuggestions hook + SuggestPanel component + ChatSidebar tab + App.css) — ALL PLANS COMPLETE
Resume file: None
