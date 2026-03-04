# Phase 4: PDF Export and Public Sharing - Research

**Researched:** 2026-03-04
**Domain:** CSS @media print, Firestore security rules, React routing, public/private data access
**Confidence:** HIGH

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| EXPRT-01 | User can export sheet as PDF via `window.print()` + `@media print` CSS (text selectable, no rasterization) | Print CSS pattern documented; existing `handleExportPDF` in SheetView replaces html2pdf.js call |
| EXPRT-02 | Print stylesheet preserves bilingual column layout with Hebrew RTL | Flex-based print column pattern documented; `dir="rtl"` is an HTML attribute that survives print |
| EXPRT-03 | Source blocks do not break across pages (`page-break-inside: avoid`) | `page-break-inside: avoid` must be applied to `.source-block` wrapper div, NOT the flex children |
| EXPRT-04 | Print output omits all editor UI chrome | Explicit `display: none` list of app-shell classes documented; `@media print` targeting `.app-shell` |
| SHARE-01 | User can mark sheet public, generating shareable URL without login | `setSheetPublic()` function signature documented; isPublic Firestore field pattern |
| SHARE-02 | Public reads scoped to `isPublic == true`; not the whole collection | Firestore rule snippet verified against official docs security model |
| SHARE-03 | User can view all their saved sheets in a library/dashboard | `getUserSheets()` + dedicated `/library` route architecture documented |
| SHARE-04 | User can search or filter sheet library by title | Client-side filter recommended (Firestore title prefix search limitations documented) |
</phase_requirements>

---

## Summary

Phase 4 adds two independent features to an already-working React 19 + Vite + Firebase application: (1) browser-native PDF export via CSS `@media print`, and (2) public sharing with Firestore security rules and a sheet library dashboard.

The PDF work is primarily CSS authoring. The existing `handleExportPDF` function in `SheetView.jsx` (line 157) calls `html2pdf.js`, which must be replaced with a single `window.print()` call. The `html2pdf.js` package must be removed from `package.json` and its import dropped from `SheetView.jsx` (line 7). All print CSS lives in a new `@media print` block in `App.css`, targeting existing class names. No new components are needed for EXPRT-01 through EXPRT-04.

The sharing work requires: one new Firestore function (`setSheetPublic`), one new route (`/library`), one new component (`SheetLibrary`), updates to the existing `ShareButton` component to toggle `isPublic` instead of just copying the URL, and Firestore security rule changes. The existing `getSheetFromFirestore` already returns public sheets to unauthenticated users IF the Firestore rules permit it — the rule change is the critical gate.

**Primary recommendation:** Implement in two waves: Wave A = all EXPRT requirements (CSS-only, no Firebase changes, low risk), Wave B = all SHARE requirements (Firebase + new route, higher coordination surface).

---

## Standard Stack

### Core (already in project — no new installs)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| react-router-dom | ^7.12.0 | New `/library` route + public sheet route detection | Already installed, HashRouter in use |
| firebase/firestore | ^12.8.0 | `setSheetPublic`, Firestore security rules | Already initialized in `firebase.js` |
| CSS `@media print` | Browser native | PDF generation without rasterization | Zero dependencies; text remains selectable |

### Remove

| Package | Reason |
|---------|--------|
| `html2pdf.js` | Confirmed RTL/Hebrew bugs; replaced by `window.print()`. Remove from `package.json` and drop `import html2pdf from 'html2pdf.js'` from `SheetView.jsx` line 7 |

**No new npm installs required for this phase.**

---

## Architecture Patterns

### Existing Structure (relevant files)

```
src/
├── App.jsx                          # HashRouter routes — add /library route here
├── App.css                          # All CSS — add @media print block here
├── services/
│   └── firebase.js                  # Add setSheetPublic(), getUserSheets()
├── components/
│   ├── SheetView.jsx                # Replace handleExportPDF; remove html2pdf import
│   ├── sheet/
│   │   ├── ShareButton.jsx          # Upgrade: toggle isPublic + show share URL
│   │   └── SheetToolbar.jsx         # Receives sheetId + isPublic props — pass through
│   └── library/                     # NEW directory
│       └── SheetLibrary.jsx         # NEW component for SHARE-03/04
```

