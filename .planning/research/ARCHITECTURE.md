# Architecture Research

**Domain:** Bilingual document editor (React SPA, Hebrew/English, PDF export, AI integration)
**Researched:** 2026-03-04
**Confidence:** HIGH (codebase map + verified patterns from official docs and multiple sources)

---

## Context: What We Are Rebuilding

This is a **partial rebuild** of an existing React 19 SPA. The existing system works but has structural debt that makes the new features unsafe to add on top:

| Existing Debt (from CONCERNS.md) | Impact on New Features |
|----------------------------------|------------------------|
| `useSheetPersistence.js` is 744 lines managing ~7 concerns | Adding AI translation and export hooks into it is high risk |
| Duplicate state in `SourceSheetContext` + `useSheetPersistence` | Sheet state flowing through two channels causes desync bugs |
| `useFirestore.js` is a dead/duplicate hook | Confusion about which persistence path is canonical |
| `EditorContainer.jsx` coordinates everything directly | Adding AI suggestions / export / preview means it grows to 1000+ lines |
| No error boundaries inside the editor | Export failures and AI failures crash the whole editor |

The rebuild must solve these structural problems *while adding* the new features. It cannot be done purely additive.

---

## Recommended Architecture

### System Overview

```
┌──────────────────────────────────────────────────────────────────────┐
│                           App Shell                                   │
│  (AuthContext, ToastContext, Router — unchanged from existing)        │
├──────────────────────────────────────────────────────────────────────┤
│                        Editor Route (/sheet/:id)                      │
│  ┌──────────────────────────────────────────────────────────────┐    │
│  │                    SheetEditorPage                            │    │
│  │  (thin coordinator: loads sheet, wires children, no logic)   │    │
│  │                                                               │    │
│  │  ┌───────────────┐  ┌──────────────┐  ┌──────────────────┐  │    │
│  │  │  EditorPanel  │  │ PreviewPanel │  │   AISidebar      │  │    │
│  │  │  (editing UI) │  │ (read-only)  │  │ (chat + suggest) │  │    │
│  │  └──────┬────────┘  └──────┬───────┘  └────────┬─────────┘  │    │
│  └─────────┴─────────────────┴──────────────────────┴───────────┘    │
│                               │                                       │
│            ┌──────────────────▼──────────────────────┐               │
│            │           useSheetStore (Zustand)         │               │
│            │   sources | title | undoRedo | saveState  │               │
│            └──────────────────┬──────────────────────┘               │
│                               │                                       │
│  ┌──────────┬─────────────────┴──────────────┬────────────────┐      │
│  │ Firebase │     Sefaria API Service         │  Gemini API    │      │
│  │ Firestore│  (text fetch + disambiguation)  │  (serverless)  │      │
│  └──────────┴────────────────────────────────┴────────────────┘      │
└──────────────────────────────────────────────────────────────────────┘
```

The three key architectural shifts from the current codebase:

1. **Zustand store replaces the tangled `useSheetPersistence` hook** as the single source of truth for sheet state. Components subscribe to slices they need — no re-render cascade.
2. **EditorPanel, PreviewPanel, and AISidebar are separate subtrees** — editor state flows down via store, not prop drilling through a single coordinator.
3. **PrintDocument is a dedicated off-screen component** that consumes the same store and is isolated from the editor DOM — enabling clean print/PDF export without disrupting the live editor.

---

## Component Boundaries

| Component | Responsibility | Reads From | Writes To | Does NOT Do |
|-----------|---------------|------------|-----------|-------------|
| `SheetEditorPage` | Route entry, layout, toolbar | URL params, AuthContext | nothing | No sheet state logic |
| `EditorPanel` | Drag-drop reordering, block editing, source addition input | `useSheetStore` | `useSheetStore` | No persistence, no AI calls |
| `SourceBlock` | Render one Hebrew/English source block in editing mode | block data (props) | parent callback | No store access |
| `PreviewPanel` | Render sheet as final output (read-only, styled) | `useSheetStore` | nothing | No editing, no drag-drop |
| `PrintDocument` | Off-screen print-ready DOM target | `useSheetStore` | nothing | Not visible to user normally |
| `AISidebar` | Chat, AI translation requests, source suggestions | `useSheetStore`, AI service | `useSheetStore` (apply suggestions) | No sheet persistence |
| `SheetToolbar` | Sheet title, export menu, share button, undo/redo | `useSheetStore` | `useSheetStore` | No child components |
| `ExportMenu` | Trigger PDF export, DOCX export | refs to PrintDocument | nothing | No format logic inline |
| `useSheetStore` (Zustand) | All sheet state: sources, title, undo/redo, save status | Firestore (on load) | Firestore (autosave, debounced) | No UI rendering |
| `useSefariaSource` hook | Fetch text + handle disambiguation | Sefaria service | caller (returns result) | No global state |
| `useAITranslation` hook | Request Gemini translation for one source | AI service | caller (returns translation) | No sheet state mutation |
| `useSourceSuggestions` hook | Topic → ranked source list from Sefaria + Gemini | AI service, Sefaria service | caller (returns list) | No sheet state mutation |

