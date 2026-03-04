# Project Research Summary

**Project:** ChevrutAI — Hebrew/English Source Sheet Maker
**Domain:** Jewish text document editor with bilingual PDF export and AI integration
**Researched:** 2026-03-04
**Confidence:** MEDIUM-HIGH

## Executive Summary

ChevrutAI is a domain-specific document editor for rabbis and Jewish educators, not a general text editor. It produces source sheets — the foundational artifact of Jewish pedagogy, with 70+ years of physical convention — organized around a theme or question, layering primary texts (Torah, Talmud, Midrash) with commentary, always in Hebrew-right / English-left bilingual layout. The incumbent tool (Sefaria's sheet maker) has no reliable PDF export, no AI features, and no creation-first workflow. ChevrutAI's differentiation is clear: beautiful print-ready output, AI-assisted sourcing, and on-demand translation for texts that have no existing English version. Every technical decision must serve the physical handout as the primary deliverable.

The recommended approach for this milestone is a targeted rebuild of the React SPA's state management layer (replacing the 744-line `useSheetPersistence` monolith with a Zustand store), followed by adding PDF export via native CSS `@media print` + `window.print()`, then public sharing via Firestore security rules, and finally AI translation and source suggestion via the existing Gemini serverless infrastructure. The key technology bet is CSS-native PDF rather than any JavaScript PDF library — every tested library (`@react-pdf/renderer`, `html2pdf.js`, `jsPDF`, `pdfmake`) has documented, unfixed Hebrew rendering failures as of March 2026. CSS print inherits the browser's correct RTL rendering at zero dependency cost.

The top risks are: (1) Hebrew nikud (vowel marks) causing line-height collisions in PDF output — mitigated by setting `line-height: 2` minimum on all Hebrew containers and testing with actual pointed texts before shipping; (2) the Firestore schema migration breaking existing user sheets when new fields are added — mitigated by a `schemaVersion` field and defensive defaults on all reads; and (3) AI translation hallucination on classical Aramaic texts (Talmud Bavli, Zohar) — mitigated by requiring explicit user action, storing translations separately from Sefaria text, and displaying a non-dismissable "AI Translation — verify before use" disclaimer. These three risks are not hypothetical — they are documented failure modes that have burned previous implementations.

---

## Key Findings

### Recommended Stack

The existing stack (React 19, Vite, Firebase, Gemini, Vercel) requires no new infrastructure. The new additions are minimal: Frank Ruhl Libre font (self-hosted WOFF2 in `/public/fonts/` — do not use Google Fonts CDN for print because external font requests can fail before the print dialog opens), Zustand for sheet state management, and a new `/api/translate` Vercel serverless function modeled on the existing `/api/chat` pattern. All JavaScript PDF libraries with native Hebrew text rendering are categorically broken and must not be used.

**Core technologies:**
- `CSS @media print` + `window.print()`: Primary PDF export mechanism — zero dependencies, correct RTL rendering, no canvas size limits. This is the only viable approach for Hebrew text PDFs in a browser-based app as of March 2026.
- `Frank Ruhl Libre` (self-hosted WOFF2): Hebrew body font — the direct digital descendant of the dominant Israeli print serif, free, variable weight, full nikud support. Must be self-hosted; CDN delivery is unreliable at print time.
- `Zustand`: Sheet state management — replaces tangled `useSheetPersistence` hook. Selective subscriptions prevent full-tree re-renders on every source edit.
- `zundo` (Zustand middleware): Undo/redo — replaces the existing custom `useUndoRedo` hook with correct immutable history management.
- `Firestore public read rules + React Router /sheet/:id`: Public sharing — no new dependencies. The existing Firestore document ID is a 20-character random string; enumeration is impractical.
- Existing Gemini serverless via `/api/translate`: AI translation — extends the pattern of `/api/chat.js` with a scholarly translation prompt and no streaming.

**What NOT to use:**
- `@react-pdf/renderer`: Hebrew rendering broken (GitHub issue #3010, filed Dec 2024, open as of March 2026)
- `html2pdf.js` (existing dep): Canvas rasterization produces 28MB image-only PDFs; no text selectability; canvas height limit clips sheets with 8+ sources
- `jsPDF`: BiDi support broken as of December 2024 (GitHub issue #3807)
- `Firebase Dynamic Links`: Deprecated, shutting down
- `direction: rtl` on `<html>` root: Flips the entire app UI

---

### Expected Features

ChevrutAI must outperform Sefaria on its core workflow: rabbi builds a beautiful print-ready sheet in minutes. Sefaria's concrete gaps are: no reliable one-click PDF, no AI features, no creation-first workflow, and output that looks like a web page printed rather than a designed handout.

**Must have (table stakes):**
- Hebrew/English bilingual display, side-by-side, Hebrew on right — 70 years of convention; non-negotiable
- Frank Ruhl Libre Hebrew typography with nikud support — wrong fonts destroy credibility with target users
- One-click PDF export with correct Hebrew RTL — the #1 Sefaria complaint and the core differentiator
- Custom text/commentary blocks — every educator adds their own words between sources
- Section headers and dividers — structure for multi-part shiurim
- Drag-and-drop source reordering — educators iterate their set list constantly
- Autosave to Firestore — sheets take days to build; data loss is unforgivable
- Public share URL — educators send sheet links to students before class
- Sheet library with search — rabbis have dozens of sheets; basic organization is expected
- Creator attribution — rabbis put their name on their sheets, always, including on printed output

**Should have (competitive differentiators):**
- AI translation per source, on demand — many Sefaria texts have no English; this is a true gap ChevrutAI fills
- AI topic-to-source suggestions — cuts sourcing research from hours to minutes; the core AI value proposition
- Beautiful synagogue handout aesthetic — designed print output, not a web page printed
- Commentary-aware visual distinction — editors' words vs. Sefaria source text must look different
- "No English translation" indicator in search results before adding a source

**Defer to v2+:**
- Real-time collaborative editing — requires WebSocket infrastructure, conflict resolution, presence indicators; massive scope for v1
- Native mobile app — web-on-tablet works; native doubles development surface
- Version history / git-like branching — undo/redo plus autosave covers the real need
- Social discovery and public sheet index — Sefaria already has this; do not compete on their strength
- Paid tiers / feature gating — explicitly out of scope in PROJECT.md

---

### Architecture Approach

The rebuild is a **partial rebuild driven by structural debt**, not a feature addition. The existing `useSheetPersistence` hook (744 lines managing seven concerns), a duplicate dead hook (`useFirestore.js`), and state duplicated across `SourceSheetContext` and the persistence hook make it dangerous to add PDF export, public sharing, and AI features on top of the current code. The architecture must be fixed first, then features added on top of a stable foundation.

The core pattern is a Zustand store as single source of truth, with three separate React subtrees — Editor, Preview, and Print — all consuming the same store with different CSS and interaction behaviors. The `PrintDocument` component is always mounted but visually hidden off-screen, targeting only the print-ready DOM; the editor is never involved in the print pipeline. AI features are isolated in their own hooks (`useAITranslation`, `useSourceSuggestions`) and interact only with store mutation actions.

**Major components:**
1. `useSheetStore` (Zustand) — all mutable sheet state: sources, title, undo/redo, save status, AI-in-progress flags. Single source of truth. Autosave middleware writes to Firestore with 1000ms debounce.
2. `EditorPanel` — drag-drop reordering, block editing, source addition. Reads and writes to store. Never touches print DOM.
3. `PrintDocument` — off-screen, always-mounted print target. Same store data, entirely print-focused components and CSS. `react-to-print` targets this component's ref.
4. `AISidebar` — chat, translation requests, source suggestions. Reads store for context; writes to store only on explicit user acceptance of suggestions.
5. `PublicSheetView` — unauthenticated read-only route (`/sheet/:id`). Fetches Firestore doc directly, no auth check, same display components as PreviewPanel.

**Key patterns:**
- Unidirectional data flow: Store → Components → Store (via actions) → Firestore (via debounced autosave)
- Hebrew typography via CSS class names only — never inline styles, which block `@media print` overrides
- CSS Grid for bilingual layout (not Flexbox for print — tables or Grid have better cross-browser print support)
- `@font-face` declarations in `<style>` tag in document `<head>` (not external CSS) to avoid font loading race with print dialog

---

### Critical Pitfalls

1. **Hebrew nikud breaks PDF line height** — Combining diacritic marks clip into adjacent lines at standard `line-height: 1.5`. Fix: set `line-height: 2` or higher on all Hebrew containers; test with a pointed Talmud passage before marking PDF export complete. This is a visual bug that target users will immediately notice.

2. **html2pdf.js canvas approach clips and loses text** — The existing dependency rasterizes DOM to an image: 28MB files, no text selection, canvas height limit clips sheets with 8+ sources. Fix: remove `html2pdf.js` as the PDF path; use `window.print()` with `@media print` CSS targeting the off-screen `PrintDocument` component.

3. **Firestore schema migration silently breaks old sheets** — New fields (`isPublic`, `aiTranslation`, `schemaVersion`) are absent on old documents; reads return `undefined` and features silently fail. Fix: add `schemaVersion: 1` from day one; use defensive defaults everywhere (`sheet.isPublic ?? false`); run lazy client-side migration on read before any schema-dependent feature ships.

4. **Sefaria API nested text array structure varies by source type** — Tanakh returns flat `string[]`; Talmud returns nested `string[][]`; some commentaries return SchemaNode structures that fail entirely. The existing normalization code is untested per CONCERNS.md. Fix: write and unit-test `flattenSefariaText()` covering at minimum: one Tanakh verse, one Mishnah passage, one Gemara sugya, one Rashi comment, one Zohar passage. Do this before building any dependent feature.

5. **AI translation hallucination on Aramaic texts** — LLMs produce fluent, confident, wrong translations of classical Talmudic and Zohar passages. Aramaic is frequently misidentified as Hebrew. Fix: require explicit user action (never auto-trigger); store AI translation in `source.aiTranslation` separate from Sefaria `text` field; display non-dismissable "AI Translation — verify before use" badge; add Aramaic detection note in UI for Talmud Bavli sources.

6. **Public sharing security rules exposing private sheets** — `allow read: if true` at the collection level exposes all user sheets to anonymous reads. Fix: scope the rule to `resource.data.isPublic == true || request.auth.uid == resource.data.ownerId`; test with Firebase Rules Simulator against a private sheet before shipping.

---

## Implications for Roadmap

The architecture research is explicit about build order: store before components, editor before export, export before AI. The pitfalls research adds two cross-cutting requirements: Sefaria text normalization must be stabilized before any dependent feature ships, and the Firestore schema must be versioned before any new fields are added. This yields a natural phase sequence.

### Phase 1: Data Layer Foundation

**Rationale:** Every subsequent phase depends on stable sheet state. The current `useSheetPersistence` monolith and duplicate `SourceSheetContext` make it impossible to safely add new features. This must be fixed first. The Sefaria text normalization is also a prerequisite — broken text fetching corrupts the core value delivery.

**Delivers:** Zustand store with full sheet state, undo/redo via `zundo`, autosave middleware, dead code removal (`useFirestore.js`, `SourceSheetContext`), and a tested `flattenSefariaText()` utility with coverage for all major Sefaria source types.

**Addresses (from FEATURES.md):** Autosave reliability; drag-and-drop reorder stability; foundation for all other features.

**Avoids (from PITFALLS.md):** State desync between duplicate hooks; untested Sefaria text normalization shipping with new features on top.

**Research flag:** Standard patterns — Zustand migration is well-documented. No additional research needed.

---

### Phase 2: Hebrew Typography and Bilingual Layout

**Rationale:** Typography and layout must be correct in the editor before PDF export is built. If Hebrew RTL is broken or nikud line heights are wrong at this phase, every downstream test is invalid. This is the visual foundation.

**Delivers:** Frank Ruhl Libre self-hosted in `/public/fonts/` with `@font-face` in `<head>`; Hebrew CSS class (`source-hebrew`) with `line-height: 2`, `direction: rtl`, `unicode-bidi: embed`; CSS Grid bilingual layout with Hebrew in right column; `hebrew.css` and `print.css` as dedicated stylesheets (not CSS Modules — `@page` rules cannot live in CSS Modules scope); validated render of pointed Hebrew text with no nikud clipping.

**Addresses (from FEATURES.md):** Hebrew/English bilingual display; correct Hebrew typography; synagogue handout aesthetic.

**Avoids (from PITFALLS.md):** Nikud line-height collision; inline styles blocking print overrides; `direction: rtl` on root.

**Research flag:** Standard patterns — well-documented CSS. No additional research needed.

---

### Phase 3: Core Editor Rebuild

**Rationale:** With the store and typography in place, rebuild the editor panel consuming them. This is the primary user interaction surface. Rebuilding here validates that the store interface is correct before adding export and AI layers on top.

**Delivers:** `EditorPanel` with drag-drop reorder consuming Zustand store; `SourceBlock`, `CustomSourceBlock`, `SectionHeaderBlock` components; `SourceAddBar` with Sefaria search; `SheetToolbar` with title editing, undo/redo; `SavingIndicator`; `DisambiguationModal` for ambiguous refs; creator attribution field.

**Addresses (from FEATURES.md):** Custom text/commentary blocks; section headers and dividers; drag-and-drop reorder; sheet title editing; creator attribution; sheet library with search.

**Avoids (from PITFALLS.md):** XSS in user-authored commentary (integrate DOMPurify at this phase); anti-pattern of adding new features to the old monolith hook.

**Research flag:** Standard patterns — React component patterns are well-documented. No additional research needed.

---

### Phase 4: PDF Export and Public Sharing

**Rationale:** These two features share the requirement for a stable, read-only representation of the sheet — `PrintDocument` for PDF, `PublicSheetView` for sharing. They also share the Firestore schema addition (`isPublic`, `schemaVersion`) which must be handled together to avoid multiple migration rounds.

**Delivers:** `PrintDocument` off-screen component with full print CSS; `window.print()` triggered via `useExport` hook; `@page` CSS with Letter size, 0.75in margins, `break-inside: avoid` on source blocks; `PublicSheetView` at `/sheet/:id` (unauthenticated, read-only); "Share" button generating public URL; `isPublic` field on Firestore documents; Firestore security rules scoped to `isPublic == true`; `schemaVersion: 1` field with client-side lazy migration for old documents.

**Addresses (from FEATURES.md):** One-click reliable PDF export; print-optimized layout; public share URL.

**Avoids (from PITFALLS.md):** html2canvas canvas size limit (use window.print, not html2pdf); nikud PDF line-height (validated in Phase 2); Firestore public rule at collection level (scoped to isPublic field); schema migration breaking old sheets (schemaVersion + defensive defaults).

**Research flag:** Needs deeper research during planning — specifically: (a) test `window.print()` behavior across Chrome, Firefox, and Safari with a 10+ source sheet containing pointed Hebrew; (b) validate `break-inside: avoid` behavior with mismatched Hebrew/English column heights.

---

### Phase 5: AI Translation

**Rationale:** AI translation is additive — it fires on user action, stores in the existing sheet data structure, and is purely enhancing. It must come after the editor and PDF export are stable because the AI translation output needs to appear correctly in both the editor view and the PDF.

**Delivers:** `/api/translate` Vercel serverless function with scholarly Hebrew translation prompt, Aramaic detection note, confidence indicator instruction; `useAITranslation` hook with per-source loading/error state; "Translate with AI" button appearing on source blocks where `text` field is empty; non-dismissable "AI Translation — verify before use" badge on translated blocks; AI translation stored in `source.aiTranslation` (never overwrites Sefaria `text`); in-memory rate limiting (document as needing upgrade before high traffic).

**Addresses (from FEATURES.md):** AI translation per source, on demand; AI translation labeled as AI; "No English translation" indicator in search.

**Avoids (from PITFALLS.md):** Auto-triggering translation (on-demand only); hallucination without disclaimer (non-dismissable badge); overwriting Sefaria text field; sending full chat history to translation endpoint (stateless call only).

**Research flag:** Needs research during planning — prompt engineering for classical Hebrew and Aramaic texts needs iteration. Test against at minimum: one Talmud Bavli passage (Aramaic-heavy), one Mishnah passage (classical Hebrew), one Rashi commentary. Rate limiting strategy for production (in-memory is documented as insufficient) needs a specific solution — evaluate Vercel KV vs Upstash Redis.

---

### Phase 6: AI Source Suggestions

**Rationale:** Source suggestions are the most complex AI feature — they combine Gemini output with Sefaria API validation and ranking. Building this last ensures the Sefaria text fetch pipeline (Phase 1), the store's `addSource` action (Phase 3), and the AI infrastructure (Phase 5) are all stable before adding this feature.

**Delivers:** `SuggestionPanel` in `AISidebar` with topic input; `useSourceSuggestions` hook calling Gemini for reference list then validating each against Sefaria; ranked results with Hebrew preview snippet; "Add to sheet" button per suggestion; graceful degradation when Sefaria validation fails for a Gemini-suggested ref.

**Addresses (from FEATURES.md):** AI topic-to-source suggestions; fast creation workflow (topic → sheet); core AI value proposition.

**Avoids (from PITFALLS.md):** Concurrent bulk Sefaria API requests (resolve refs sequentially); storing suggestions only in component state (validate against store before adding).

**Research flag:** Needs research during planning — Sefaria Topics API capabilities and rate behavior need validation. The two-step pattern (Gemini suggests refs → Sefaria validates) has not been prototyped; the validation step may be slow or unreliable for less common texts.

---

### Phase Ordering Rationale

- **Store before editor (Phases 1 before 3):** The architecture research is unambiguous — building UI on top of an unstable state layer means reworking every component when the store interface changes.
- **Typography before export (Phase 2 before 4):** Hebrew typography is a prerequisite for PDF testing. You cannot validate PDF output if the base rendering is wrong.
- **Editor before AI (Phase 3 before 5, 6):** AI hooks interact only with the store's mutation actions. Those actions must be stable and tested before AI features write to them.
- **Firestore schema versioned in Phase 4 (not earlier):** The schema changes (`isPublic`, `aiTranslation`) all land in Phases 4 and 5. Doing the migration infrastructure once, at Phase 4, avoids multiple migration rounds.
- **Translation before suggestions (Phase 5 before 6):** The Gemini infrastructure established in Phase 5 (endpoint, rate limiting, prompt patterns) provides the foundation Phase 6 builds on.

### Research Flags

Phases needing deeper research during planning:
- **Phase 4 (PDF Export):** Cross-browser print dialog behavior with mixed Hebrew/English columnar layout; `break-inside: avoid` with unequal column heights; Safari print CSS compatibility.
- **Phase 5 (AI Translation):** Prompt engineering for classical Hebrew/Aramaic; persistent rate limiting solution (Vercel KV vs Upstash); production cost estimation for Gemini translation calls.
- **Phase 6 (AI Source Suggestions):** Sefaria Topics API capabilities and rate limiting behavior; latency of two-step Gemini → Sefaria validation loop; handling of Gemini-suggested refs that do not exist in Sefaria.

Phases with standard patterns (skip research-phase):
- **Phase 1 (Data Layer):** Zustand migration is well-documented with multiple production examples.
- **Phase 2 (Typography):** CSS `@font-face`, `direction: rtl`, `@media print` are W3C-specified with high-confidence documentation.
- **Phase 3 (Core Editor):** React drag-and-drop (dnd-kit or react-beautiful-dnd), Zustand component integration, Firestore CRUD are standard patterns.

---

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | MEDIUM-HIGH | CSS print + Hebrew font choice verified across multiple sources including official GitHub issues confirming library failures. Puppeteer cold start timing is documented. Minor uncertainty: self-hosted font loading behavior at print time requires integration testing. |
| Features | MEDIUM | Sefaria feature set confirmed via official help docs and JTA journalism. Educator pain points confirmed but not from direct user interviews — inferred from Sefaria complaint patterns and rabbinic norms. Feature priority judgments are well-reasoned but not A/B-tested. |
| Architecture | HIGH | Zustand store pattern, PrintDocument isolation, and hook decomposition are well-verified patterns for React document editors. Existing codebase debt is documented directly from CONCERNS.md analysis. |
| Pitfalls | MEDIUM-HIGH | HTML/PDF library failures confirmed via official GitHub issues (HIGH confidence). Sefaria API nesting behavior documented via official docs and practitioner articles (MEDIUM). AI hallucination on religious texts documented in domain-specific sources. Sefaria rate limits are undocumented (LOW) — treat as unknown. |

**Overall confidence:** MEDIUM-HIGH

### Gaps to Address

- **Sefaria API rate limits:** Completely undocumented. Add client-side exponential backoff and sequential (not concurrent) ref resolution from day one. Validate actual threshold during Phase 6 before shipping source suggestions that could make 5-10 Sefaria calls in sequence.
- **Frank Ruhl Libre print behavior:** Self-hosted WOFF2 is the recommendation, but behavior specifically in Safari's print dialog needs integration testing in Phase 2. Collect evidence before marking typography phase complete.
- **Gemini classical Hebrew quality:** Gemini handles modern Hebrew well; classical/Mishnaic/Talmudic Hebrew quality is estimated as MEDIUM based on general LLM benchmarks. Actual quality needs prompt iteration and human review in Phase 5 before shipping.
- **Mobile PDF UX:** `window.print()` triggers the OS print dialog, which behaves differently on iOS/Android than desktop. For v1 this is acceptable, but test on an actual mobile device before claiming mobile support.

---

## Sources

### Primary (HIGH confidence)
- [react-pdf/renderer issue #3010](https://github.com/diegomura/react-pdf/issues/3010) — Hebrew rendering broken in all versions including v4.1.6, open as of March 2026
- [jsPDF issue #3807](https://github.com/parallax/jsPDF/issues/3807) — BiDi broken as of December 2024
- [Frank Ruhl Libre — Google Fonts](https://fonts.google.com/specimen/Frank+Ruhl+Libre) — Font availability, weights, OFL license
- [Noto Serif Hebrew — Google Fonts](https://fonts.google.com/noto/specimen/Noto+Serif+Hebrew) — OFL license, nikud support
- [How to Export, Print, or Share a Sheet — Sefaria Help Center](https://help.sefaria.org/hc/en-us/articles/20532656851228) — Sefaria PDF limitations confirmed
- [Firebase Dynamic Links deprecated — Firebase Docs](https://firebase.google.com/docs/dynamic-links/) — Deprecation and shutdown confirmed
- [Firebase: Fix insecure rules](https://firebase.google.com/docs/firestore/security/insecure-rules) — `allow read: if true` security implications
- [W3C: Structural markup and RTL text in HTML](https://www.w3.org/International/questions/qa-html-dir) — `dir` attribute authoritative guidance
- [Microsoft: Developing OpenType Fonts for Hebrew Script](https://learn.microsoft.com/en-us/typography/script-development/hebrew) — Nikud GPOS positioning
- [react-to-print npm docs](https://www.npmjs.com/package/react-to-print) — PrintDocument ref pattern
- [Sefaria Search API v2](https://developers.sefaria.org/docs/search-api) — API capabilities confirmed
- [How to Format and Edit Sheets — Sefaria Help Center](https://help.sefaria.org/hc/en-us/articles/20531238413468) — Sefaria formatting features
- Existing codebase: `C:/Users/dsbog/ChevrutAI/.planning/codebase/ARCHITECTURE.md` and `CONCERNS.md` — direct codebase analysis

### Secondary (MEDIUM confidence)
- [Working with Sefaria's API: Practical Tips — Ezra Brand](https://www.ezrabrand.com/p/working-with-sefarias-api-practical) — Nested array gotchas, off-by-one, complex texts
- [From Hallucination to Precision: Sefaria MCP — Ezra Brand](https://www.ezrabrand.com/p/from-hallucination-to-precision-how) — AI hallucination on Hebrew religious texts documented
- [Creating PDFs from HTML + CSS: What actually works — Joyfill](https://joyfill.io/blog/creating-pdfs-from-html-css-in-javascript-what-actually-works) — CSS print vs canvas strategy comparison
- [html2canvas Hebrew 28MB vs 500KB file size analysis — Medium](https://medium.com/@vinaymahamuni/rtl-right-to-left-in-the-pdf-ae6704070f06) — File size comparison documented
- [Deploying Puppeteer on Vercel — Vercel KB](https://vercel.com/kb/guide/deploying-puppeteer-with-nextjs-on-vercel) — Cold start and timeout limits
- [Open Siddur Project Hebrew Fonts](https://opensiddur.org/help/fonts/) — Hebrew font nikud comparison
- [This Torah study tool is everywhere — JTA](https://www.jta.org/2017/10/03/lifestyle/this-torah-study-tool-is-everywhere-but-you-may-have-never-heard-of-it) — Source sheet cultural conventions
- [RTL Styling 101](https://rtlstyling.com/posts/rtl-styling/) — CSS logical properties, bidi issues
- [Schema Versioning with Google Firestore — CaptainCodeman](https://www.captaincodeman.com/schema-versioning-with-google-firestore) — Version field + lazy migration pattern
- [Sefaria API Documentation wiki](https://github.com/Sefaria/Sefaria-Project/wiki/API-Documentation) — Nested array structure, SchemaNode, sections behavior

### Tertiary (LOW confidence)
- [Chrome headless print-to-PDF vs graphical Chrome — Andre Arko](https://andre.arko.net/2025/05/25/chrome-headless-print-to-pdf/) — Headless respects CSS page dimensions; graphical uses window width (single blog post)
- [Best LLMs for Translation in 2025 — Blend](https://www.getblend.com/blog/which-llm-is-best-for-translation/) — Gemini translation quality benchmarks (industry data, methodology unclear)

---

*Research completed: 2026-03-04*
*Ready for roadmap: yes*
