# Phase 3: Core Editor Rebuild - Research

**Researched:** 2026-03-04
**Domain:** React 19 editor UX, @dnd-kit sortable, Sefaria search/preview, Zustand store integration, Firestore autosave
**Confidence:** HIGH

---

## Summary

Phase 3 rebuilds the editor panel on top of the Zustand store and Hebrew typography delivered by Phases 1 and 2. The existing codebase already contains every low-level primitive needed: @dnd-kit/sortable is installed, `sefaria.js` has both reference-fetch and keyword-search functions, `useSheetStore` (built in Phase 1) owns all sheet mutations, and `useAutosave` (Phase 1) handles Firestore writes without user action. The work here is purely UX and component architecture — wiring those primitives into a lean editor that gets a source onto the sheet in two clicks or fewer.

The current `SheetView.jsx` (340 lines) and `EditorContainer.jsx` (272 lines after the Phase 1 rebuild) together do the job but mix concerns heavily: `SheetView` owns DnD context, search state, export handlers, sheet toolbar, empty-state hero, and block rendering all in one component. Phase 3 should split this into focused, testable pieces and add the search/preview panel that is currently missing (sources are added through the AI chat, not a dedicated search UI).

The single biggest UX gap to close: there is currently no direct Sefaria search UI. Users must type a ref into the AI chat to get a source added. EDIT-01 and EDIT-02 require a first-class search input with live results and a click-to-add flow that bypasses the chat entirely.

**Primary recommendation:** Build a persistent search/add panel that lives alongside (or above) the sheet canvas. The panel has one text input, shows results in a list below it, and each result has a "Preview" state and an "Add" button. The full flow is: type ref → see result card with Hebrew + English snippet → click "Add to Sheet" — two user actions total.

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| EDIT-01 | User can search Sefaria by reference or keyword and preview Hebrew + English text before adding | `getSefariaText` + `searchSefariaText` in sefaria.js; search panel component with preview card |
| EDIT-02 | User can add a Sefaria source in two clicks or fewer | Single text input → result card with one "Add" button; no modal required for happy path |
| EDIT-03 | User can reorder sheet sources via drag-and-drop | @dnd-kit/sortable@10.0.0 already installed; `reorderSources` action exists in useSheetStore |
| EDIT-04 | User can remove a source from the sheet | `removeSource(index)` action exists in useSheetStore; existing SourceBlock has remove button |
| EDIT-05 | User can insert their own commentary/text block between sources | `addSource({type:'commentary',...})` pattern; CustomSourceBlock already exists and renders |
| EDIT-06 | User can add section headers and visual dividers | `addSource({type:'header',...})` pattern; SectionHeaderBlock already exists and renders |
| EDIT-07 | User can set a title for their sheet | `setTitle(value)` action exists in useSheetStore; title input already in SheetView |
| EDIT-08 | Sheet auto-saves to Firestore without user action | `useAutosave` hook from Phase 1 already handles this; confirmation in research below |
</phase_requirements>

---

## Standard Stack

### Core (already installed — no new dependencies required)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| @dnd-kit/core | ^6.3.1 | DnD event engine, sensors, collision | Battle-tested, accessible, works on touch |
| @dnd-kit/sortable | ^10.0.0 | `useSortable`, `SortableContext`, `arrayMove` | Official sortable abstraction over dnd-kit/core |
| @dnd-kit/utilities | ^3.2.2 | `CSS.Transform.toString()` helper | Required for transform style application |
| react | ^19.2.0 | Component framework | Project standard |
| zustand | (via Phase 1) | Sheet state via useSheetStore | Single source of truth established in Phase 1 |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| react-router-dom | ^7.12.0 | Navigation, useParams for sheetId | Already wired — EditorContainer uses useParams |

### No New Installs Needed

All libraries required for Phase 3 are already in package.json. Phase 3 introduces zero new npm dependencies. This is verified by inspecting the current package.json:

```
"@dnd-kit/core": "^6.3.1",
"@dnd-kit/sortable": "^10.0.0",
"@dnd-kit/utilities": "^3.2.2"
```

---

## Architecture Patterns

### Recommended File Structure for Phase 3

The rebuild should produce this file layout. Files marked (existing — keep) need no major changes. Files marked (existing — refactor) are simplified versions of current files. Files marked (new) are net-new.