### Pattern 1: CSS @media print — Hide Everything Except Sheet Content

The app-shell is a CSS Grid with named areas: `sidebar`, `header`, `content`. For print, we want only `.shell-content > .sheet-paper` (the `id="sheet-export-area"` div in SheetView).

**What:** A single `@media print` block in `App.css` that hides all non-paper elements and resets the grid to a single-column full-width layout.

**When to use:** This is the only print CSS strategy for this codebase.

```css
/* Source: App.css — append below existing @media print block at line ~2204 */
@media print {
  /* 1. Force white background / black text regardless of dark mode */
  * {
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }

  /* 2. Hide all app chrome */
  .shell-sidebar,
  .shell-header,
  .shell-overlays,
  .sheet-toolbar,
  .source-controls,
  .drag-handle,
  .sheet-footer,
  .empty-state,
  .gemini-input-box,
  .gemini-suggestions,
  .toast-container,
  [data-html2canvas-ignore="true"] {
    display: none !important;
  }

  /* 3. Collapse app-shell grid to full-page content only */
  .app-shell {
    display: block !important;
    height: auto !important;
    width: 100% !important;
    overflow: visible !important;
  }

  /* 4. Make shell-content fill the page */
  .shell-content {
    display: block !important;
    overflow: visible !important;
    width: 100% !important;
    height: auto !important;
  }

  /* 5. Sheet view resets */
  .sheet-view {
    overflow: visible !important;
    height: auto !important;
    padding: 0 !important;
  }

  /* 6. Paper fills page */
  .sheet-paper {
    max-width: 100% !important;
    padding: 0 !important;
    box-shadow: none !important;
    border: none !important;
  }

  /* 7. Preserve bilingual columns at print — flex still works in print */
  .source-content {
    display: flex !important;
    gap: 1.5rem !important;
  }

  /* 8. THE CRITICAL PAGE-BREAK RULE — must be on the sortable wrapper */
  .sortable-item {
    page-break-inside: avoid;
    break-inside: avoid;   /* modern equivalent */
  }

  /* 9. Source block itself also gets the rule for double safety */
  .source-block {
    page-break-inside: avoid;
    break-inside: avoid;
  }

  /* 10. Title input: hide the input chrome, show the value */
  .title-input {
    border: none !important;
    background: transparent !important;
    padding: 0 !important;
    font-size: 1.8rem !important;
    font-weight: bold !important;
  }
}
```

### Pattern 2: window.print() Replacement for handleExportPDF

The existing `handleExportPDF` in `SheetView.jsx` (lines 157–167) uses `html2pdf.js`. Replace the entire function body with:

```javascript
// Source: MDN Web Docs - window.print()
// SheetView.jsx — handleExportPDF replacement
const handleExportPDF = () => {
  // Set document title so the browser uses it as default PDF filename
  const prevTitle = document.title;
  document.title = sheetTitle || 'Source Sheet';
  window.print();
  // Restore title after print dialog closes
  document.title = prevTitle;
};
```

Remove `import html2pdf from 'html2pdf.js';` from line 7 of `SheetView.jsx`.

### Pattern 3: page-break-inside with flexbox — The Wrapper Rule

**Critical finding:** `page-break-inside: avoid` does NOT work reliably on flex children. It must be applied to the BLOCK-LEVEL wrapper.

In this codebase, `SortableSourceItem` renders:
```jsx
<div ref={setNodeRef} style={style} className="sortable-item">
  <BlockComponent ... />
</div>
```

The `.sortable-item` div is a block-level container. `page-break-inside: avoid` applied to `.sortable-item` in `@media print` is the correct target. Also apply to `.source-block` for defense-in-depth.

The `.source-content` flex container itself should NOT get `page-break-inside: avoid` alone — the break avoidance must wrap the ENTIRE source block (header + content combined), not just the text columns.

### Pattern 4: Firestore Security Rules for Public/Private Sheets

