---
phase: 04-pdf-export-sharing
plan: 03
subsystem: ui
tags: [sharing, library, isPublic, read-only, firebase, SheetLibrary, ShareButton]

# Dependency graph
requires:
  - phase: 04-pdf-export-sharing
    plan: 02
    provides: setSheetPublic and subscribeToUserSheets in firebase.js

provides:
  - isPublic toggle UI: ShareButton toggles public/private state via setSheetPublic
  - handleTogglePublic async callback in EditorContainer
  - isReadOnly derived state hides editor chrome for unauthenticated/non-owner visitors
  - SheetLibrary page with real-time list and client-side search at /library
  - My Library link in UnifiedHeader for authenticated users

affects: [phase-05, any future library/sharing work]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "isPublic as local useState alongside googleDocId in EditorContainer — same pattern as existing Google Docs state"
    - "isOwner derived from currentUser + userSheets.some(s => s.id === currentSheetId) — owner check without extra Firestore read"
    - "isReadOnly = !isOwner — one derived boolean gates entire editor chrome (sidebar, toolbar, search)"
    - "Client-side filter: useMemo + Array.filter + .toLowerCase().includes() — zero latency for personal libraries"
    - "Lazy import for SheetLibrary — code-splits to 2.11 kB separate chunk"

key-files:
  created:
    - src/components/library/SheetLibrary.jsx
  modified:
    - src/components/sheet/ShareButton.jsx
    - src/components/sheet/SheetToolbar.jsx
    - src/components/editor/EditorToolbar.jsx
    - src/components/SheetView.jsx
    - src/components/EditorContainer.jsx
    - src/components/UnifiedHeader.jsx
    - src/App.jsx

key-decisions:
  - "isPublic state placed in EditorContainer as local useState (not useSheetPersistence) — useSheetPersistence.js does not exist in this codebase; architecture uses useSheetStore (Zustand) + local state in EditorContainer, same as googleDocId and isSyncing"
  - "ShareButton wired through EditorToolbar (not SheetToolbar in SheetView) — EditorContainer uses EditorToolbar/SheetCanvas/SearchPanel, not the legacy SheetView component"
  - "isReadOnly hides SearchPanel and EditorToolbar in addition to ChatSidebar — unauthenticated visitors get a clean read-only view of the sheet content only"
  - "SheetLibrary uses subscribeToUserSheets (real-time) not getUserSheets (one-time) — provides live updates when sheets are created/deleted while library is open"

# Metrics
duration: 12min
completed: 2026-03-04
---

# Phase 4 Plan 3: Share UI, isPublic Toggle, and Sheet Library Summary

**isPublic toggle wired end-to-end through EditorContainer -> EditorToolbar -> ShareButton via setSheetPublic; SheetLibrary at /library with real-time list and client-side search; isReadOnly state hides editor chrome for non-owners**

## Performance

- **Duration:** ~12 min
- **Started:** 2026-03-04
- **Completed:** 2026-03-04
- **Tasks:** 2
- **Files modified:** 7 (EditorContainer, EditorToolbar, ShareButton, SheetToolbar, SheetView, UnifiedHeader, App.jsx)
- **Files created:** 1 (SheetLibrary.jsx)

## Accomplishments

- ShareButton upgraded from simple URL-copy to full isPublic toggle: calls onTogglePublic, copies link when going public, shows "Sheet is now private" when going private, shows "Save the sheet first before sharing" when sheetId is null
- isPublic local state added to EditorContainer alongside googleDocId/isSyncing; initialized from rawDoc.isPublic on sheet load, reset to false on new sheet
- handleTogglePublic callback: calls setSheetPublic(currentSheetId, newValue) then updates local isPublic state; no-op if currentSheetId is null
- isOwner/isReadOnly derived state: isOwner = authenticated user whose uid matches a sheet in userSheets list; isReadOnly = !isOwner
- isReadOnly hides ChatSidebar, SearchPanel, EditorToolbar, and mobile chat; shows read-only banner with login link
- SheetLibrary.jsx created: real-time subscribeToUserSheets, client-side search with useMemo filter, sheet cards with title/date/Public badge, Open + Delete actions
- /library route added to App.jsx with lazy import (2.11 kB code-split chunk)
- My Library link added to UnifiedHeader for authenticated users only (Link to /library, useAuth hook added internally)

## Prop Chain Diagram

```
EditorContainer
  isPublic (useState)
  handleTogglePublic (useCallback)
  isReadOnly (derived: !isOwner)
    |
    +-> EditorToolbar (sheetId, isPublic, onTogglePublic)
          |
          +-> ShareButton (sheetId, isPublic, onTogglePublic)
    |
    +-> SheetView (sheetId, isPublic, onTogglePublic, isReadOnly)  [legacy prop chain]
          |
          +-> SheetToolbar (sheetId, isPublic, onTogglePublic)
                |
                +-> ShareButton (sheetId, isPublic, onTogglePublic)
```