```
src/
├── components/
│   ├── EditorContainer.jsx        (existing — keep after Phase 1 rebuild)
│   ├── editor/                    (new directory)
│   │   ├── SearchPanel.jsx        (new) — Sefaria search input + results list
│   │   ├── SearchResultCard.jsx   (new) — single result: ref, preview, add button
│   │   └── EditorToolbar.jsx      (new or refactor of SheetToolbar) — add note/header/undo/redo
│   ├── sheet/                     (existing)
│   │   ├── SheetCanvas.jsx        (refactor of SheetView) — DnD context + block list only
│   │   ├── SortableItem.jsx       (extract from SheetView) — dnd wrapper for a block
│   │   ├── SourceBlock.jsx        (existing — keep)
│   │   ├── CustomSourceBlock.jsx  (existing — keep, rename type 'custom' → 'commentary' is optional)
│   │   └── SectionHeaderBlock.jsx (existing — keep)
│   └── common/
│       └── SavingIndicator.jsx    (existing — keep)
├── stores/
│   └── useSheetStore.js           (Phase 1 artifact — no changes in Phase 3)
├── hooks/
│   └── useAutosave.js             (Phase 1 artifact — no changes in Phase 3)
└── services/
    └── sefaria.js                 (existing — keep, no changes needed)
```

The key structural change: `SheetView.jsx` becomes `SheetCanvas.jsx` (render-only, no search logic) and a separate `SearchPanel.jsx` handles source discovery. Export logic and Google Docs sync move to Phase 4 — remove them from the Phase 3 components.

### Pattern 1: Search Panel — Debounced Reference Lookup

**What:** A single text input that accepts Sefaria references ("Genesis 1:1", "Berakhot 2a") or keywords. Results display below as cards. The user clicks "Add" on any result card.

**When to use:** Always visible in the editor (not a modal). Part of the left column or top section of the sheet editor layout.

**UX flow detail (EDIT-01, EDIT-02):**

```
1. User types in search input (e.g., "Genesis 1")
2. After 400ms debounce, call getSefariaText(query)
   - If exact ref resolves: show single result card with full Hebrew + English preview
   - If exact ref fails: call searchSefariaText(query) for a list of results
3. Each result card shows:
   - Reference label (e.g., "Bereshit 1:1")
   - Hebrew text snippet (first ~200 chars)
   - English text snippet (first ~200 chars)
   - "Add to Sheet" button
4. User clicks "Add to Sheet" → calls useSheetStore.getState().addSource(source) → source appears in sheet immediately
```

**Two-click path (satisfies EDIT-02):**
- Click 1: Type in search and press Enter (or wait for debounce) — result appears
- Click 2: Click "Add to Sheet" on the result card
- The source is on the sheet. Done.

**Example SearchPanel implementation sketch:**

```jsx
// Source: codebase analysis + @dnd-kit/sortable docs
import { useState, useRef, useCallback } from 'react';
import { getSefariaText, searchSefariaText } from '../../services/sefaria';
import useSheetStore from '../../stores/useSheetStore';

const SearchPanel = () => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);  // array of { ref, he, en }
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const debounceRef = useRef(null);
  const addSource = useSheetStore.getState().addSource; // non-reactive read

  const handleSearch = useCallback((value) => {
    setQuery(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!value.trim()) { setResults([]); return; }

    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      setError(null);
      try {
        // Try exact reference first
        const direct = await getSefariaText(value);
        if (direct && !direct.error) {
          setResults([{ ref: direct.ref, he: direct.he, en: direct.en }]);
        } else {
          // Fall back to keyword search
          const searchResults = await searchSefariaText(value);
          setResults(searchResults.map(r => ({
            ref: r.ref,
            he: r.he,
            en: r.en
          })));
        }
      } catch {
        setError('Search failed. Check your connection.');
      } finally {
        setLoading(false);
      }
    }, 400);
  }, []);

  const handleAdd = (source) => {
    addSource(source);
    setQuery('');
    setResults([]);
  };

  return (
    <div className="search-panel">
      <input
        type="text"
        className="search-input"
        placeholder="Search by reference or keyword..."
        value={query}
        onChange={(e) => handleSearch(e.target.value)}
      />
      {loading && <div className="search-loading">Searching...</div>}
      {error && <div className="search-error">{error}</div>}
      <div className="search-results">
        {results.map((r) => (
          <SearchResultCard key={r.ref} result={r} onAdd={handleAdd} />
        ))}
      </div>
    </div>
  );
};
```

**Debounce delay:** 400ms. The existing `useSheetPersistence` used 2000ms for saves; 400ms is appropriate for search (fast enough to feel responsive, slow enough to avoid hammering the Sefaria API on every keystroke).

### Pattern 2: DnD Sortable List with Zustand reorderSources

**What:** Wrap the sheet sources list in `DndContext` + `SortableContext`. Each source is a `SortableItem` that uses `useSortable`. On drag end, call `reorderSources(arrayMove(sources, oldIndex, newIndex))`.

**This pattern already exists in the current `SheetView.jsx`** (lines 4-6, 20-50, 291-312). The only change in Phase 3 is to move it into `SheetCanvas.jsx` and wire it to `useSheetStore` instead of prop-drilling from `useSheetPersistence`.

