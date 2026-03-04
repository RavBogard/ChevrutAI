---
phase: 03-core-editor
plan: 01
subsystem: ui
tags: [zustand, dnd-kit, react, uuid, source-sheet]

# Dependency graph
requires:
  - phase: 01-data-layer-foundation
    provides: useSheetStore Zustand store with addSource, removeSource, reorderSources, undo/redo
provides:
  - useSheetStore.addSource assigns stable crypto.randomUUID() id to every source block
  - DividerBlock.jsx — visual hr divider with drag handle and remove button
  - SortableItem.jsx — DnD wrapper dispatching to all four block types by source.type
affects:
  - 03-core-editor (03-02, 03-03 depend on stable source ids and SortableItem)
  - All DnD reorder operations (stable id prevents broken drag when same ref added twice)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "crypto.randomUUID() for stable DnD identity — assigned in store, not at call site"
    - "SortableItem getBlockComponent switch — central type dispatch for all block types"
    - "Backward-compat mapping: type='custom' -> CustomSourceBlock alongside new type='commentary'"

key-files:
  created:
    - src/components/sheet/DividerBlock.jsx
    - src/components/sheet/SortableItem.jsx
  modified:
    - src/stores/useSheetStore.js
    - src/test/sheetStore.test.js
    - src/App.css

key-decisions:
  - "useSheetStore.addSource now assigns id via crypto.randomUUID() before pushing — store owns id assignment, not caller"
  - "addSource short-circuits for divider/commentary/header/custom types (no Sefaria fetch needed)"
  - "SortableItem uses id prop (uuid) not source.ref as useSortable key — prevents DnD breakage on duplicate refs"
  - "type='custom' and type='commentary' both map to CustomSourceBlock in SortableItem (backward compat)"

patterns-established:
  - "Block type dispatch: getBlockComponent(source.type) switch in SortableItem is the canonical dispatch point for all block types"
  - "DividerBlock: no onUpdate prop (dividers have no content); only onRemove + dragHandleProps"

requirements-completed: [EDIT-03, EDIT-04, EDIT-06]

# Metrics
duration: 3min
completed: 2026-03-04
---

# Phase 3 Plan 01: Store UUID Patch and SortableItem Extraction Summary

**Stable source ids via crypto.randomUUID() in useSheetStore.addSource, new DividerBlock.jsx, and extracted SortableItem.jsx dispatching all four block types**

## Performance

- **Duration:** 3 min
- **Started:** 2026-03-04T20:43:22Z
- **Completed:** 2026-03-04T20:46:12Z
- **Tasks:** 3
- **Files modified:** 5

## Accomplishments
- Patched useSheetStore.addSource to assign id via crypto.randomUUID() — adding the same Sefaria ref twice now produces two objects with distinct ids (root cause fix for broken DnD identity)
- Created DividerBlock.jsx as the fourth block type: hr with 6-dot drag handle matching SourceBlock pattern and remove button
- Extracted SortableItem.jsx from SheetView.jsx with type dispatch for all four block types (source, commentary, custom, header, divider)

## Task Commits

Each task was committed atomically:

1. **Task 1: Patch addSource (TDD RED)** - `d1ed585` (test)
2. **Task 1: Patch addSource (TDD GREEN)** - `07e5d69` (feat)
3. **Task 2: Create DividerBlock.jsx** - `64742b0` (feat)
4. **Task 3: Extract SortableItem.jsx** - `8bffbf4` (feat)

_Note: Task 1 used TDD — two commits (test then feat)_

## Files Created/Modified
- `src/stores/useSheetStore.js` - addSource patched to assign crypto.randomUUID() id and handle all four block types without Sefaria fetch
- `src/components/sheet/DividerBlock.jsx` - New divider block component: hr with drag handle and remove button
- `src/components/sheet/SortableItem.jsx` - New DnD wrapper: useSortable({ id }) with getBlockComponent type dispatch
- `src/test/sheetStore.test.js` - Added 7 new tests covering uuid assignment, idempotency, duplicate-ref uniqueness, and all block types
- `src/App.css` - Added .divider-block, .divider-inner, .sheet-divider CSS rules

## Decisions Made
- useSheetStore.addSource now owns id assignment via crypto.randomUUID() — not the caller. This ensures every path to the store (direct store call, EditorContainer, future AI-driven additions) always gets a stable id.
- addSource short-circuits for divider/commentary/header/custom types directly pushing to the sources array without any Sefaria fetch logic. This keeps async fetch responsibility in EditorContainer per the existing Phase 1 architecture decision.
- SortableItem uses the `id` prop (the stable uuid) as the useSortable id, NOT source.ref. This fixes the silent DnD breakage when the same Sefaria passage is added twice.
- type='custom' (existing Firestore data) and type='commentary' (new blocks) both map to CustomSourceBlock in SortableItem. This preserves backward compatibility with any sheets already saved to Firestore.

## Deviations from Plan

None - plan executed exactly as written.

The plan noted that crypto.randomUUID() is available in all modern browsers and Node 14.17+. Confirmed - no polyfill needed.

The existing test `expect(sources[0]).toEqual(source)` was updated to field-level assertions since the store now adds an `id` field. This is expected TDD behavior.

## Issues Encountered

The existing sheetStore test `'appends a source object to the sources array'` used `toEqual(source)` — which would fail after the id assignment change (stored object now has an extra `id` field not in the original). Updated to field-level assertions (`stored.ref`, `stored.text`) as part of the TDD RED phase. All 33 tests pass.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- All Phase 3 plans (03-02, 03-03, 03-04) can proceed — they depend on stable source ids and SortableItem
- SheetCanvas (Plan 03-03) can import SortableItem directly
- DividerBlock is ready for SheetToolbar integration (03-02 or 03-03)
- npm run build completes without errors

---
*Phase: 03-core-editor*
*Completed: 2026-03-04*