### Why Zustand Over Context for Sheet State

The existing `SourceSheetContext` causes full-tree re-renders on every source list change — including re-rendering the AI sidebar, the toolbar, the saving indicator, and everything else that happens to be a consumer. Zustand lets each component subscribe to the exact slice it needs. For a document editor where sources change constantly (drag-drop, text edits), this is the correct choice.

**Confidence:** HIGH — verified by multiple 2025 sources, consistent with React team guidance on high-frequency state.

---

## Recommended Project Structure

The rebuild should reorganize components to make the architecture visible in the file tree:

```
src/
├── components/
│   ├── editor/                  # Editor panel and its children
│   │   ├── EditorPanel.jsx      # Drag-drop container, source list
│   │   ├── SourceBlock.jsx      # Single text source (edit mode)
│   │   ├── CustomSourceBlock.jsx # User commentary block
│   │   ├── SectionHeaderBlock.jsx # Section header block
│   │   └── SourceAddBar.jsx     # Input field + add button
│   ├── preview/                 # Preview and print targets
│   │   ├── PreviewPanel.jsx     # Live read-only preview (same store)
│   │   ├── PrintDocument.jsx    # Off-screen print/PDF DOM target
│   │   ├── SheetSourceView.jsx  # Renders one source in print style
│   │   └── SheetHeader.jsx      # Sheet title in print layout
│   ├── ai/                      # AI sidebar and its sub-components
│   │   ├── AISidebar.jsx        # Tab container: Chat | Suggest | Translate
│   │   ├── ChatPanel.jsx        # Conversation UI
│   │   ├── SuggestionPanel.jsx  # Topic → source suggestions
│   │   └── TranslationStatus.jsx # Per-source translation state
│   ├── shell/                   # Shared scaffolding
│   │   ├── SheetEditorPage.jsx  # Route entry + layout
│   │   ├── SheetToolbar.jsx     # Title, undo/redo, export, share
│   │   ├── ExportMenu.jsx       # PDF/DOCX export trigger
│   │   └── ShareModal.jsx       # Public link share UI
│   └── common/                  # Unchanged from existing
│       ├── GuestBanner.jsx
│       ├── SavingIndicator.jsx
│       └── SkeletonLoader.jsx
├── store/
│   └── useSheetStore.js         # Zustand store: all sheet state
├── hooks/
│   ├── useSefariaSource.js      # Fetch + disambiguate one source
│   ├── useAITranslation.js      # On-demand translation for one source
│   ├── useSourceSuggestions.js  # Topic → Sefaria source list
│   ├── useExport.js             # PDF/DOCX export orchestration
│   └── useUndoRedo.js           # Keep: generic undo/redo (already good)
├── services/                    # Unchanged service layer
│   ├── firebase.js
│   ├── sefaria.js
│   ├── ai.js
│   └── docxExport.js
└── styles/
    ├── editor.css               # Editor panel styles
    ├── print.css                # Print / @media print styles
    └── hebrew.css               # Hebrew font + RTL rules
```

### Structure Rationale

- **`components/editor/`** — All editing-mode components. Nothing in here touches the print DOM.
- **`components/preview/`** — All display-mode components. Nothing in here handles drag-drop or user input.
- **`components/ai/`** — All AI-facing UI. Reads from the store; writes suggestions back to the store only when user explicitly accepts.
- **`store/`** — Zustand store gets its own directory because it is the architectural center of the app, not a hook.
- **`styles/print.css`** — Print styles must be in a plain `.css` file, not CSS Modules, because `@page` rules cannot live in CSS Modules scope. This is a verified constraint (html2pdf / react-to-print both require it).

---

## Architectural Patterns

### Pattern 1: Zustand Store as Single Source of Truth

