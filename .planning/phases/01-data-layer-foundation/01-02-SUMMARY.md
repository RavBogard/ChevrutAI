---
phase: 01-data-layer-foundation
plan: 02
subsystem: database
tags: [zustand, zundo, state-management, undo-redo, vitest, testing]

# Dependency graph
requires: []
provides:
  - "src/stores/useSheetStore.js — Zustand 5 store with zundo temporal undo/redo, all sheet actions, subscribeWithSelector for autosave"
  - "src/test/sheetStore.test.js — 26 unit tests covering all store actions and undo/redo behavior"
  - "zustand@5.0.11 and zundo@2.3.0 installed in package.json"
affects:
  - 01-data-layer-foundation
  - 03-core-editor-rebuild
  - all phases that consume sheet state

# Tech tracking
tech-stack:
  added:
    - "zustand@5.0.11 — global sheet state store"
    - "zundo@2.3.0 — temporal undo/redo middleware"
  patterns:
    - "subscribeWithSelector(devtools(temporal(fn, opts))) middleware nesting order"
    - "zundo partialize to exclude status flags from undo history"
    - "zundo equality function to prevent duplicate history entries on status-only mutations"
    - "Store actions are pure state transitions — no Firestore logic inside set() calls"
    - "useSheetStore.getState().{action}() for non-reactive access in tests"
    - "useSheetStore.temporal.getState().{undo/redo/clear}() for temporal control"

key-files:
  created:
    - "src/stores/useSheetStore.js"
    - "src/test/sheetStore.test.js"
  modified:
    - "package.json"
    - "package-lock.json"

key-decisions:
  - "zundo equality option required: (a, b) => a.sources === b.sources && a.title === b.title — without this, setIsSaving/setIsLoading/setIsDirty create history entries even though partialized state is unchanged"
  - "partialize limits undo history to {sources, title} only — isSaving/isLoading/isDirty/isPersisted excluded by design"
  - "subscribeWithSelector wraps devtools wraps temporal — this order is required for both devtools inspection and .subscribe(selector, cb) to work"

patterns-established:
  - "Pattern 1: Zustand store with temporal middleware — subscribeWithSelector(devtools(temporal(fn, zundiOpts)))"
  - "Pattern 2: zundo equality guard — required when partialize is used to prevent false history entries"
  - "Pattern 3: Test isolation — resetSheet() + temporal.clear() in beforeEach"
  - "Pattern 4: Status flag setter tests snapshot pastStates.length before/after to verify exclusion"

requirements-completed: [DATA-01, DATA-04]

# Metrics
duration: 10min
completed: 2026-03-04
---

# Phase 1 Plan 02: useSheetStore — Zustand 5 + zundo temporal undo/redo Summary

**Zustand 5 store with zundo temporal middleware providing undo/redo scoped to {sources, title}, equality-guarded to exclude status flag mutations from history, with 26 passing unit tests**

## Performance

- **Duration:** ~10 min
- **Started:** 2026-03-04T20:05:47Z
- **Completed:** 2026-03-04T20:15:00Z
- **Tasks:** 2
- **Files modified:** 4 (useSheetStore.js, sheetStore.test.js, package.json, package-lock.json)

## Accomplishments
- Installed zustand@5.0.11 and zundo@2.3.0 as production dependencies
- Created src/stores/useSheetStore.js — the authoritative sheet state container with all required actions and zundo temporal middleware
- Created src/test/sheetStore.test.js with 26 unit tests covering every action and undo/redo scenario including DATA-04 commentary edit undo
- All 48 tests across 6 test files pass (no regressions in existing suite)

## Task Commits

Each task was committed atomically:

1. **Task 1: Install dependencies and create useSheetStore** - `7097e22` (feat)
2. **Task 2: Write and pass store unit tests** - `f5c87d3` (feat)

_Note: The equality auto-fix was folded into the Task 2 commit since it was discovered and fixed during test writing._

## Files Created/Modified
- `src/stores/useSheetStore.js` — Zustand 5 store with temporal middleware, all sheet actions (addSource, removeSource, updateSource, reorderSources, setTitle, setCurrentSheetId, setIsSaving, setIsLoading, setIsDirty, setIsPersisted, loadSheet with defensive defaults, resetSheet)
- `src/test/sheetStore.test.js` — 26 vitest unit tests: all actions, loadSheet defaults, resetSheet, undo/redo after add/remove/reorder/updateSource, status flag exclusion verification
- `package.json` — zustand@5.0.11 and zundo@2.3.0 added to dependencies
- `package-lock.json` — lockfile updated

## Decisions Made
- zundo `equality` option added: `(a, b) => a.sources === b.sources && a.title === b.title` — without this equality guard, zundo records a history snapshot on every `set()` call regardless of whether the partialized state changed, causing setIsSaving/setIsLoading/setIsDirty to incorrectly pollute undo history
- Middleware nesting order is `subscribeWithSelector(devtools(temporal(...)))` — subscribeWithSelector must be outermost to enable the `.subscribe(selector, cb)` pattern needed for autosave in Plan 04
- Store actions are pure state transitions only; no Firestore logic (per research anti-patterns)

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Added zundo equality option to prevent status flag mutations creating history entries**
- **Found during:** Task 2 (writing and running sheetStore tests)
- **Issue:** zundo records a snapshot on every `set()` call by default, including setIsSaving/setIsLoading/setIsDirty calls, even though the partialized state {sources, title} had not changed. Three tests failed with `expected 0 to be 0` — actually `expected 1 to be 0`.
- **Fix:** Added `equality: (a, b) => a.sources === b.sources && a.title === b.title` to zundo options in useSheetStore.js. This causes zundo to skip recording when the partialized state is unchanged.
- **Files modified:** src/stores/useSheetStore.js
- **Verification:** All 26 store tests pass; full suite (48 tests) passes with no regressions.
- **Committed in:** f5c87d3 (Task 2 commit)

---

**Total deviations:** 1 auto-fixed (Rule 1 - Bug)
**Impact on plan:** Essential correctness fix. Without the equality guard, undo behavior would be broken in production — every autosave status update would create an undo entry, allowing the user to "undo" to a saving-spinner state. No scope creep.

## Issues Encountered
- zundo's default behavior records snapshots on all `set()` calls regardless of whether partialized state changed. The `partialize` option alone is not sufficient — `equality` guard is also required. This is consistent with zundo v2 documentation but is not prominently flagged in the research.

## User Setup Required
None — no external service configuration required.

## Next Phase Readiness
- useSheetStore is the authoritative sheet state container — ready for Plan 03 (Firestore schema versioning) and Plan 04 (EditorContainer migration)
- subscribeWithSelector middleware is in place — autosave subscriber pattern (Plan 04) can be wired directly
- All store actions are available for consumption by EditorContainer and other components
- Existing useSheetPersistence.js and SourceSheetContext.jsx remain in place — deletion is Plan 04 scope after consumers are migrated

## Self-Check: PASSED

- FOUND: src/stores/useSheetStore.js
- FOUND: src/test/sheetStore.test.js
- FOUND: .planning/phases/01-data-layer-foundation/01-02-SUMMARY.md
- FOUND commit 7097e22 (feat: install zustand+zundo and create useSheetStore)
- FOUND commit f5c87d3 (feat: write and pass sheetStore unit tests)
- All 26 store tests pass; all 48 tests in full suite pass

---
*Phase: 01-data-layer-foundation*
*Completed: 2026-03-04*
