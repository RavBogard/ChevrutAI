---
phase: 01-data-layer-foundation
plan: 03
subsystem: database
tags: [firebase, firestore, schemaVersion, defensive-defaults, vitest]

# Dependency graph
requires:
  - phase: 01-data-layer-foundation
    provides: firebase.js with saveSheetToFirestore and getSheetFromFirestore functions

provides:
  - saveSheetToFirestore stamps schemaVersion: 1 on every new Firestore document write
  - loadSheetWithDefaults() exported from firebase.js with ?? defaults for all 8 fields
  - src/test/firebase.test.js with 5 passing unit tests for loadSheetWithDefaults

affects:
  - 01-data-layer-foundation (plans 04, 05)
  - Any future code that reads Firestore documents must use loadSheetWithDefaults for safe field access

# Tech tracking
tech-stack:
  added: []
  patterns:
    - schemaVersion field in Firestore documents (integer, starts at 1 for Phase 1 rebuild documents)
    - loadSheetWithDefaults as the standard read-path guard for Firestore document deserialization
    - Firebase SDK mocking via vi.mock in Vitest (using function constructors for class-like mocks)

key-files:
  created:
    - src/test/firebase.test.js
  modified:
    - src/services/firebase.js

key-decisions:
  - "schemaVersion: 1 is written unconditionally on every saveSheetToFirestore call (including updates) to ensure all documents are eventually versioned"
  - "schemaVersion: 0 is the sentinel for pre-versioning documents — no migration needed, defensive defaults handle backward compat"
  - "loadSheetWithDefaults uses ?? (nullish coalescing) not ?. (optional chaining) — intent is to replace missing/null/undefined, not traverse nested paths"
  - "GoogleAuthProvider vi.mock must use function() constructor not arrow function to support 'new' keyword usage in firebase.js"

patterns-established:
  - "Pattern 1: All Firestore document reads should pass through loadSheetWithDefaults() to ensure field safety"
  - "Pattern 2: Firebase SDK mocks in Vitest use vi.mock with function constructors for class-based APIs"

requirements-completed: [DATA-02]

# Metrics
duration: 12min
completed: 2026-03-04
---

# Phase 1 Plan 03: Firestore Schema Versioning and Defensive Defaults Summary

**schemaVersion: 1 stamped on all Firestore writes; loadSheetWithDefaults() guards all reads with ?? fallbacks so pre-versioning documents never crash**

## Performance

- **Duration:** 12 min
- **Started:** 2026-03-04T20:05:29Z
- **Completed:** 2026-03-04T20:17:00Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments
- saveSheetToFirestore now writes `schemaVersion: 1` to every document, stamping all new writes going forward
- loadSheetWithDefaults() exported from firebase.js providing ?? defaults for all 8 fields (id, title, sources, schemaVersion, isPublic, ownerId, createdAt, updatedAt)
- 5 unit tests in firebase.test.js covering all default-value scenarios and full-document preservation; full suite 22/22 green

## Task Commits

Each task was committed atomically:

1. **Task 1: Add schemaVersion to saveSheetToFirestore and export loadSheetWithDefaults** - `5bc3d8f` (feat)
2. **Task 2: Write loadSheetWithDefaults unit tests in firebase.test.js** - `6f85164` (test)

## Files Created/Modified
- `src/services/firebase.js` - Added `schemaVersion: 1` in saveSheetToFirestore dataToSave; added exported loadSheetWithDefaults() with ?? defaults
- `src/test/firebase.test.js` - Created with 5 unit tests covering legacy document defaults and full document preservation

## Decisions Made
- schemaVersion: 1 written unconditionally on every save (including updates) so all documents are eventually migrated just by normal usage
- schemaVersion: 0 is the sentinel for pre-versioning documents — avoids requiring a Firestore migration script
- loadSheetWithDefaults uses ?? not ?. because the intent is field existence defaulting, not nested path traversal
- Firebase SDK mocks must use `function()` constructors (not arrow functions) when the mocked export is used with `new` keyword in the source

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed GoogleAuthProvider mock to use function constructor**
- **Found during:** Task 2 (firebase.test.js test run)
- **Issue:** `vi.fn(() => ({}))` is an arrow function and cannot be used as a constructor; firebase.js does `new GoogleAuthProvider()` which threw `TypeError: () => ({}) is not a constructor`
- **Fix:** Changed mock to `vi.fn(function () { return {}; })` which is a proper function constructor
- **Files modified:** src/test/firebase.test.js
- **Verification:** All 5 tests pass after fix
- **Committed in:** `6f85164` (Task 2 commit)

---

**Total deviations:** 1 auto-fixed (Rule 1 - bug in mock)
**Impact on plan:** Necessary correction to the mock pattern specified in the plan. No scope creep.

## Issues Encountered
- The plan's `vi.mock('firebase/auth')` template used `GoogleAuthProvider: vi.fn(() => ({}))` which fails because firebase.js uses `new GoogleAuthProvider()`. Fixed by using a regular function constructor. The mock template in the plan needs updating for future tasks that mock this module.
- firebase.js also imports `orderBy` and `deleteDoc` from `firebase/firestore` which the plan's mock template omitted — added both to the mock to prevent import errors.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- DATA-02 complete: existing user sheets are protected from crashes via loadSheetWithDefaults()
- Every new Firestore write is versioned with schemaVersion: 1
- loadSheetWithDefaults() is ready to be consumed by sheetStore.js (plan 04) and any other Firestore read paths
- No blockers for plan 04

## Self-Check: PASSED

- FOUND: src/services/firebase.js (modified with schemaVersion: 1 and loadSheetWithDefaults export)
- FOUND: src/test/firebase.test.js (created with 5 passing tests)
- FOUND: .planning/phases/01-data-layer-foundation/01-03-SUMMARY.md
- FOUND: Task commit 5bc3d8f (feat: add schemaVersion + loadSheetWithDefaults)
- FOUND: Task commit 6f85164 (test: 5 unit tests for loadSheetWithDefaults)
- All 22 tests pass (npm run test:run)

---
*Phase: 01-data-layer-foundation*
*Completed: 2026-03-04*