**What:** One Zustand store owns all mutable sheet data. Components subscribe to slices. No prop drilling. No context for high-frequency state.

**When to use:** All sheet state — sources list, title, undo/redo history, save status, AI-in-progress flags.

**Trade-offs:** Adds a dependency (`zustand`). Slightly more setup than a hook. Worth it at ~3 components needing the same state.

**Example:**
```typescript
// store/useSheetStore.js
import { create } from 'zustand'
import { temporal } from 'zundo' // undo/redo middleware

export const useSheetStore = create(
  temporal((set, get) => ({
    sheetId: null,
    title: '',
    sources: [],
    saveStatus: 'saved', // 'saving' | 'saved' | 'error'

    setTitle: (title) => set({ title }),
    addSource: (source) => set((s) => ({ sources: [...s.sources, source] })),
    removeSource: (id) => set((s) => ({ sources: s.sources.filter(x => x.id !== id) })),
    reorderSources: (newOrder) => set({ sources: newOrder }),
    updateSourceTranslation: (id, en) => set((s) => ({
      sources: s.sources.map(x => x.id === id ? { ...x, en } : x)
    })),
  }))
)

// In a component — subscribes only to sources, no re-render on title change
const sources = useSheetStore((s) => s.sources)
```

Note: `zundo` is a Zustand middleware for undo/redo that replaces the custom `useUndoRedo` hook. It handles history immutably and correctly handles concurrent updates.

### Pattern 2: Editor / Preview / Print Separation

**What:** Three separate React subtrees render the same store data with different concerns: editing, preview, and print.

**When to use:** Any time you need the same data to appear in multiple visual contexts with different behavior (interactive, read-only, print-formatted).

**Trade-offs:** Three render passes for the same data. Acceptable because Zustand's selective subscription means each subtree only re-renders when its specific data changes.

**Example:**
```tsx
// components/preview/PrintDocument.jsx
// Off-screen DOM target — hidden during normal use, visible only to print/PDF API
const PrintDocument = React.forwardRef((props, ref) => {
  const { title, sources } = useSheetStore((s) => ({ title: s.title, sources: s.sources }))

  return (
    <div ref={ref} className="print-document" aria-hidden="true">
      <SheetHeader title={title} />
      {sources.map(source => (
        <SheetSourceView key={source.id} source={source} />
      ))}
    </div>
  )
})

// In ExportMenu — react-to-print targets PrintDocument directly
const printRef = useRef()
const handlePrint = useReactToPrint({ contentRef: printRef })
```

The `PrintDocument` is always mounted but visually hidden (`position: absolute; left: -9999px`). This avoids the async state-before-print problem where dynamically rendering the component races with the print trigger.

### Pattern 3: AI Features as Isolated Hooks, Not Inline Logic

**What:** Each AI feature (translation, suggestions, chat) lives in its own hook. The hook manages loading state, error state, and the API call. The store is updated only on success with explicit user confirmation for suggestions.

**When to use:** Any AI integration point. Keeps AI concerns out of editor logic.

**Trade-offs:** More files. Clearer failure isolation.

**Example:**
```typescript
// hooks/useAITranslation.js
export function useAITranslation() {
  const updateSourceTranslation = useSheetStore((s) => s.updateSourceTranslation)
  const [status, setStatus] = useState({}) // { [sourceId]: 'idle' | 'loading' | 'done' | 'error' }

  const translateSource = async (sourceId, hebrewText) => {
    setStatus((s) => ({ ...s, [sourceId]: 'loading' }))
    try {
      const translation = await requestGeminiTranslation(hebrewText)
      updateSourceTranslation(sourceId, translation)
      setStatus((s) => ({ ...s, [sourceId]: 'done' }))
    } catch (e) {
      setStatus((s) => ({ ...s, [sourceId]: 'error' }))
    }
  }

  return { translateSource, status }
}
```

### Pattern 4: Hebrew Typography via Dedicated CSS Class

**What:** Hebrew text is wrapped in a class that applies the correct font, RTL direction, and nikud-safe line-height. English text uses a separate class. The bilingual layout is CSS Grid, not float or flexbox hacks.

**When to use:** Every source block, both in editor and print document.

**Trade-offs:** None — this is the correct approach. CSS logical properties (`padding-inline-start`) ensure both editor and print contexts render correctly.