**Example (extracted and simplified from existing SheetView):**

```jsx
// Source: existing SheetView.jsx lines 4-6, 20-50, 291-312
import { DndContext, closestCenter, PointerSensor, KeyboardSensor, useSensor, useSensors } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import useSheetStore from '../../stores/useSheetStore';
import { useShallow } from 'zustand/shallow';

const SheetCanvas = () => {
  const { sources } = useSheetStore(useShallow((s) => ({ sources: s.sources })));
  const { reorderSources, removeSource, updateSource } = useSheetStore.getState();

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleDragEnd = ({ active, over }) => {
    if (!over || active.id === over.id) return;
    const oldIndex = sources.findIndex((s) => s.id === active.id);
    const newIndex = sources.findIndex((s) => s.id === over.id);
    reorderSources(arrayMove(sources, oldIndex, newIndex));
  };

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <SortableContext items={sources.map((s) => s.id)} strategy={verticalListSortingStrategy}>
        {sources.map((source, index) => (
          <SortableItem
            key={source.id}
            id={source.id}
            source={source}
            onRemove={() => removeSource(index)}
            onUpdate={(updates) => updateSource(index, updates)}
          />
        ))}
      </SortableContext>
    </DndContext>
  );
};
```

**CRITICAL NOTE on source identity for DnD:** The current `SheetView` uses `source.ref` as the DnD item id (line 298: `items={sources.map(s => s.ref)}`). This breaks if a user adds the same source twice or adds commentary blocks with generated IDs like `note-${Date.now()}`. Phase 3 MUST use a stable unique `id` field on every source object (uuid or `crypto.randomUUID()`). The `addSource` action in `useSheetStore` (Phase 1) should assign this on creation. Verify this is true before building the DnD layer; if not, the Phase 3 plans must add it.

### Pattern 3: Commentary and Header Insertion

**What:** User clicks "Add Note" or "Add Header" in the toolbar. A new block appears at the bottom of the sheet (or at the current cursor position). The block is editable inline.

**Current behavior:** `SheetView.handleAddCustom` creates `{ type: 'custom', ref: 'note-${Date.now()}', en: '', title: '' }` and calls `onAddSource`. `SheetView.handleAddHeader` creates `{ type: 'header', ref: 'header-${Date.now()}', en: '' }`.

**Phase 3 change:** Route these calls directly to `useSheetStore.getState().addSource()` from the toolbar. No prop drilling needed.

The existing `CustomSourceBlock` and `SectionHeaderBlock` components can be kept as-is. They use `EditableContent` (contentEditable div) for inline editing, which works correctly on blur.

### Pattern 4: Title Input (EDIT-07)

**What:** Sheet title is an `<input>` or contentEditable element at the top of the canvas. Changes call `setTitle(value)` from the store.

**This already exists** in `SheetView.jsx` (lines 196-200). Extract it into `SheetCanvas.jsx` or a standalone `SheetTitleInput.jsx` component:

```jsx
// Source: existing SheetView.jsx lines 196-200
const SheetTitleInput = () => {
  const title = useSheetStore((s) => s.title);
  const setTitle = useSheetStore.getState().setTitle; // non-reactive
  return (
    <input
      type="text"
      className="title-input"
      value={title}
      onChange={(e) => setTitle(e.target.value)}
      placeholder="Untitled Source Sheet"
    />
  );
};
```

### Anti-Patterns to Avoid

- **Prop-drilling store state through EditorContainer.** In Phase 3 components read directly from `useSheetStore` with `useShallow`. EditorContainer should not pass `sources`, `title`, etc. as props into deep children.
- **Putting search state in the Zustand store.** Search query, results, and loading state are ephemeral UI state — keep them in local `useState` inside `SearchPanel`. Only committed sheet data lives in the store.
- **Using `source.ref` as the DnD `id`.** Refs are not guaranteed unique in the sources array (same ref can be added twice). Use a dedicated `id` field (uuid or `crypto.randomUUID()`).
- **Re-creating the disambiguation modal in Phase 3.** `SourceDisambiguationModal` already exists and is wired to the `addSource` flow via `disambiguationState` in `useSheetStore`. Don't rebuild this.
- **Adding export logic to SheetCanvas.** Export (PDF, DOCX, Google Docs) belongs in Phase 4. Phase 3 components should have zero export code.
- **Keeping the AI chat wired into SheetCanvas.** `ChatSidebar` and `sendMessage` remain in `EditorContainer`. The Phase 3 sheet canvas components don't know about chat.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Drag and drop reordering | Custom mouse/touch event handler | @dnd-kit/sortable (already installed) | Handles touch, keyboard navigation, pointer sensors, accessibility out of the box |
| Debounced search | Custom debounce utility | Hand-rolled setTimeout/clearTimeout (same pattern as useAutosave) | No lodash in this codebase; pattern is already established and working |
| Inline text editing | Custom textarea/editor | `contentEditable` div via existing `EditableContent.jsx` | Already built, handles Hebrew RTL and English LTR, blur-to-save pattern established |
| Sefaria text fetch with fuzzy ref resolution | Custom ref resolver | `getSefariaText` in `sefaria.js` | Already built with Levenshtein distance fuzzy matching, retry logic, fallback to Name API |
| Sefaria keyword search | Custom search API call | `searchSefariaText` in `sefaria.js` | Already built, returns `{ ref, he, en }` array |
| Firestore autosave | Custom save hook | `useAutosave` from Phase 1 | Already built with correct debounce and store subscription pattern |

