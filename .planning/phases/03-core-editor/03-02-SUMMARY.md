---
phase: 03-core-editor
plan: "02"
subsystem: ui
tags: [react, sefaria, debounce, rtl, hebrew, zustand, tdd, vitest]

# Dependency graph
requires:
  - phase: 01-data-layer
    provides: useSheetStore with addSource action, sefaria.js with getSefariaText and searchSefariaText
  - phase: 03-core-editor
    provides: Plan 03-01 patch ensuring addSource assigns id via crypto.randomUUID()
provides:
  - SearchPanel.jsx — 400ms debounced two-mode search UI (getSefariaText primary, searchSefariaText fallback)
  - SearchResultCard.jsx — presentational card with RTL Hebrew, LTR English, Add to Sheet button
  - CSS classes for both components appended to App.css
affects:
  - 03-04-EditorContainer (mounts SearchPanel)
  - 04-print (may extend .search-panel CSS with print:hidden rule)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Debounce pattern: timer stored in useRef(null), clearTimeout on every keystroke, setTimeout 400ms for API call"
    - "Non-reactive store access: useSheetStore.getState().addSource() instead of hook subscription — avoids SearchPanel re-rendering on every store change"
    - "TDD with fake timers: vi.useFakeTimers() + advanceTimersByTime(400) + Promise.resolve() flush for most tests; real timers (vi.useRealTimers()) for the loading indicator test where waitFor polling requires real timer ticks"

key-files:
  created:
    - src/components/editor/SearchResultCard.jsx
    - src/components/editor/SearchPanel.jsx
    - src/test/unit/SearchPanel.test.jsx
  modified:
    - src/App.css

key-decisions:
  - "SearchPanel uses useSheetStore.getState().addSource() not the hook — avoids subscribing SearchPanel to store changes and causing re-renders on every source add"
  - "Loading indicator test switches to vi.useRealTimers() inside the test — waitFor polling uses setTimeout internally, which breaks when fake timers are active; all other tests use fake timers"
  - "SearchResultCard is purely presentational with no state or store imports — future styling changes can be made safely"
  - "autoFocus is set on the search input — EditorContainer (Plan 03-04) should be aware this auto-focuses on mount"
  - "CSS added to App.css (not a component-scoped file) — consistent with existing App.css pattern for all component styles"

patterns-established:
  - "Debounce with useRef: const debounceRef = useRef(null); clearTimeout(debounceRef.current); debounceRef.current = setTimeout(fn, 400)"
  - "Store write without subscription: useSheetStore.getState().addSource(payload) called inside event handler"
  - "TDD test for debounce: fireEvent.change + vi.advanceTimersByTime + await Promise.resolve() x3 to flush microtasks"

requirements-completed: [EDIT-01, EDIT-02]

# Metrics
duration: 5min
completed: "2026-03-04"
---

# Phase 03 Plan 02: SearchPanel and SearchResultCard Summary

**Direct two-action source search: 400ms-debounced getSefariaText + searchSefariaText fallback with RTL Hebrew card, covered by 14 TDD tests (all green)**

## Performance

- **Duration:** 5 min
- **Started:** 2026-03-04T20:43:27Z
- **Completed:** 2026-03-04T20:49:12Z
- **Tasks:** 2 (Task 1: SearchResultCard, Task 2: SearchPanel with TDD)
- **Files modified:** 4

## Accomplishments
- SearchResultCard.jsx: purely presentational card showing ref label, Hebrew snippet (dir="rtl"), English snippet (dir="ltr"), and "Add to Sheet" button with 200-char truncation
- SearchPanel.jsx: 400ms debounced search with getSefariaText primary and searchSefariaText keyword fallback, all search state in local useState (none in Zustand store)
- 14 vitest tests: debounce timing (300ms does not fire, 400ms fires), two-mode fallback, error messages, loading indicator, add-clears-state, addSource shape verification — all green

## Task Commits

Each task was committed atomically:

1. **Task 1: Create SearchResultCard.jsx** - `a8916a3` (feat)
2. **Task 2: TDD RED — failing SearchPanel tests** - `9a6eb0d` (test)
3. **Task 2: TDD GREEN — SearchPanel implementation** - `7828d8a` (feat)

**Plan metadata:** _(this commit — docs)_

_Note: TDD tasks have multiple commits (test RED → feat GREEN)_