**Example:**
```css
/* styles/hebrew.css */
.source-hebrew {
  font-family: 'Frank Ruhl Libre', 'Noto Serif Hebrew', serif;
  direction: rtl;
  text-align: right;
  line-height: 1.9; /* nikud needs extra height */
  font-size: 1.1rem;
}

.source-english {
  font-family: 'Libre Baskerville', Georgia, serif;
  direction: ltr;
  text-align: left;
  line-height: 1.7;
}

.source-bilingual {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1.5rem;
  /* Hebrew right column, English left column */
}

@media print {
  .source-bilingual {
    page-break-inside: avoid;
  }
  .source-hebrew {
    font-size: 12pt;
  }
}
```

**Font note:** Frank Ruhl Libre (Google Fonts) is the canonical choice — it is the direct digital descendant of the dominant Israeli print serif and self-hosts via Fontsource for reliable print rendering. Noto Serif Hebrew is the fallback. Both are variable fonts, giving fine control over weight in `@media print`. **Confidence: HIGH** (Google Fonts + Fontsource official docs confirmed availability and variable font axes).

---

## Data Flow

### Sheet State Flow

```
Firestore (on load)
    ↓
useSheetStore.loadSheet(sheetId)
    ↓
Store: { title, sources, ... }
    ↓ (selective subscribe)
    ├── EditorPanel     → renders sources with drag-drop handles
    ├── PreviewPanel    → renders sources in final bilingual layout
    ├── PrintDocument   → off-screen, same data, print CSS applied
    ├── SheetToolbar    → title field, undo/redo button states
    └── AISidebar       → reads sources to provide context to Gemini

User edits (add/remove/reorder/edit source)
    ↓
Component calls store action (e.g., addSource, reorderSources)
    ↓
Store updates (immutable, Zustand re-renders subscribers)
    ↓
Debounced autosave (1000ms) → Firestore
```

### Source Addition Flow

```
User types ref in SourceAddBar
    ↓
useSefariaSource.fetchSource(ref)
    ├── Success → store.addSource(source)
    └── Ambiguous → DisambiguationModal opens
                        ↓
                    User selects
                        ↓
                    useSefariaSource.fetchSource(canonicalRef)
                        ↓
                    store.addSource(source)
```

### AI Translation Flow

```
User clicks "Translate" button on a SourceBlock
    ↓
useAITranslation.translateSource(sourceId, heText)
    ↓
POST /api/chat (existing serverless endpoint)
    ↓
Gemini returns English translation
    ↓
store.updateSourceTranslation(sourceId, en)
    ↓
SourceBlock re-renders with English column populated
```

### AI Source Suggestions Flow

```
User types topic in SuggestionPanel
    ↓
useSourceSuggestions.suggest(topic)
    ├── POST /api/chat (ask Gemini for relevant references)
    │       ↓
    │   Gemini returns ref list (e.g., ["Genesis 1:1", "Berakhot 28b"])
    ↓
    Sefaria.searchSefariaText() validates each ref exists
    ↓
    Returns ranked list with he preview snippets
    ↓
SuggestionPanel renders list with "Add to sheet" buttons
    ↓
User clicks "Add" → useSefariaSource.fetchSource(ref) → store.addSource()
```

### Export Flow

```
User clicks "Export PDF" in ExportMenu
    ↓
useExport.exportPDF()
    ↓
react-to-print targets PrintDocument ref
    ↓
Browser print dialog opens (or silent save with html2pdf)
    ↓
@media print CSS activates:
  - Hebrew font: Frank Ruhl Libre
  - Bilingual grid layout
  - page-break-inside: avoid on source blocks
  - Header/footer with sheet title
```

### Key Flow Principle: Unidirectional

Data always flows: **Store → Components**. Components never talk to each other directly. Components only write back to the store via actions. The store's autosave subscription writes to Firestore. This eliminates the current `useSheetPersistence` problem of managing both UI state and persistence side effects in one place.

---

## Build Order Implications

The architecture dictates this build sequence:

### Phase 1: Store Foundation (build this first)

Build `useSheetStore` (Zustand) before building any components. Migration path from the existing hooks:

1. Delete `SourceSheetContext` (confirmed duplicate)
2. Extract `useSheetPersistence` concern-by-concern into the store:
   - Sheet load/create → store init action
   - Sources state + mutations → store actions
   - Autosave → store middleware or effect
   - Undo/redo → `zundo` middleware
3. Delete `useFirestore.js` (confirmed dead code per CONCERNS.md)

**Why first:** Every other component depends on the store interface. Getting it right before building UI avoids rework.