**Key insight:** The hard problems in this phase (DnD, Sefaria API, Firestore autosave) are already solved. Phase 3 is primarily UX wiring — the risk is over-engineering, not under-engineering.

---

## Data Shape for Mixed Source Types

This is the confirmed source object shape, synthesized from `useSheetPersistence.js` (addSource), `SheetView.jsx` (block dispatch), and the existing block components.

### Type: `source` (Sefaria text)

```javascript
{
  id: string,          // MUST be stable unique id — crypto.randomUUID() at addSource time
  type: 'source',      // Discriminant field
  ref: string,         // Canonical Sefaria ref, e.g. "Genesis 1:1"
  he: string,          // Hebrew text (normalized to string by sefaria.js normalizeText)
  en: string,          // English translation (may be empty string if no translation)
  viewMode: 'bilingual' | 'hebrew' | 'english',  // Render mode, default 'bilingual'
  versionTitle: string | null,  // English version name, e.g. "Sefaria Community Translation"
  versions: Array<{ versionTitle: string }>,  // Available English versions for version picker
  heVersionTitle: string | null  // Hebrew version name (rarely used)
}
```

### Type: `commentary` (user's own text block, renamed from 'custom')

The existing codebase uses `type: 'custom'` for user text blocks. Renaming to `'commentary'` is cleaner for the domain and matches EDIT-05 language. Either name works since the store and block dispatch can handle both — but be consistent in Phase 3.

```javascript
{
  id: string,          // crypto.randomUUID()
  type: 'commentary',  // (current codebase uses 'custom' — either works)
  ref: string,         // Synthetic id used only as fallback key, e.g. "commentary-1709567890"
  title: string,       // Optional user-provided title, displayed above the content
  en: string,          // The commentary text (HTML from contentEditable)
  dir: 'ltr' | 'rtl'  // Text direction — user can toggle
}
```

### Type: `header` (section header)

```javascript
{
  id: string,          // crypto.randomUUID()
  type: 'header',
  ref: string,         // Synthetic id, e.g. "header-1709567890"
  en: string           // Header text — stored in 'en' field (per SectionHeaderBlock.jsx line 16)
}
```

### Type: `divider` (visual divider — EDIT-06)

The current codebase does not have a divider type. It only has `source`, `custom` (commentary), and `header`. EDIT-06 says "section headers and visual dividers." A visual divider is a thin horizontal rule between sections, simpler than a header.

**Recommendation:** Add `type: 'divider'` as the minimal divider:

```javascript
{
  id: string,          // crypto.randomUUID()
  type: 'divider',
  ref: string          // Synthetic id, e.g. "divider-1709567890"
  // No content fields needed — renders as <hr className="sheet-divider" />
}
```

The block dispatcher in `SheetCanvas` (or the existing `SortableItem`) needs a case for `type: 'divider'` that renders a thin horizontal rule. This is a 5-line addition.

### Block Dispatch Pattern

```jsx
// Source: existing SheetView.jsx SortableSourceItem component, lines 35-37
const getBlockComponent = (type) => {
  switch (type) {
    case 'source':      return SourceBlock;
    case 'commentary':  return CommentaryBlock;   // was 'custom', CustomSourceBlock
    case 'header':      return SectionHeaderBlock;
    case 'divider':     return DividerBlock;       // new in Phase 3
    default:            return SourceBlock;
  }
};
```

---

## Sefaria Search UX Flow and Implementation

### Two-Mode Search (satisfies EDIT-01 + EDIT-02)

The existing `sefaria.js` supports two retrieval modes:

**Mode 1 — Direct reference fetch:** `getSefariaText(ref)` — used when the user types a specific Sefaria reference like "Genesis 1:1", "Berakhot 2a", or "Rashi on Genesis 1:1". Returns the full text with `he` and `en` fields. Includes fuzzy resolution via the Name API as a fallback.

