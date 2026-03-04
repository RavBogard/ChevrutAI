---
phase: 01-data-layer-foundation
plan: "04"
subsystem: database
tags: [zustand, zustand-temporal, firestore, react-hooks, debounce]

requires:
  - phase: 01-02
    provides: useSheetStore with subscribeWithSelector middleware and temporal undo/redo
  - phase: 01-03
    provides: saveSheetToFirestore with schemaVersion:1 and loadSheetWithDefaults with ?? defaults

provides:
  - useAutosave.js — isolated autosave subscriber using subscribeWithSelector + hand-rolled debounce
  - EditorContainer reads all sheet state from useSheetStore, no useSheetPersistence import anywhere
  - Single source of truth: useSheetStore owns title, sources, save/load status flags
  - Codebase freed of 6 replaced files: useSheetPersistence, useFirestore, useSheetManager, useUndoRedo, SourceSheetContext, useUndoRedo.test

affects:
  - phase-02-ai-chat
  - phase-04-print-export
  - any component that reads sheet title/sources (now reads from useSheetStore)

tech-stack:
  added: []
  patterns:
    - useSheetStore.subscribe(selector, cb) for side-effect autosave subscriptions outside React render cycle
    - useShallow from zustand/shallow for multi-value selectors to prevent infinite loops
    - useStoreWithEqualityFn from zustand/traditional for temporal store canUndo/canRedo
    - useSheetStore.getState() for non-reactive action reads (no re-render triggered)
    - Messages/userSheets/Google Docs state remain in local useState (Phase 1 scope boundary)
    - addSource retains Sefaria fetch + disambiguation logic in EditorContainer, delegates final push to store

key-files:
  created:
    - src/hooks/useAutosave.js
  modified:
    - src/components/EditorContainer.jsx
  deleted:
    - src/hooks/useSheetPersistence.js
    - src/hooks/useFirestore.js
    - src/hooks/useSheetManager.js
    - src/hooks/useUndoRedo.js
    - src/contexts/SourceSheetContext.jsx
    - src/test/useUndoRedo.test.js

key-decisions:
  - "Messages stay in local useState inside EditorContainer for Phase 1 — store owns only title and sources per research open question #2"
  - "userSheets (subscribeToUserSheets) stays in local state — not added to store in Phase 1"
  - "addSource keeps Sefaria fetch + disambiguation logic in EditorContainer and delegates store.addSource as the final write — avoids putting async API logic in the store"
  - "useSheetStore.temporal.getState().clear() called on every sheet load to prevent undo history crossing sheet boundaries"
  - "Orphan file deletions include useSheetManager.js (confirmed dead code, no consumers outside itself) and useFirestore.js (predecessor to useSheetPersistence)"

patterns-established:
  - "Autosave pattern: useSheetStore.subscribe() outside React render cycle + hand-rolled 1000ms debounce with setTimeout/clearTimeout refs"
  - "Sheet load pattern: getSheetFromFirestore -> loadSheetWithDefaults -> useSheetStore.getState().loadSheet() + temporal.clear()"
  - "Action pattern: useSheetStore.getState().actionName() for non-reactive calls in event handlers"
  - "Selector pattern: useSheetStore(useShallow(...)) for multiple reactive state fields"

requirements-completed: [DATA-01, DATA-04]

duration: 3min
completed: "2026-03-04"
---

# Phase 1 Plan 4: EditorContainer Migration and Legacy Hook Deletion Summary

**EditorContainer wired to useSheetStore with useAutosave subscriber hook; 6 replaced files deleted; build clean at 43/43 tests**

## Performance

- **Duration:** ~3 min
- **Started:** 2026-03-04T14:11:16Z
- **Completed:** 2026-03-04T14:14:05Z
- **Tasks:** 2
- **Files modified:** 2 created/modified, 6 deleted

## Accomplishments

- Created `src/hooks/useAutosave.js` — subscribes to useSheetStore title+sources via subscribeWithSelector, hand-rolled 1000ms debounce, no lodash, writes schemaVersion:1
- Rewrote `EditorContainer.jsx` to read all sheet state from useSheetStore selectors instead of useSheetPersistence; useAutosave handles all Firestore persistence
- Deleted all 6 replaced files (useSheetPersistence, useFirestore, useSheetManager, useUndoRedo, SourceSheetContext, useUndoRedo.test); zero orphaned imports remain
- Build compiles clean (exit 0); all 43 tests pass (sefaria 6, firebase 5, sheetStore 26, SheetFlow 3, SefariaService 3)

## Task Commits

Each task was committed atomically:

1. **Task 1: Create useAutosave.js with hand-rolled debounce** - `969d950` (feat)
2. **Task 2: Migrate EditorContainer and delete replaced files** - `2f2136f` (feat)

**Plan metadata:** (docs commit — see below)

## Files Created/Modified

- `src/hooks/useAutosave.js` — Standalone autosave hook; subscribes to store, debounces Firestore writes
- `src/components/EditorContainer.jsx` — Sheet orchestrator; reads from useSheetStore, no useSheetPersistence

**Deleted:**
- `src/hooks/useSheetPersistence.js` — Replaced by useSheetStore + useAutosave + EditorContainer load effect
- `src/hooks/useFirestore.js` — Predecessor to useSheetPersistence; dead after migration
- `src/hooks/useSheetManager.js` — Dead code; no consumers found outside itself
- `src/hooks/useUndoRedo.js` — Replaced by zundo temporal middleware in useSheetStore
- `src/contexts/SourceSheetContext.jsx` — Replaced by useSheetStore as single source of truth
- `src/test/useUndoRedo.test.js` — Tests for deleted useUndoRedo hook

## Decisions Made

- Messages stay in local useState inside EditorContainer for Phase 1 — store owns only title and sources per research open question #2. Phase 2 will address message persistence if needed.
- userSheets (subscribeToUserSheets Firestore listener) stays in local state — adding it to the store would require Phase 2 scope (real-time subscriptions).
- addSource keeps Sefaria fetch + disambiguation logic in EditorContainer and delegates store.addSource as the final write. This avoids putting async API logic in the Zustand store (not a Zustand pattern).
- useSheetStore.temporal.getState().clear() called on every sheet load to prevent undo history crossing sheet boundaries.
- useSheetManager.js deleted as confirmed dead code (grep found no consumers outside the file itself).

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None. Build and all 43 tests passed on first attempt.

## Next Phase Readiness

- Data layer cutover complete. Single source of truth (useSheetStore) is the only place sheet state lives.
- Phase 2 (AI Chat) can build on useSheetStore to access title+sources for context injection without any legacy hook dependencies.
- The autosave subscriber pattern established here (useSheetStore.subscribe outside React lifecycle) is available as a template for future side-effect integrations.

---
*Phase: 01-data-layer-foundation*
*Completed: 2026-03-04*

## Self-Check: PASSED

- FOUND: src/hooks/useAutosave.js
- FOUND: src/components/EditorContainer.jsx
- CONFIRMED DELETED: useSheetPersistence.js, useFirestore.js, useSheetManager.js, useUndoRedo.js, SourceSheetContext.jsx, useUndoRedo.test.js
- FOUND: commit 969d950 (Task 1)
- FOUND: commit 2f2136f (Task 2)
- Build: clean (exit 0)
- Tests: 43/43 passing
