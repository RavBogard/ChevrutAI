---
phase: 06-ai-source-suggestions
plan: "02"
subsystem: ui
tags: [react, hooks, css, sidebar, gemini, sefaria, source-suggestions]
dependency_graph:
  requires: ["06-01 POST /api/suggest endpoint", "onAddSource prop from ChatSidebar consumer"]
  provides: ["useSuggestions hook", "SuggestPanel component", "Find Sources tab in ChatSidebar"]
  affects: ["src/components/ChatSidebar.jsx (tab bar + panel rendering)", "src/App.css (new CSS classes)"]
tech_stack:
  added: []
  patterns:
    - "useRef(new Map()) in-hook cache — avoids redundant fetch for same topic (case-insensitive)"
    - "Prop-based addSource (not store import) — SuggestPanel decoupled from Phase 1 Zustand migration"
    - "Reuse .add-source-btn / .add-source-btn.added — consistent Add button appearance across chat and suggest tabs"
    - "Three-branch ternary in ChatSidebar — minimal invasive change to existing tab rendering"
key_files:
  created:
    - src/hooks/useSuggestions.js
    - src/components/sheet/SuggestPanel.jsx
  modified:
    - src/components/ChatSidebar.jsx
    - src/App.css
decisions:
  - "Prop-based addSource (not store import): SuggestPanel receives addSource as prop rather than calling useSheetStore directly — keeps the component decoupled from Phase 1's Zustand migration and testable in isolation"
  - "useRef Map cache with lowercase key: cache key is topic.trim().toLowerCase() so 'Hospitality' and 'hospitality' share the same cached result; useRef (not useState) avoids re-renders on cache write"
  - "CSS class names distinct from chat tab: .suggestion-card, .suggestion-info, .suggestion-ref are new classes that do not conflict with .source-suggestion-card, .source-info, .source-summary used in the chat tab"
  - "Tab order: Chat | Find Sources | My Sheets — Find Sources placed second so it is adjacent to Chat, where users begin composing a sheet"
metrics:
  duration: "8 minutes"
  completed: "2026-03-04"
  tasks_completed: 2
  files_created: 2
  files_modified: 2
---

# Phase 06 Plan 02: Find Sources UI Panel Summary

**One-liner:** React hook with in-memory Map cache + SuggestPanel component + Find Sources tab wired into ChatSidebar, delivering the full user-facing AI source suggestion experience.

## What Was Built

### src/hooks/useSuggestions.js

Custom React hook that manages the full lifecycle of a topic → suggestions fetch:

- `suggest(topic)`: guards empty string, normalizes key to `topic.trim().toLowerCase()`, checks `useRef(new Map())` cache before fetching, POSTs to `/api/suggest`, stores result in cache, handles non-ok responses by throwing parsed error message
- `addToSheet(suggestion)`: calls `addSource({ ref, he, en })` — passes both `he` and `en` so `useSheetPersistence.addSource` skips re-fetching from Sefaria
- Returns: `{ suggest, isLoading, results, error, addToSheet }`

### src/components/sheet/SuggestPanel.jsx

Two-component file:

**SuggestPanel** (default export):
- Textarea with placeholder "Describe a topic (e.g., 'repentance and second chances')"
- "Find Sources" submit button — disabled when `isLoading` or topic empty; shows "Searching..." while loading
- Error state: red alert box with error message
- Empty state (no results, no error, not loading): placeholder guidance text
- Renders `<SuggestionCard>` per result

**SuggestionCard** (internal):
- Validated cards: blue left border, enabled Add button that transitions to "Added" (green, disabled) on click; `addedRefs` Set tracked in SuggestPanel state
- Unvalidated cards: `.suggestion-card--unvalidated` class (amber left border, 0.78 opacity), "Unverified" amber badge with `title` attribute containing the Sefaria error reason, disabled Add button with tooltip
- Displays: `ref`, `heRef` (RTL), `he` preview (truncated to 120 chars, RTL), `en` preview (truncated to 100 chars)
- Reuses `.add-source-btn` and `.add-source-btn.added` from existing App.css for consistent styling

### src/components/ChatSidebar.jsx (modifications)

Three targeted changes:
1. Added `import SuggestPanel from './sheet/SuggestPanel';` at top
2. Added "Find Sources" tab button between Chat and My Sheets in `.sidebar-tabs`
3. Changed two-branch ternary to three-branch: `activeTab === 'chat' ? <chat> : activeTab === 'suggest' ? <SuggestPanel addSource={onAddSource} /> : <history>`

All existing Chat and My Sheets branch JSX is preserved verbatim.

### src/App.css (additions)

Appended after existing rules (line 3723+):

| Class | Purpose |
|---|---|
| `.suggest-panel` | flex column container, scrollable |
| `.suggest-form` | flex column form wrapper |
| `.suggest-textarea` | input bg, border, focus ring using `--primary-color` |
| `.suggest-submit-btn` | primary blue button, disabled opacity |
| `.suggest-error` | red alert box with dark-theme override |
| `.suggest-empty` | muted placeholder text |
| `.suggest-results` | flex column card list with gap |
| `.suggestion-card` | blue left border (`--primary-color`), hover lift |
| `.suggestion-card--unvalidated` | amber left border (`--accent-color`), reduced opacity |
| `.suggestion-info` | flex column card body |
| `.suggestion-ref` | primary blue ref label |
| `.validation-warning` | amber Unverified badge |
| `.suggestion-he-ref` | RTL Hebrew ref label |
| `.suggestion-he-preview` | RTL Hebrew snippet |
| `.suggestion-en-preview` | English snippet, 0.85 opacity |
| `[data-theme='dark'] .suggestion-card` | dark background override |

## Requirements Satisfied

- **AI-03**: User can describe a topic and see AI-generated source suggestions with validated Sefaria refs — the full UI is now delivered
- **AI-04**: Validated sources have an enabled "Add" button; clicking it calls `onAddSource` and transitions to "Added" (green, disabled)

## Deviations from Plan

None — plan executed exactly as written.

## Self-Check

- [x] `src/hooks/useSuggestions.js` exists
- [x] `src/components/sheet/SuggestPanel.jsx` exists
- [x] `src/components/ChatSidebar.jsx` modified (import + tab + three-branch conditional)
- [x] `src/App.css` modified (CSS block appended)
- [x] All 24 overall verification checks passed
- [x] Commit `bb15b08` exists (Task 1: hook + component)
- [x] Commit `3774468` exists (Task 2: CSS + ChatSidebar wiring)