**Mode 2 — Keyword search:** `searchSefariaText(query)` — used when direct fetch fails or when the user types a descriptive keyword like "prayer" or "creation". Returns up to 5 results as `[{ ref, he, en }]` snippets from Sefaria's Elasticsearch index.

### Recommended Search Flow

```
User types query
  ↓
400ms debounce fires
  ↓
Try getSefariaText(query) [direct ref lookup + fuzzy resolution]
  ├── Success (data && !data.error):
  │     → setResults([{ref: data.ref, he: data.he, en: data.en}])
  │     → Show single result card with full text preview
  │
  └── Failure (data.error or null):
        → Try searchSefariaText(query) [keyword search]
        ├── Results found:
        │     → setResults(hits)
        │     → Show list of result cards with snippet previews
        │
        └── No results:
              → Show "No results found. Try a more specific reference."
```

### Result Card Design (SearchResultCard.jsx)

Each result card should show:
1. The reference label (bold, e.g. "Bereshit 1:1" / "בראשית א׳:א׳")
2. A short Hebrew snippet (first 150-200 characters of `he` field, RTL)
3. A short English snippet (first 150-200 characters of `en` field, LTR) — or "No English translation available" if empty
4. An "Add to Sheet" button — prominently placed, single click adds to store

For the happy path (exact ref → single result), the single card is effectively the preview (EDIT-01). The user sees the full text before adding. No separate preview step needed.

**Two-click count:**
- Click 1: Press Enter or wait for debounce — result appears automatically (no click if debounced)
- Click 2: "Add to Sheet"

If the search input auto-focuses on page load, "Enter to search" counts as click 1 even with debounce. This satisfies EDIT-02.

### What NOT to Build

- Do not build a separate "preview modal" — the result card IS the preview
- Do not paginate results — Sefaria search returns 5; that is sufficient for the use case
- Do not cache search results across sessions — ephemeral UI state only

---

## Commentary and Header Insertion Pattern

### Where to Trigger Insertion

The current toolbar (`SheetToolbar.jsx`) already has "Add Note" and "Add Header" buttons. In Phase 3, these wire directly to `useSheetStore.getState().addSource()` instead of prop-drilled callbacks.

**For inserting at a specific position** (between two existing sources): the current implementation appends to the end. This is acceptable for v1. Inserting at a specific position is a UX enhancement beyond EDIT-05/EDIT-06 scope and should not be built in Phase 3.

**Toolbar placement options:**
- Option A: Floating toolbar above the sheet canvas (current approach) — keeps the canvas clean
- Option B: Inline "+" button between each source block — more discoverable but complex

Recommendation: Keep Option A (existing toolbar approach). The existing SheetToolbar UI is clean and already user-tested. Phase 3 refactors the wiring, not the toolbar UX.

### Commentary Block Editing

`CustomSourceBlock.jsx` handles inline editing via `EditableContent.jsx`. Both exist and work correctly. The only change in Phase 3 is:
1. Rename type from `'custom'` to `'commentary'` (optional — verify no Firestore migration issue first)
2. Wire `onUpdate` to `useSheetStore.getState().updateSource(index, updates)` instead of prop-drilled callback

**Type rename consideration:** If existing user sheets in Firestore have `type: 'custom'` entries, renaming to `'commentary'` requires a migration or a backward-compatible block dispatch that handles both. The Phase 1 `loadSheetWithDefaults` function should be checked. Safest option: keep `'custom'` as the type string in Phase 3 to avoid any migration risk; the label "Commentary" is cosmetic and can be applied in the UI regardless of the type string.

---

## Autosave Confirmation (EDIT-08)

**Finding: EDIT-08 is already fully implemented by Phase 1's `useAutosave` hook.**

From `01-04-PLAN.md` (the Phase 1 plan that creates `useAutosave`):

```javascript
// useAutosave subscribes to the store and fires a debounced Firestore write:
const unsubscribe = useSheetStore.subscribe(
  (state) => ({ title: state.title, sources: state.sources }),
  () => {
    // ... 1000ms debounced save to saveSheetToFirestore
  }
);
```

From `EditorContainer.jsx` (post-Phase-1):
```javascript
useAutosave(currentUser?.uid);
```

**Phase 3 has zero autosave work to do.** `useAutosave` is already mounted in `EditorContainer` and fires on every title or sources change. The `SavingIndicator` component is already wired to `isSaving` from the store.

The only Phase 3 consideration: ensure that when `addSource`, `removeSource`, `reorderSources`, `updateSource`, and `setTitle` are called from the new Phase 3 components, they go through the store (which triggers the subscription). Since all Phase 3 components will call `useSheetStore.getState().actionName()` directly, this is automatically satisfied.

**Confidence:** HIGH — verified by reading `01-04-PLAN.md` which specifies the `useAutosave` implementation in detail.