## Files Created/Modified
- `src/components/editor/SearchResultCard.jsx` - Presentational card: ref label, Hebrew RTL snippet, English LTR snippet, Add to Sheet button
- `src/components/editor/SearchPanel.jsx` - Search input with 400ms debounce, two-mode search, renders SearchResultCard list
- `src/test/unit/SearchPanel.test.jsx` - 14 TDD tests covering all SearchPanel behaviors
- `src/App.css` - CSS for .search-result-card, .result-ref, .result-he, .result-en, .add-to-sheet-btn, .search-panel, .search-input, .search-loading, .search-error, .search-results

## Decisions Made

- Used `useSheetStore.getState().addSource()` (non-reactive) instead of the Zustand hook — prevents SearchPanel from subscribing to store and re-rendering on every source add. Consistent with 01-04 decision pattern.
- Loading indicator test uses `vi.useRealTimers()` within the single test case. All other 13 tests use fake timers. `waitFor` from Testing Library uses `setTimeout` internally for polling, which is blocked by `vi.useFakeTimers()`.
- `autoFocus` is left on the search input. Plan 03-04 (EditorContainer) should mount SearchPanel in a way that this focus behavior makes sense for the UX flow.
- CSS appended to `src/App.css` (not a component-scoped CSS file). The project uses App.css as the global stylesheet for all components — consistent with all existing component styles.

## Two-Mode Search Flow

```
User types query → 400ms debounce fires
    ↓
getSefariaText(query)
    ↓
if result && !result.error:
    → show [{ ref, he, en, versionTitle, versions }] as SearchResultCard
else:
    → searchSefariaText(query) as fallback
        ↓
        if hits.length > 0:
            → show hits as SearchResultCard list
        else:
            → show "No results found. Try a more specific reference."
on catch:
    → show "Search failed. Check your connection."
```

## CSS Class Names (referenced by plan notes)

| Class | Element | Notes |
|-------|---------|-------|
| `.search-panel` | Wrapper div | Has border-bottom, padding 1rem |
| `.search-input` | `<input type="text">` | Full-width, focus: border-color changes |
| `.search-loading` | Loading indicator | aria-live="polite" |
| `.search-error` | Error message | role="alert" |
| `.search-results` | Results container | aria-label="Search results" |
| `.search-result-card` | Card wrapper | border + border-radius |
| `.result-ref` | Reference label | font-weight 600, primary-color |
| `.result-he` | Hebrew snippet | dir="rtl", font-family: var(--font-hebrew) |
| `.result-en` | English snippet | dir="ltr", text-secondary color |
| `.add-to-sheet-btn` | Add button | primary-color background |

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed TDD test async timer interaction with waitFor**
- **Found during:** Task 2 (SearchPanel TDD)
- **Issue:** `vi.useFakeTimers()` intercepts `setTimeout` used by Testing Library's `waitFor` polling, causing the loading indicator test to time out at 5000ms
- **Fix:** The loading indicator test switches to `vi.useRealTimers()` at the start of that single test case, allowing `waitFor` to poll normally. The other 13 tests retain fake timers for precision debounce control.
- **Files modified:** src/test/unit/SearchPanel.test.jsx
- **Verification:** All 14 tests pass, loading indicator test completes in ~410ms
- **Committed in:** 7828d8a (Task 2 feat commit)

---

**Total deviations:** 1 auto-fixed (Rule 1 - test timing bug)
**Impact on plan:** Necessary for correct test execution. No behavior change to components.

## Issues Encountered
- Vite/Vitest performs static import analysis at transform time — cannot use try/catch around dynamic imports for non-existent files. Resolved by writing the tests to import the real component path (which fails RED because the file doesn't exist, then GREEN after creation).
- Project uses `"type": "module"` in package.json — Node.js verification scripts must use `.cjs` extension or ES module syntax. Used `grep` for inline verification instead.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- SearchPanel and SearchResultCard are ready to be mounted in EditorContainer by Plan 03-04
- Plan 03-04 should be aware that `autoFocus` is active on the search input — consider mounting context
- CSS classes documented above are stable and can be extended by later plans
- Both components have no peer dependencies beyond sefaria.js and useSheetStore (Phase 1 artifacts)

---
*Phase: 03-core-editor*
*Completed: 2026-03-04*