Note: EditorContainer in the current architecture uses EditorToolbar (not SheetToolbar via SheetView). Both prop chains are wired correctly for forward-compatibility.

## isReadOnly Logic Verification

```javascript
const isOwner = !!(currentUser && userSheets.some(s => s.id === currentSheetId));
const isReadOnly = !isOwner;
```

- Unauthenticated visitor: `currentUser` is null → `isOwner = false` → `isReadOnly = true` → read-only banner shown, editor chrome hidden
- Authenticated user viewing their own sheet: `currentUser` is set, `userSheets` contains the sheet → `isOwner = true` → `isReadOnly = false` → full editor shown
- Authenticated user viewing someone else's public sheet: `currentUser` is set but `userSheets` does not contain the foreign sheet → `isOwner = false` → `isReadOnly = true` → read-only banner shown

## Task Commits

1. **Task 1: isPublic state, handleTogglePublic, isReadOnly, upgraded ShareButton** - `06c21ff` (feat)
2. **Task 2: SheetLibrary, /library route, My Library link** - `3179831` (feat)

## Files Created/Modified

- `src/components/sheet/ShareButton.jsx` — Full replacement: new props (sheetId, isPublic, onTogglePublic); toggle public/private logic; URL copy on going public; toast messages; visual state change (Share vs Public label, share-btn--public CSS class)
- `src/components/editor/EditorToolbar.jsx` — Added ShareButton import; added sheetId/isPublic/onTogglePublic props; added ShareButton in action-group div after history group
- `src/components/sheet/SheetToolbar.jsx` — Added sheetId, isPublic, onTogglePublic to props; passed through to ShareButton
- `src/components/SheetView.jsx` — Added sheetId, isPublic, onTogglePublic, isReadOnly props; chatStarted condition changed to `chatStarted && !isReadOnly`; props passed to SheetToolbar; PropTypes updated
- `src/components/EditorContainer.jsx` — Added setSheetPublic import; isPublic useState; setIsPublic in sheet load; handleTogglePublic useCallback; isOwner/isReadOnly derived state; sidebar wrapped in {!isReadOnly}; read-only banner in main content; SearchPanel/EditorToolbar wrapped in {!isReadOnly}; EditorToolbar receives share props; mobile chat wrapped in {!isReadOnly}
- `src/components/UnifiedHeader.jsx` — Added Link import from react-router-dom; added useAuth hook; My Library link rendered for currentUser
- `src/App.jsx` — Added SheetLibrary lazy import; added /library Route
- `src/components/library/SheetLibrary.jsx` — New file: subscribeToUserSheets real-time; useMemo filter; sheet cards with Open/Delete; Public badge; login prompt for unauthenticated

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] useSheetPersistence.js does not exist**

- **Found during:** Task 1
- **Issue:** Plan instructs adding isPublic state to `src/hooks/useSheetPersistence.js`. This file does not exist. The codebase was refactored in Phase 3 to use useSheetStore (Zustand) + local state in EditorContainer. The plan's interface section describes the old architecture.
- **Fix:** Added isPublic as local useState in EditorContainer alongside existing googleDocId/isSyncing state. handleTogglePublic added as useCallback. Both match the exact same pattern as existing state in the file.
- **Files modified:** src/components/EditorContainer.jsx
- **Commit:** 06c21ff

**2. [Rule 3 - Blocking] ShareButton wired through EditorToolbar, not SheetToolbar via SheetView**

- **Found during:** Task 1
- **Issue:** Plan says EditorContainer -> SheetView -> SheetToolbar -> ShareButton. But EditorContainer uses EditorToolbar + SheetCanvas, not SheetView. SheetView is a legacy all-in-one component not mounted in EditorContainer.
- **Fix:** Added ShareButton to EditorToolbar (the actual toolbar in use). Also maintained the SheetView prop chain for forward-compatibility (SheetView + SheetToolbar + ShareButton all updated with new props).
- **Files modified:** src/components/editor/EditorToolbar.jsx
- **Commit:** 06c21ff

## Build Result

`npm run build` exited 0 (3.24s). Same pre-existing warnings as previous plans:
- CSS minify warning (search-result-card selector) — pre-existing, not related
- Chunk size warning for index.js — pre-existing, not related
- SheetLibrary code-splits to its own 2.11 kB chunk (correct)

## Self-Check: PASSED

---
*Phase: 04-pdf-export-sharing*
*Completed: 2026-03-04*