### Phase 2: Editor Panel (build second)

With the store in place, rebuild `EditorPanel` + block components consuming it directly. This is the core editing experience and validates that the store interface is correct before adding export and AI layers.

### Phase 3: Preview and Print Document (build third)

`PreviewPanel` and `PrintDocument` share the same store data. `PrintDocument` is the export target. Build them together — they share CSS and the same source rendering components (`SheetSourceView`).

**Dependency:** Must have final Hebrew typography CSS and bilingual grid layout before this can be tested properly.

### Phase 4: AI Features (build last, on top of stable foundation)

AI hooks (`useAITranslation`, `useSourceSuggestions`) interact only with the store's mutation actions. They do not need to know about the editor UI or the export format. Build them after the store interface is stable.

**Why last:** AI features are additive enhancements. If the store interface changes while building AI hooks, you only need to update the hooks. If you build AI hooks first and the store is still unstable, you rewrite everything.

---

## Anti-Patterns to Avoid

### Anti-Pattern 1: Adding New Features to `useSheetPersistence`

**What people do:** Add AI translation state, export state, and suggestion state into the existing 744-line hook because it "already has the sheet data."

**Why it's wrong:** The hook already has too many concerns. Adding more guarantees the next developer (or future you) cannot reason about which effects depend on which state. Race conditions become impossible to debug.

**Do this instead:** Build the Zustand store first. Migrate sheet state into it. Then each new feature gets its own narrow hook that reads from and writes to the store.

### Anti-Pattern 2: Rendering Print Styles Inside the Editor DOM

**What people do:** Apply `@media print` styles directly to the live editor components. Attempt to "toggle" print mode on the existing editor for export.

**Why it's wrong:** The editor DOM has drag handles, buttons, edit affordances, and focus states that need to be hidden in print. Toggling CSS to hide all of these is fragile. One missed element ruins the output. Also, editor styles and print styles fight each other in the same cascade.

**Do this instead:** Keep `PrintDocument` as a completely separate React subtree with its own CSS. It consumes the same store data but renders with entirely print-focused components. `react-to-print` targets this component; the editor is never involved in the print pipeline.

### Anti-Pattern 3: Generating Hebrew Typography via Inline Styles

**What people do:** Set `fontFamily`, `direction`, and `textAlign` as inline React style props on individual source components.

**Why it's wrong:** Inline styles have highest CSS specificity and cannot be overridden by `@media print` rules. Print stylesheets need to adjust font-size, line-height, and spacing for print — none of that works if the values are locked in inline styles.

**Do this instead:** Use CSS class names for all Hebrew typography. Reserve inline styles only for dynamic values that cannot be expressed in CSS (e.g., a user-defined color).

### Anti-Pattern 4: Duplicate State Between Store and Component State

**What people do:** Read `sources` from the Zustand store, then also keep a local `useState` copy for "working state" before committing.

**Why it's wrong:** This replicates the exact bug in the current codebase (`SourceSheetContext` duplicating `useSheetPersistence` state). Any desync between the two copies causes silent stale-data bugs.

**Do this instead:** All mutations go directly to the store. If you need optimistic UI (e.g., a source block shows before Sefaria fetch completes), add an `optimistic` flag to the store item and remove it on confirmation. One source of truth, always.

### Anti-Pattern 5: Direct html2pdf calls on the Live Editor DOM

**What people do:** `html2pdf(document.querySelector('.editor-panel'))` — targeting whatever is visible on screen.

**Why it's wrong:** html2pdf uses html2canvas internally, which screenshots the DOM. If the editor is scrolled, you get a partial screenshot. If buttons are visible, they appear in the PDF. If the editor has dark mode active, dark mode shows in the PDF.

**Do this instead:** Target `PrintDocument` — the off-screen, always-white, print-only component. The user's dark/light preference is irrelevant because `PrintDocument` always renders in print-document colors.

---

## Integration Points

### External Services

| Service | Integration Pattern | Notes |
|---------|---------------------|-------|
| Sefaria API | `useSefariaSource` hook wraps `src/services/sefaria.js` | Keep existing service, wrap in new hook |
| Gemini AI | `useAITranslation` and `useSourceSuggestions` call `src/services/ai.js` | Keep existing serverless endpoint; new hooks are thin wrappers |
| Firebase Firestore | Store autosave middleware writes via `src/services/firebase.js` | Keep existing service; move autosave from hook to store |
| Google Fonts (Frank Ruhl Libre) | `@import` or Fontsource npm package | Fontsource preferred for offline/print reliability |