**Current state:** No `firestore.rules` file was found in the project root. This means rules are either managed in the Firebase console directly or the file has not been committed. Either way, the rules must be explicitly set.

**The trap to avoid:** `allow read: if true` on the entire `sheets` collection grants any authenticated or unauthenticated user access to all sheets — including private ones. The rule must check `resource.data.isPublic`.

```javascript
// firestore.rules — correct pattern
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    match /sheets/{sheetId} {
      // WRITE: only the owner can create/update/delete
      allow write: if request.auth != null
                   && request.auth.uid == resource.data.ownerId;

      // CREATE (new doc has no resource.data yet)
      allow create: if request.auth != null
                    && request.auth.uid == request.resource.data.ownerId;

      // READ: owner always; public sheets to anyone
      allow read: if request.auth != null && request.auth.uid == resource.data.ownerId
               || resource.data.isPublic == true;
    }

    // User list query: owner reads their own sheets
    // (subscribeToUserSheets uses where("ownerId", "==", userId) — this is covered above)
  }
}
```

**Security note on Firestore queries:** Firestore rules cannot fully restrict collection-level queries the same way document reads work. When `subscribeToUserSheets` runs `where("ownerId", "==", userId)`, the rule `request.auth.uid == resource.data.ownerId` is evaluated per document — documents not matching will fail individually. This means the existing `subscribeToUserSheets` query continues to work for authenticated users without changes.

**Public unauthenticated read:** When an unauthenticated visitor loads `/sheet/:sheetId` and the component calls `getSheetFromFirestore(sheetId)`, Firestore evaluates `resource.data.isPublic == true`. If true, the read succeeds. If false, it throws a permission-denied error. The public sheet component must catch this error and show a "Sheet not found or private" message.

### Pattern 5: Public Sheet View — Route + Component Strategy

**Decision:** Reuse the existing `/sheet/:sheetId` route rather than adding `/public/:sheetId`. The `EditorContainer` already knows the auth state via `useAuth()`. The architecture is:

1. Unauthenticated visitor navigates to `/#/sheet/abc123`
2. `EditorContainer` loads — `currentUser` is null
3. `useSheetPersistence` calls `getSheetFromFirestore(sheetId)`
4. If sheet has `isPublic: true`, Firestore rule allows the read
5. Sheet data loads — but `currentUser` is null, so no editing is available
6. `EditorContainer` renders in read-only mode (no toolbar, no chat sidebar)

**Implementation approach:** Add a `isPublic` and `isOwner` derived state in `EditorContainer`:

```jsx
// In EditorContainer.jsx
const isOwner = currentUser && currentSheetId &&
                userSheets.some(s => s.id === currentSheetId);
const isReadOnly = !isOwner;  // Unauthenticated visitors, or viewing another's public sheet
```

When `isReadOnly === true`:
- Do NOT render `ChatSidebar` (`.shell-sidebar`)
- Do NOT render `SheetToolbar`
- Render a "Login to Edit" banner instead of the toolbar area
- The `SheetView` title input becomes a static `<h1>` (no `onTitleChange`)

This avoids a separate `PublicSheetView` component and reuses all existing rendering logic.

### Pattern 6: Sheet Library — SHARE-03 and SHARE-04

**Existing data:** `subscribeToUserSheets` already provides all user sheets in real-time. `userSheets` is already in `useSheetPersistence` state and passed through to `ChatSidebar`. The library just needs a dedicated route and view.

**Route:** Add `/library` to `App.jsx` as a lazy-loaded route.

**Component:** `src/components/library/SheetLibrary.jsx` — a standalone page component that:
- Calls `subscribeToUserSheets` directly (or receives sheets via context/props)
- Renders a list/grid of sheet cards with: title, updatedAt, isPublic badge, open/delete actions
- Has a local `filterQuery` state for SHARE-04 client-side search

**Client-side search rationale (SHARE-04):** Firestore does not support substring/contains text search (`where("title", "contains", query)`). It only supports prefix queries with `.startAt(query).endAt(query + "\uf8ff")`. For a personal library of at most hundreds of sheets, client-side `Array.filter()` on already-loaded data is correct, simpler, and has no latency cost. Do NOT use Firestore queries for search.

