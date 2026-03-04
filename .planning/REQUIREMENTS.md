# Requirements: ChevrutAI — Jewish Text Sheet Maker

**Defined:** 2026-03-04
**Core Value:** Rabbi goes from topic → beautiful, print-ready sheet in minutes — with AI helping find sources and fill translation gaps.

## v1 Requirements

### Data Foundation

- [x] **DATA-01**: Zustand store replaces `useSheetPersistence` + `SourceSheetContext` as the single source of sheet state
- [x] **DATA-02**: Sheet Firestore documents include a `schemaVersion` field; reads apply defensive defaults for missing fields so existing user sheets never break
- [x] **DATA-03**: Sefaria text normalization handles all array depths (1–3 levels) and edge cases without runtime errors for Talmud, Mishnah, Zohar, and other complex source types
- [x] **DATA-04**: Undo/redo works correctly for all sheet mutations (add source, remove source, reorder, edit commentary)

### Editor

- [x] **EDIT-01**: User can search Sefaria by reference or keyword and preview the Hebrew + English text before adding it to the sheet
- [x] **EDIT-02**: User can add a Sefaria source to their sheet in two clicks or fewer
- [x] **EDIT-03**: User can reorder sheet sources via drag-and-drop
- [x] **EDIT-04**: User can remove a source from the sheet
- [x] **EDIT-05**: User can insert their own commentary/text block between sources
- [x] **EDIT-06**: User can add section headers and visual dividers to structure the sheet
- [x] **EDIT-07**: User can set a title for their sheet
- [x] **EDIT-08**: Sheet auto-saves to Firestore without user action

### Typography & Layout

- [x] **TYPO-01**: Hebrew text renders using Frank Ruhl Libre (self-hosted WOFF2), with nikud-safe line-height (minimum 1.8)
- [x] **TYPO-02**: Sheet displays Hebrew and English side-by-side in two columns (Hebrew right, English left) — the standard synagogue bilingual format
- [x] **TYPO-03**: Hebrew column uses `direction: rtl`; English column uses `direction: ltr`; these are scoped per-column and do not affect the app shell
- [x] **TYPO-04**: Sheet preview panel renders the bilingual layout correctly at screen size before export

### PDF & Print Export

- [x] **EXPRT-01**: User can export their sheet as a PDF via browser-native `window.print()` + `@media print` CSS (no rasterization — text must be selectable in output)
- [x] **EXPRT-02**: Print stylesheet produces correct bilingual column layout with Hebrew RTL preserved in printed output
- [x] **EXPRT-03**: Source blocks do not break across pages unnecessarily (CSS `page-break-inside: avoid`)
- [x] **EXPRT-04**: Print output omits all editor UI chrome (sidebar, buttons, navigation) — sheet content only

### Sharing & Library

- [x] **SHARE-01**: User can mark a sheet as public, generating a shareable URL accessible without login
- [x] **SHARE-02**: Public sheet view is read-only; Firestore security rules scope public reads to `isPublic == true` only (not the entire collection)
- [x] **SHARE-03**: User can view all their saved sheets in a library/dashboard
- [x] **SHARE-04**: User can search or filter their sheet library by title

### AI Features

- [ ] **AI-01**: User can request AI translation for any source that has an empty English translation field (on-demand per source, not automatic)
- [ ] **AI-02**: AI-translated text is visually labeled "AI Translation" in both the editor and on printed/exported output
- [ ] **AI-03**: User can describe a topic and receive a list of suggested Sefaria sources relevant to that topic
- [ ] **AI-04**: User can add any suggested source directly from the suggestions UI to their sheet
- [ ] **AI-05**: AI translation prompt explicitly instructs the model to flag Aramaic passages and note uncertainty

### Authentication

- [x] **AUTH-01**: User can sign in with Google (existing Firebase Google Auth — no changes required)
- [x] **AUTH-02**: User session persists across browser refresh

## v2 Requirements

### Authentication

- **AUTH-V2-01**: User can sign up with email and password
- **AUTH-V2-02**: User can sign in anonymously and build a sheet without an account (not saved)

### Export

- **EXPRT-V2-01**: User can export sheet as DOCX (existing docxExport service — deprioritized in favor of PDF quality)
- **EXPRT-V2-02**: Server-side PDF generation via Puppeteer for users where browser print dialog UX is insufficient

### AI

- **AI-V2-01**: AI contextualizes selected sources with connecting commentary (shows thematic connections between sources on the sheet)
- **AI-V2-02**: AI suggests discussion questions for a completed sheet

### Sharing

- **SHARE-V2-01**: User can copy a sheet to create a new editable version

## Out of Scope

| Feature | Reason |
|---------|--------|
| Real-time collaborative editing | High complexity; sheet-making is typically a solo activity |
| Social features (likes, follows, comments) | Not core to the sheet-making value prop |
| Non-Sefaria text sources | Focus on Sefaria database; scope creep risk |
| AI auto-drafting full sheets | Religious educators have authentic concerns about AI-generated liturgical content |
| Paid tiers / billing | Free for everyone in v1 |
| Mobile native app | Web-first; mobile browser is acceptable |
| AI chatbot / chevruta mode | Sefaria now has this; not our differentiator |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| AUTH-01 | Phase 1 | Complete |
| AUTH-02 | Phase 1 | Complete |
| DATA-01 | Phase 1 | Complete |
| DATA-02 | Phase 1 | Complete |
| DATA-03 | Phase 1 | Complete |
| DATA-04 | Phase 1 | Complete |
| TYPO-01 | Phase 2 | Complete |
| TYPO-02 | Phase 2 | Complete |
| TYPO-03 | Phase 2 | Complete |
| TYPO-04 | Phase 2 | Complete |
| EDIT-01 | Phase 3 | Complete |
| EDIT-02 | Phase 3 | Complete |
| EDIT-03 | Phase 3 | Complete |
| EDIT-04 | Phase 3 | Complete |
| EDIT-05 | Phase 3 | Complete |
| EDIT-06 | Phase 3 | Complete |
| EDIT-07 | Phase 3 | Complete |
| EDIT-08 | Phase 3 | Complete |
| EXPRT-01 | Phase 4 | Complete |
| EXPRT-02 | Phase 4 | Complete |
| EXPRT-03 | Phase 4 | Complete |
| EXPRT-04 | Phase 4 | Complete |
| SHARE-01 | Phase 4 | Complete |
| SHARE-02 | Phase 4 | Complete |
| SHARE-03 | Phase 4 | Complete |
| SHARE-04 | Phase 4 | Complete |
| AI-01 | Phase 5 | Pending |
| AI-02 | Phase 5 | Pending |
| AI-05 | Phase 5 | Pending |
| AI-03 | Phase 6 | Pending |
| AI-04 | Phase 6 | Pending |

**Coverage:**
- v1 requirements: 31 total
- Mapped to phases: 31
- Unmapped: 0 ✓

---
*Requirements defined: 2026-03-04*
*Last updated: 2026-03-04 after 03-04 completion — EDIT-08 marked complete (useAutosave wired in EditorContainer); all 8 EDIT requirements complete; Phase 3 done*