### Internal Boundaries

| Boundary | Communication | Notes |
|----------|---------------|-------|
| `EditorPanel` ↔ `PrintDocument` | Via Zustand store only | No direct refs between them |
| `AISidebar` ↔ `EditorPanel` | Via store: AI writes suggestions; user accepts → store.addSource | No direct callbacks |
| `ExportMenu` ↔ `PrintDocument` | React ref (for react-to-print) | Only coupling point; use `forwardRef` |
| `SheetToolbar` ↔ store | Direct Zustand subscription | Toolbar reads undo/redo state, title |
| Store autosave ↔ Firestore | Store subscription + debounce (inside store) | Not in a component, not in a hook |

---

## Scalability Considerations

| Scale | Architecture Adjustments |
|-------|--------------------------|
| 0-1k users | Current Vercel + Firebase is sufficient. No changes needed. |
| 1k-10k users | Rate limiting needs Redis (current in-memory resets on cold start). Add Firestore composite indexes for sheet queries. |
| 10k+ users | Consider server-side PDF generation (Puppeteer on serverless) for large sheets; html2pdf is client-side and CPU-intensive on mobile. |

### Scaling Priorities

1. **First bottleneck: Rate limiting** — serverless cold starts reset the in-memory map. This is already flagged in CONCERNS.md and becomes real at modest traffic.
2. **Second bottleneck: PDF generation on mobile** — html2pdf runs html2canvas, which is CPU-heavy. On iPhone/low-end Android, large sheets will take 5-10 seconds. At scale, consider a `/api/pdf` endpoint using Puppeteer on a persistent Vercel function.

---

## Sources

- React state management patterns: [https://www.developerway.com/posts/react-state-management-2025](https://www.developerway.com/posts/react-state-management-2025) (MEDIUM confidence — authoritative React blog)
- Zustand vs Context for editors: [https://dev.to/cristiansifuentes/react-state-management-in-2025-context-api-vs-zustand-385m](https://dev.to/cristiansifuentes/react-state-management-in-2025-context-api-vs-zustand-385m) (MEDIUM)
- react-to-print pattern: [https://www.npmjs.com/package/react-to-print](https://www.npmjs.com/package/react-to-print) (HIGH — official npm docs)
- Print preview DOM isolation: [https://medium.com/@ruaraikirk/multi-page-print-preview-in-react-using-html-to-image-and-some-css-5c5814a1010e](https://medium.com/@ruaraikirk/multi-page-print-preview-in-react-using-html-to-image-and-some-css-5c5814a1010e) (LOW — single blog post)
- html2pdf.js usage in React: [https://remarkablemark.org/blog/2025/12/08/react-html2pdf/](https://remarkablemark.org/blog/2025/12/08/react-html2pdf/) (MEDIUM — verified, dated Dec 2025)
- Frank Ruhl Libre font: [https://fonts.google.com/specimen/Frank+Ruhl+Libre](https://fonts.google.com/specimen/Frank+Ruhl+Libre) (HIGH — Google Fonts official)
- Noto Serif Hebrew font: [https://fonts.google.com/noto/specimen/Noto+Serif+Hebrew](https://fonts.google.com/noto/specimen/Noto+Serif+Hebrew) (HIGH — Google Fonts official)
- Fontsource self-hosting: [https://fontsource.org/fonts/frank-ruhl-libre](https://fontsource.org/fonts/frank-ruhl-libre) (HIGH — official Fontsource)
- Derived state / SSOT refactoring: [https://profy.dev/article/react-junior-code-review-and-refactoring-2](https://profy.dev/article/react-junior-code-review-and-refactoring-2) (MEDIUM — multiple source agreement)
- RTL detection hook pattern: [https://froala.com/blog/editor/tutorials/creating-react-rich-text-editor-for-right-to-left-languages/](https://froala.com/blog/editor/tutorials/creating-react-rich-text-editor-for-right-to-left-languages/) (MEDIUM)
- Existing codebase architecture: `C:/Users/dsbog/ChevrutAI/.planning/codebase/ARCHITECTURE.md` (HIGH — direct codebase analysis)
- Existing codebase concerns: `C:/Users/dsbog/ChevrutAI/.planning/codebase/CONCERNS.md` (HIGH — direct codebase analysis)

---

*Architecture research for: ChevrutAI bilingual document editor rebuild*
*Researched: 2026-03-04*