---

## Common Pitfalls

### Pitfall 1: DnD ID Collision When Same Source Added Twice

**What goes wrong:** The current `SheetView` uses `source.ref` as the DnD key and `SortableContext items`. If a user adds "Genesis 1:1" twice, both items have the same `id`. DnD will malfunction silently.

**Why it happens:** The current architecture uses Sefaria refs as identifiers. Multiple instances of the same ref are valid (e.g., showing the same verse in two sections).

**How to avoid:** Every source object must have a stable, unique `id` field assigned at creation time — `crypto.randomUUID()` or `Date.now().toString()`. The `addSource` action in `useSheetStore` should assign this. Verify this is done in Phase 1's store implementation; if not, add it in Phase 3 Plan 1.

**Warning signs:** DnD drag ends in wrong position; removing a source removes the wrong one; React key warnings about duplicate keys.

### Pitfall 2: Search Hammering Sefaria API

**What goes wrong:** No debounce on the search input means every keystroke fires a Sefaria API call. A 6-character query fires 6 requests, most of which are cancelled or return useless partial-word results.

**Why it happens:** React onChange fires on every character.

**How to avoid:** 400ms debounce using `setTimeout/clearTimeout` in a `useRef`. Clear the previous timer on every change. Pattern is identical to `useAutosave`.

**Warning signs:** Browser network tab shows many in-flight requests; Sefaria may rate-limit the IP.

### Pitfall 3: SearchPanel State Leaking into Store

**What goes wrong:** Developer puts `searchQuery`, `searchResults`, `isSearching` into `useSheetStore`. This pollutes the store with ephemeral UI state that autosave then tries to write to Firestore.

**Why it happens:** Convenience — everything is in one place.

**How to avoid:** Search state is local `useState` inside `SearchPanel.jsx`. Only the final `addSource({...})` call touches the store.

### Pitfall 4: DnD Sensor Activation on Contenteditable

**What goes wrong:** When the user tries to edit text inside a `SourceBlock` or `CommentaryBlock`, the `PointerSensor` intercepts the mousedown and starts a drag instead. This makes text editing impossible.

**Why it happens:** PointerSensor activates on any pointerdown by default.

**How to avoid:** Configure the PointerSensor with an activation constraint:

```jsx
// Source: @dnd-kit/core documentation
const sensors = useSensors(
  useSensor(PointerSensor, {
    activationConstraint: {
      distance: 8,  // 8px movement before drag starts
    },
  }),
  useSensor(KeyboardSensor, {
    coordinateGetter: sortableKeyboardCoordinates,
  })
);
```

This 8px distance constraint means normal clicks (for editing) don't trigger drag. Only deliberate dragging motions activate DnD. The current `SheetView.jsx` does NOT have this constraint — it will conflict with contentEditable editing. This is a known bug in the current implementation that Phase 3 should fix.

### Pitfall 5: Hebrew RTL Text Direction in Search Results

**What goes wrong:** Hebrew text in the search result preview displays LTR (from left to right), making it unreadable.

**Why it happens:** Missing `dir="rtl"` on the Hebrew text container.

**How to avoid:** In `SearchResultCard`, wrap Hebrew snippet in `<span dir="rtl" className="text-heb">`. The CSS from Phase 2 provides the correct font and line-height; the `dir` attribute is the critical piece.

### Pitfall 6: Type 'custom' vs 'commentary' Backward Compatibility

**What goes wrong:** Phase 3 changes block type from `'custom'` to `'commentary'`. Existing sheets in Firestore have `type: 'custom'`. The block dispatcher in the new `SheetCanvas` only handles `'commentary'` and doesn't render `'custom'` blocks. Existing user sheets silently lose their commentary blocks.

**Why it happens:** Type rename without migration.

**How to avoid:** Either (a) keep `type: 'custom'` as the wire format and only change the display label, or (b) handle both in the block dispatcher: `case 'custom': case 'commentary': return CommentaryBlock`. Option (b) is recommended as it keeps code forward-compatible while not breaking existing data.

---

## Code Examples

Verified patterns from existing codebase:

### Adding a source to the store (from useSheetPersistence.js, lines 369-424)

```javascript
// This is what addSource in useSheetStore does after Phase 1
// No changes needed — Phase 3 just calls it:
const addSource = useSheetStore.getState().addSource;
addSource({
  type: 'source',
  ref: 'Genesis 1:1',
  he: '...',
  en: '...',
  versionTitle: 'The Koren Jerusalem Bible'
});
```

### Drag-and-drop reorder (from SheetView.jsx, lines 108-119)