```javascript
// Client-side filter pattern for SheetLibrary
const filteredSheets = useMemo(() => {
  if (!searchQuery.trim()) return userSheets;
  return userSheets.filter(sheet =>
    sheet.title?.toLowerCase().includes(searchQuery.toLowerCase())
  );
}, [userSheets, searchQuery]);
```

### Anti-Patterns to Avoid

- **`allow read: if true`** on the sheets collection: Exposes all private sheets to anyone with the sheetId. The rule must check `isPublic == true` OR authenticated owner.
- **Applying `page-break-inside: avoid` only to flex children (.text-eng, .text-heb):** Does not prevent mid-source breaks. The avoid rule must be on the `.sortable-item` wrapper that contains the ENTIRE source block.
- **Not resetting `document.title` after `window.print()`:** The browser uses the document title as the suggested filename in the save dialog. Restore it after the print dialog closes.
- **Separate `/public/:sheetId` route:** Unnecessary duplication. The existing route with read-only state detection is architecturally cleaner.
- **Not handling Firestore permission-denied errors in `getSheetFromFirestore`:** Unauthenticated users loading a private sheet will get an unhandled exception. Must catch and display a graceful "not found" message.
- **Keeping html2pdf.js in package.json after migration:** It adds ~180KB to the bundle for zero functionality. Remove it explicitly with `npm uninstall html2pdf.js`.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| PDF with text selection | html2pdf.js, jsPDF, Puppeteer | CSS `@media print` + `window.print()` | html2pdf rasterizes text; Puppeteer needs a server; window.print is zero-dependency |
| Hebrew text in PDF | Any JS canvas renderer | Browser's built-in print renderer | Browsers handle Unicode BiDi natively; canvas-based renderers all have RTL issues |
| Sheet title as PDF filename | Custom logic | `document.title = sheetTitle; window.print()` | Browsers use document.title as the default filename |
| Title search in Firestore | Complex Firestore queries | `Array.filter()` on client | Firestore has no contains query; client filter is correct for personal libraries |
| Public URL routing | New route pattern | Same `/sheet/:sheetId` + `isReadOnly` prop | Avoids duplication; auth state already available via `useAuth()` |

---

## Common Pitfalls

### Pitfall 1: `overflow: hidden` on `.shell-content` breaks print layout

**What goes wrong:** `AppShell.css` line 76 sets `overflow: hidden` on `.shell-content`. In print mode, this clips content — pages past the first show nothing.

**Why it happens:** CSS `overflow: hidden` applies in print context unless overridden.

**How to avoid:** In the `@media print` block, set `.shell-content { overflow: visible !important; }` and `.app-shell { overflow: visible !important; }`.

**Warning signs:** Print preview shows only the first visible viewport of the sheet, blank pages after.

### Pitfall 2: Dark mode CSS variables in print

**What goes wrong:** The `[data-theme='dark']` attribute on `document.documentElement` sets dark background colors via CSS variables. Printed output shows dark backgrounds.

**Why it happens:** `@media print` does not reset CSS variable inheritance.

**How to avoid:** In `@media print`, force `body { background: white !important; color: black !important; }` and override `--sheet-bg: white; --sheet-text: black; --source-bg: white;` on `:root` within the print block. Also ensure `--font-ui`, `--font-english-serif`, and `--font-hebrew` are web-safe fallbacks — Google Fonts may not load in all print contexts.

**Warning signs:** Dark backgrounds in PDF, invisible text (white on white).

### Pitfall 3: `page-break-inside: avoid` ignored on flex containers

**What goes wrong:** Applying `page-break-inside: avoid` to a display:flex element (`.source-content`) is unreliable across browsers. Chrome and Firefox handle flex break-inside inconsistently.

**Why it happens:** The CSS fragmentation spec interaction with flexbox is complex and has long-standing browser inconsistencies.

**How to avoid:** Apply `page-break-inside: avoid` to the BLOCK-LEVEL container (`.sortable-item`, `.source-block`). Do NOT rely on break avoidance on flex items. If a source block is very long, it will still break across pages — `avoid` only prevents breaks when the block fits on one page.

**Warning signs:** Source blocks split mid-content despite the CSS rule being set.

### Pitfall 4: Firestore write rule omits the CREATE case

**What goes wrong:** The rule `allow write: if request.auth.uid == resource.data.ownerId` uses `resource.data`, but for a CREATE operation, `resource` does not yet exist (the document doesn't exist). This causes all writes to new documents to fail.

**Why it happens:** `resource` refers to the existing document. For new documents, use `request.resource` (the incoming data).

**How to avoid:** Split into separate `allow create` and `allow update, delete` rules:
```
allow create: if request.auth != null && request.auth.uid == request.resource.data.ownerId;
allow update, delete: if request.auth != null && request.auth.uid == resource.data.ownerId;
```

**Warning signs:** `saveSheetToFirestore` fails with "Missing or insufficient permissions" for first-time saves.

### Pitfall 5: HashRouter URLs don't play well as shareable links in some contexts

**What goes wrong:** The app uses `HashRouter` (`/#/sheet/abc123`). Some email clients and Slack strip anchor fragments. The URL `https://chevruta.ai/#/sheet/abc123` may become `https://chevruta.ai/` when clicked.

**Why it happens:** URL fragments (the `#` part) are not sent to the server and are sometimes stripped by link previewing tools.

**How to avoid:** HashRouter is currently in place and the research scope is locked to it. The share URL should be the full hash URL (`window.location.href`). Document this as a known limitation. V2 could migrate to BrowserRouter + Vercel `vercel.json` rewrite rules.

**Warning signs:** Shared links land on the home page instead of the sheet.

### Pitfall 6: `setSheetPublic` race condition with `saveSheetToFirestore`

**What goes wrong:** If the user toggles isPublic while an autosave is in progress, two simultaneous `setDoc` calls may conflict.

**Why it happens:** `useSheetPersistence` has an autosave debounce. `setSheetPublic` is a separate direct write.

**How to avoid:** Use `setDoc` with `{ merge: true }` in `setSheetPublic` — this is already the pattern in `saveSheetToFirestore`. A merge write only overwrites the specified fields, so the race condition results in the correct final state (isPublic field is set, other fields are not overwritten). No additional locking needed.

---

## Code Examples

### Firebase Service Functions Needed

```javascript
// src/services/firebase.js — add these two functions

/**
 * SHARE-01: Toggle public/private state of a sheet
 * @param {string} sheetId
 * @param {boolean} isPublic
 */
export const setSheetPublic = async (sheetId, isPublic) => {
  const sheetRef = doc(db, 'sheets', sheetId);
  await setDoc(sheetRef, { isPublic }, { merge: true });
};

/**
 * SHARE-03: Get all sheets for a user (one-time read, for library page initial load)
 * Note: subscribeToUserSheets (already exists) is preferred for real-time updates.
 * This one-time version is useful for the library if real-time updates aren't needed.
 * @param {string} userId
 * @returns {Promise<Array>}
 */
export const getUserSheets = async (userId) => {
  if (!userId) return [];
  const q = query(
    collection(db, 'sheets'),
    where('ownerId', '==', userId),
    orderBy('updatedAt', 'desc')
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
};
// Note: getDocs must be imported from 'firebase/firestore' at the top of firebase.js
```

Import addition needed in `firebase.js`:
```javascript
import {
  // ... existing imports ...
  getDocs   // ADD THIS
} from 'firebase/firestore';
```

### ShareButton Upgrade (SHARE-01)

The existing `ShareButton` only copies the URL. It needs to be upgraded to toggle `isPublic` and then copy the URL. It needs `sheetId` and `isPublic` props passed down through `SheetToolbar`.

```jsx
// src/components/sheet/ShareButton.jsx — upgraded signature
const ShareButton = ({ sheetId, isPublic, onTogglePublic }) => {
  const { showToast } = useToast();
  const [isCopied, setIsCopied] = useState(false);

  const handleMakePublic = async () => {
    if (!sheetId) {
      showToast('Save the sheet first before sharing.', 'info');
      return;
    }
    await onTogglePublic(!isPublic);
    if (!isPublic) {
      // Becoming public — copy the URL
      const url = window.location.href;
      navigator.clipboard.writeText(url).then(() => {
        setIsCopied(true);
        showToast('Sheet is now public. Link copied!', 'success');
        setTimeout(() => setIsCopied(false), 2000);
      });
    } else {
      showToast('Sheet is now private.', 'info');
    }
  };

  // ... render with isPublic state indicator
};
```

The `onTogglePublic` handler lives in `useSheetPersistence` (or a small wrapper in `EditorContainer`) and calls `setSheetPublic(sheetId, newValue)`.

Prop chain to add:
- `EditorContainer` gets `isPublic` from `useSheetPersistence` (new state field)
- Passes `sheetId={currentSheetId}`, `isPublic={isPublic}`, `onTogglePublic={handleTogglePublic}` to `SheetView`
- `SheetView` passes them to `SheetToolbar`
- `SheetToolbar` passes them to `ShareButton`

### SheetLibrary Component Structure

```jsx
// src/components/library/SheetLibrary.jsx
import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { subscribeToUserSheets, deleteSheetFromFirestore } from '../../services/firebase';

const SheetLibrary = () => {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const [sheets, setSheets] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    if (!currentUser) return;
    const unsubscribe = subscribeToUserSheets(currentUser.uid, setSheets);
    return unsubscribe;
  }, [currentUser]);

  // SHARE-04: Client-side filter
  const filteredSheets = useMemo(() => {
    if (!searchQuery.trim()) return sheets;
    return sheets.filter(s =>
      s.title?.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [sheets, searchQuery]);

  if (!currentUser) return <div>Please log in to view your library.</div>;

  return (
    <div className="sheet-library">
      <h1>My Source Sheets</h1>
      <input
        type="search"
        placeholder="Search sheets..."
        value={searchQuery}
        onChange={e => setSearchQuery(e.target.value)}
      />
      <div className="library-grid">
        {filteredSheets.map(sheet => (
          <div key={sheet.id} className="library-card">
            <h3 onClick={() => navigate(`/sheet/${sheet.id}`)}>{sheet.title || 'Untitled'}</h3>
            {sheet.isPublic && <span className="public-badge">Public</span>}
            <button onClick={() => deleteSheetFromFirestore(sheet.id)}>Delete</button>
          </div>
        ))}
      </div>
    </div>
  );
};

export default SheetLibrary;
```

### App.jsx Route Addition

```jsx
// App.jsx — add lazy import
const SheetLibrary = lazy(() => import('./components/library/SheetLibrary'));

// Add route in <Routes>
<Route path="/library" element={<SheetLibrary />} />
```

Note: The existing `/dashboard` route redirects to `/`. For SHARE-03, `/library` is the correct new path (per comment in App.jsx line 55: "User hated the dashboard. Redirect to editor."). The library is a new, lightweight view — not the old dashboard.

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| html2pdf.js (canvas rasterization) | CSS `@media print` + `window.print()` | March 2026 (Hebrew RTL bug discovered) | Text becomes selectable; Hebrew renders correctly |
| `allow read: if true` | `isPublic == true \|\| owner check` | Phase 4 | Prevents private sheet exposure |
| Dashboard (removed per App.jsx comment) | `/library` dedicated route | Phase 4 | Lightweight, search-enabled |
| `HashRouter` | `HashRouter` (unchanged) | — | Share URLs include `#` fragment; known limitation |

**Deprecated/outdated:**
- `html2pdf.js`: Remove entirely. The `data-html2canvas-ignore="true"` attribute on `.source-controls` in `SourceBlock.jsx` line 51 was placed there specifically for html2pdf — it can be removed after the migration, though keeping it is harmless.
- Existing `@media print` block (App.css ~line 2204): Only hides toolbar borders and backgrounds. Must be EXPANDED, not replaced, with the full print CSS from Pattern 1 above.

---

## Open Questions

1. **Should `isPublic` persist in `useSheetPersistence` state, or be read fresh from Firestore on toggle?**
   - What we know: The sheet data object already includes all Firestore fields when loaded. `isPublic` will be present if set.
   - What's unclear: Whether autosave might overwrite an `isPublic: true` with `isPublic: undefined` if the field isn't tracked in local state.
   - Recommendation: Add `isPublic` to the state tracked in `useSheetPersistence`. Initialize from loaded sheet data. The sanitize function in `saveSheetToFirestore` filters `undefined` values already — but `isPublic` should be explicitly included in the `dataToSave` object with a default of `false` to prevent accidental public exposure on resave.

2. **Does the existing `/sheet/:sheetId` route handle unauthenticated access without redirect?**
   - What we know: `AuthContext` does not redirect unauthenticated users; it just exposes `currentUser: null`. `useSheetPersistence` checks `if (!userId) return () => {}` for `subscribeToUserSheets` but calls `getSheetFromFirestore` unconditionally.
   - What's unclear: Whether there is any `PrivateRoute` wrapper not visible in current code.
   - Recommendation: Review `useSheetPersistence` for any auth guards on `getSheetFromFirestore` before assuming unauthenticated access works. (Codebase review confirms no redirect — `getSheetFromFirestore` at line 102 of firebase.js has no auth check.)

3. **What happens to the sheet library nav entry point?**
   - What we know: There is no nav link to `/library` in the current UI. `UnifiedHeader` and `ChatSidebar` would need a "My Sheets" link added.
   - Recommendation: Add a "My Library" link to `UnifiedHeader` for authenticated users only. This is a small UI addition, not a separate research question.

---

## Sources

### Primary (HIGH confidence)
- MDN Web Docs - CSS `@media print` - [https://developer.mozilla.org/en-US/docs/Web/CSS/@media#print](https://developer.mozilla.org/en-US/docs/Web/CSS/@media#print)
- MDN Web Docs - CSS `page-break-inside` / `break-inside` - [https://developer.mozilla.org/en-US/docs/Web/CSS/break-inside](https://developer.mozilla.org/en-US/docs/Web/CSS/break-inside)
- Firebase Firestore Security Rules docs - [https://firebase.google.com/docs/firestore/security/get-started](https://firebase.google.com/docs/firestore/security/get-started)
- Firebase Firestore Security Rules - resource.data access - [https://firebase.google.com/docs/reference/rules/rules.firestore.Resource](https://firebase.google.com/docs/reference/rules/rules.firestore.Resource)
- Codebase: `src/components/SheetView.jsx` — existing html2pdf.js usage at lines 7, 157-167
- Codebase: `src/App.css` — existing `@media print` at ~line 2204; `.source-content` flex layout at line 684
- Codebase: `src/services/firebase.js` — existing Firestore functions, missing `setSheetPublic`/`getUserSheets`
- Codebase: `src/App.jsx` — HashRouter, existing `/sheet/:sheetId` route, missing `/library` route

### Secondary (MEDIUM confidence)
- CSS fragmentation spec interaction with flexbox: documented via MDN break-inside + multiple browser bug reports confirming block-level wrapper requirement
- Firestore create vs update rule split: confirmed via Firebase official security rules guide

### Tertiary (LOW confidence — verify before implementing)
- HashRouter fragment stripping in email/messaging clients: community-reported behavior, not officially documented. Verify with a test link before shipping share feature.

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — no new packages; all libraries already in project
- Print CSS patterns: HIGH — MDN-verified, tested against existing class names from codebase
- Firestore rules: HIGH — official Firebase docs pattern
- Architecture (route/component): HIGH — based on direct codebase inspection
- Client-side search recommendation: HIGH — Firestore query limitations for text search are well-documented
- HashRouter share URL limitation: MEDIUM — community-reported, not officially documented

**Research date:** 2026-03-04
**Valid until:** 2026-04-04 (stable domain — Firebase rules API and CSS print spec are stable)