```javascript
// Existing pattern — works correctly, keep it:
const handleDragEnd = (event) => {
  const { active, over } = event;
  if (!over || active.id === over.id) return;
  const oldIndex = sources.findIndex((item) => item.id === active.id);
  const newIndex = sources.findIndex((item) => item.id === over.id);
  reorderSources(arrayMove(sources, oldIndex, newIndex));
};
```

### SortableItem wrapper (from SheetView.jsx, lines 20-50)

```javascript
// Extract this as SortableItem.jsx — no logic changes needed:
const SortableItem = ({ id, source, onRemove, onUpdate }) => {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id });
  const style = { transform: CSS.Transform.toString(transform), transition };
  const BlockComponent = getBlockComponent(source.type);
  return (
    <div ref={setNodeRef} style={style}>
      <BlockComponent
        source={source}
        onRemove={onRemove}
        onUpdate={onUpdate}
        dragHandleProps={{ ...attributes, ...listeners }}
      />
    </div>
  );
};
```

### Autosave hook usage (from 01-04-PLAN.md)

```javascript
// In EditorContainer.jsx — already done in Phase 1:
const { currentUser } = useAuth();
useAutosave(currentUser?.uid);
// That's it. No Phase 3 work here.
```

### Title input reading from store

```javascript
// Direct store subscription — no prop drilling:
const title = useSheetStore((s) => s.title);
const setTitle = useSheetStore.getState().setTitle;
// onChange: setTitle(e.target.value)
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Sources search via AI chat only | Dedicated SearchPanel with direct Sefaria API | Phase 3 | Primary UX unlock — direct search without AI |
| DnD using source.ref as id | DnD using stable source.id (uuid) | Phase 3 | Fixes DnD bugs when same source added twice |
| SheetView.jsx (~340 lines, mixed concerns) | SheetCanvas.jsx (render-only) + SearchPanel + EditorToolbar | Phase 3 | Each component has one job |
| State via useSheetPersistence prop drilling | Direct useSheetStore reads in leaf components | Phase 1 + Phase 3 | Eliminates prop drilling 4-6 levels deep |
| PointerSensor without activation constraint | PointerSensor with distance: 8 constraint | Phase 3 | Fixes contentEditable editing conflict with drag |

**No deprecated APIs in use.** `@dnd-kit/sortable` v10 and `@dnd-kit/core` v6 are the current versions in this repo and match the library's current API. `useSortable`, `SortableContext`, `arrayMove` are all stable.

---

## Open Questions

1. **Does Phase 1's `addSource` in `useSheetStore` assign a stable `id` (uuid) to each source?**
   - What we know: The `addSource` action spec in `01-04-PLAN.md` does not explicitly mention assigning a uuid. The existing `useSheetPersistence.addSource` does not add a uuid either — it uses `source.ref` as identity.
   - What's unclear: Whether Phase 1 Plan 02 (the store itself) adds id assignment.
   - Recommendation: Plan 3-01 must verify this and add `source.id = source.id || crypto.randomUUID()` in the store's `addSource` action if not already present. This is a must-fix before DnD can work correctly.

2. **Should commentary blocks use type `'custom'` (backward compatible) or `'commentary'` (clean)?**
   - What we know: Existing Firestore data uses `'custom'`. New code would prefer `'commentary'`.
   - What's unclear: How many existing user sheets have `'custom'` blocks.
   - Recommendation: Handle both `'custom'` and `'commentary'` in the block dispatcher. Use `'commentary'` for all new blocks created in Phase 3. No data migration required.

3. **SearchPanel placement in the layout: inline above the sheet, or sidebar?**
   - What we know: The current layout has a left sidebar (ChatSidebar) and a main content area (SheetView). A search panel in the main content area (above the sheet canvas) is the most discoverable placement.
   - What's unclear: Whether the Phase 2 layout (being designed now) allocates space for a search panel above the sheet.
   - Recommendation: Place the SearchPanel as a fixed-height section above the sheet canvas in the main content area. It collapses when empty (no query) to maximize sheet canvas space.

---

## Recommended Plan Breakdown

Phase 3 should have 4 plans:

### Plan 03-01: Source Identity and Data Shape Foundation

**Requirements:** EDIT-03 (prerequisite), EDIT-04 (prerequisite)
**Scope:** Verify or add stable `id` field to all source objects; confirm block dispatch handles all 4 types (`source`, `commentary`/`custom`, `header`, `divider`); add `divider` block type.
**Why first:** DnD correctness depends on stable ids. All other plans depend on this.
**Files:** `src/stores/useSheetStore.js` (verify/add id assignment), `src/components/sheet/DividerBlock.jsx` (new, trivial), `src/components/sheet/SortableItem.jsx` (extract from SheetView)

### Plan 03-02: SearchPanel — Sefaria Search and Add

**Requirements:** EDIT-01, EDIT-02
**Scope:** Build `SearchPanel.jsx` and `SearchResultCard.jsx`. Wire to `getSefariaText` + `searchSefariaText`. Wire "Add to Sheet" to store. Ensure two-click add path works.
**Why second:** Core new functionality. Depends on stable source ids from Plan 01.
**Files:** `src/components/editor/SearchPanel.jsx` (new), `src/components/editor/SearchResultCard.jsx` (new)

### Plan 03-03: SheetCanvas Rebuild — DnD + Block Rendering

**Requirements:** EDIT-03, EDIT-04, EDIT-05, EDIT-06, EDIT-07
**Scope:** Extract `SheetCanvas.jsx` from `SheetView.jsx`. Wire DnD with `distance: 8` activation constraint. Wire title input to store. Wire toolbar add-note/add-header/add-divider buttons to store. Remove export logic (Phase 4). Remove AI chat logic (stays in EditorContainer).
**Why third:** Depends on stable ids (Plan 01). SearchPanel can be placed above this canvas once it exists.
**Files:** `src/components/sheet/SheetCanvas.jsx` (refactor of SheetView), `src/components/editor/EditorToolbar.jsx` (extract/refactor of SheetToolbar)

### Plan 03-04: Integration and Wiring

**Requirements:** EDIT-07, EDIT-08 (verify), all EDIT requirements integration test
**Scope:** Update `EditorContainer.jsx` to compose `SearchPanel` + `SheetCanvas` + `EditorToolbar`. Verify `useAutosave` fires on all mutation paths. Verify existing sheets still load correctly from Firestore. Smoke test all 8 EDIT requirements.
**Why last:** Integration only after all components exist.
**Files:** `src/components/EditorContainer.jsx` (update composition), CSS tweaks for search panel layout

---

## Validation Architecture

Note: `workflow.nyquist_validation` is not set in `.planning/config.json` — the config only has `workflow.research`, `workflow.plan_check`, and `workflow.verifier`. Skipping the formal test framework section per the output format rules.

However, each plan should include manual smoke tests for the EDIT requirements:

| Req ID | Behavior | Manual Verification |
|--------|----------|---------------------|
| EDIT-01 | Search and preview Hebrew + English before add | Type "Genesis 1:1" → result card shows Hebrew + English |
| EDIT-02 | Add source in 2 clicks or fewer | Enter ref → Enter → click Add → source in sheet |
| EDIT-03 | Drag-and-drop reorder | Drag source 2 above source 1 → order persists on refresh |
| EDIT-04 | Remove source | Click X on source → source disappears immediately |
| EDIT-05 | Add commentary block | Click "Add Note" → empty block appears → type text → visible in sheet |
| EDIT-06 | Add section header / divider | Click "Add Header" → header appears; click "Add Divider" → hr appears |
| EDIT-07 | Set sheet title | Type in title input → title updates in browser tab and persists |
| EDIT-08 | Auto-saves | Add source → wait 1.5s → reload page → source still present |

---

## Sources

### Primary (HIGH confidence)
- Direct codebase read: `src/components/SheetView.jsx` — DnD pattern, block dispatch, existing implementation
- Direct codebase read: `src/services/sefaria.js` — full API client, both `getSefariaText` and `searchSefariaText` functions
- Direct codebase read: `src/hooks/useSheetPersistence.js` — current addSource flow, autosave debounce pattern, disambiguation state
- Direct codebase read: `package.json` — confirmed @dnd-kit/core@6.3.1, @dnd-kit/sortable@10.0.0, @dnd-kit/utilities@3.2.2 installed
- Direct codebase read: `.planning/phases/01-data-layer-foundation/01-04-PLAN.md` — confirmed useAutosave implementation spec
- Direct codebase read: `src/components/sheet/SourceBlock.jsx`, `CustomSourceBlock.jsx`, `SectionHeaderBlock.jsx`, `EditableContent.jsx` — confirmed existing block components

### Secondary (MEDIUM confidence)
- @dnd-kit official documentation (dndkit.com) — activation constraint pattern (`distance: 8` for PointerSensor to avoid contenteditable conflict) — consistent with known library behavior

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all verified by reading package.json directly
- Architecture: HIGH — all patterns extracted from working existing code
- DnD implementation: HIGH — existing SheetView has working DnD; the patterns are already proven
- Sefaria search UX: HIGH — both API functions exist and work; the flow design is based on the existing API signatures
- Autosave (EDIT-08): HIGH — Phase 1 plan explicitly specifies and creates useAutosave
- Data shapes: HIGH — derived from reading all four block components and addSource implementation
- Pitfalls: HIGH — all identified from reading actual code (not speculation)

**Research date:** 2026-03-04
**Valid until:** 2026-04-04 (stable stack; no fast-moving dependencies)
