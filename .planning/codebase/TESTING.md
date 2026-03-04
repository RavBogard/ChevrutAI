# Testing Patterns

**Analysis Date:** 2026-03-04

## Test Framework

**Runner:**
- Vitest v4.0.17
- Config: `vitest.config.js`
- JSdom environment for DOM testing
- Global test utilities enabled (`globals: true`)

**Assertion Library:**
- Vitest built-in expect API (compatible with Jest)

**Run Commands:**
```bash
npm test              # Run tests in watch mode
npm run test:run      # Run tests once (CI mode)
```

## Test File Organization

**Location:**
- Co-located in `src/test/` directory with subdirectories by test type
- Structure: `src/test/{type}/{TestName}.test.js` or `.test.jsx`
- Not co-located with source files; centralized test directory

**Naming:**
- Pattern: `{FileName}.test.js` for unit tests, `{FeatureName}.test.jsx` for integration tests
- Examples: `useUndoRedo.test.js`, `SefariaService.test.js`, `SheetFlow.test.jsx`

**Directory Structure:**
```
src/test/
├── integration/
│   ├── SefariaService.test.js
│   └── SheetFlow.test.jsx
├── setup.js
├── useUndoRedo.test.js
└── test_*.js (debug/verification scripts)
```

## Test Structure

**Suite Organization:**

```javascript
// From src/test/useUndoRedo.test.js
import { describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useUndoRedo } from '../hooks/useUndoRedo';

describe('useUndoRedo', () => {
    it('should initialize with the initial state', () => {
        const { result } = renderHook(() => useUndoRedo(['initial']));
        expect(result.current.state).toEqual(['initial']);
        expect(result.current.canUndo).toBe(false);
        expect(result.current.canRedo).toBe(false);
    });

    it('should update state and enable undo', () => {
        const { result } = renderHook(() => useUndoRedo([]));

        act(() => {
            result.current.setState(['source1']);
        });

        expect(result.current.state).toEqual(['source1']);
        expect(result.current.canUndo).toBe(true);
    });
});
```

**Patterns:**
- Setup: Use `renderHook()` for custom hooks, `render()` for components
- Teardown: Vitest handles cleanup automatically; `vi.fn()` stubs cleaned between tests
- Assertions: Expect chains with specific matchers (`.toBe()`, `.toEqual()`, `.toContain()`, `.toHaveBeenCalled()`)

## Mocking

**Framework:** Vitest's `vi` API

**Patterns:**

```javascript
// Module mocking - From src/test/integration/SheetFlow.test.jsx
vi.mock('@dnd-kit/core', async () => {
    const actual = await vi.importActual('@dnd-kit/core');
    return {
        ...actual,
        DndContext: ({ children }) => <div>{children}</div>,
        useSensor: () => null,
        useSensors: () => null,
        PointerSensor: null,
        KeyboardSensor: null,
        closestCenter: null,
    };
});

// Context mocking
vi.mock('../../contexts/AuthContext', () => ({
    useAuth: () => ({
        currentUser: { uid: 'test-user', email: 'test@example.com' }
    })
}));

// Service mocking
vi.mock('../../services/google', () => ({
    exportToGoogleDoc: vi.fn()
}));

// Function mocking - From props
const mockProps = {
    onRemoveSource: vi.fn(),
    onUpdateSource: vi.fn(),
    onReorder: vi.fn(),
};
```

**What to Mock:**
- Third-party libraries that don't work in jsdom (e.g., `@dnd-kit/core`, `html2pdf.js`)
- External services and APIs (e.g., Firebase, Google Services)
- Context providers for isolated testing

**What NOT to Mock:**
- React hooks from react library
- Custom hooks under test (test actual behavior)
- Utility functions (test real logic)
- DOM and DOM queries (test real interaction)

## Fixtures and Factories

**Test Data:**

```javascript
// From src/test/integration/SheetFlow.test.jsx
const mockProps = {
    sources: [
        { ref: 'Genesis 1:1', he: 'בראשית', en: 'In the beginning', type: 'sefaria' }
    ],
    onRemoveSource: vi.fn(),
    onUpdateSource: vi.fn(),
    onReorder: vi.fn(),
    onClearSheet: vi.fn(),
    onUndo: vi.fn(),
    onRedo: vi.fn(),
    canUndo: false,
    canRedo: false,
    language: 'en',
    onSuggestionClick: vi.fn(),
    sheetTitle: 'Test Sheet',
    onTitleChange: vi.fn(),
    onSendMessage: vi.fn(),
    chatStarted: true,
    onAddSource: vi.fn(),
    userSheets: [],
    darkMode: false,
    toggleDarkMode: vi.fn(),
    toggleLanguage: vi.fn()
};
```

**Location:**
- Fixtures defined inline in test files at top level (before test suite)
- Mock data created immediately before use
- Factory pattern not used; simple object literals

## Coverage

**Requirements:** None enforced (no coverage threshold in config)

**View Coverage:**
- Command: Not configured; would require `npm test -- --coverage` addition
- No coverage reporting tools installed

## Test Types

**Unit Tests:**
- Scope: Individual hooks and services
- Approach: Test function logic, state management, return values
- Example: `useUndoRedo.test.js` tests undo/redo state transitions
- Usage: `renderHook()` for hooks, direct function calls for services

**Integration Tests:**
- Scope: Component interactions, feature workflows
- Approach: Render components with mocked dependencies, fire events, assert behavior
- Example: `SheetFlow.test.jsx` tests adding/removing sources in sheet view
- Setup: Mock all external dependencies (DnD, auth, services), provide real component logic

**E2E Tests:**
- Status: Not implemented (no Playwright, Cypress, or similar config)

## Common Patterns

**Async Testing:**

```javascript
// From src/test/integration/SefariaService.test.js
it('resolves typos like "Kosef Mishneh"', async () => {
    const result = await getSefariaText("Kosef Mishneh on Mishneh Torah, Gifts to the Poor 7:3");
    expect(result).not.toBeNull();
    expect(result.ref).toMatch(/Ke(s|ss)ef Mishneh/);
    expect(result.ref).toContain("Gifts to the Poor 7:3");
});
```

**Hook State Updates:**

```javascript
// From src/test/useUndoRedo.test.js
it('should update state and enable undo', () => {
    const { result } = renderHook(() => useUndoRedo([]));

    act(() => {
        result.current.setState(['source1']);
    });

    expect(result.current.state).toEqual(['source1']);
    expect(result.current.canUndo).toBe(true);
});
```

**Event Firing:**

```javascript
// From src/test/integration/SheetFlow.test.jsx
it('calls onAddSource when Add Note is clicked', () => {
    renderWithRouter(<SheetView {...mockProps} />);
    const addNoteBtn = screen.getByText('Add Note');
    fireEvent.click(addNoteBtn);
    expect(mockProps.onAddSource).toHaveBeenCalledWith(expect.objectContaining({ type: 'custom' }));
});
```

**Error Testing:**

```javascript
// From src/test/integration/SefariaService.test.js
try {
    const result = await getSefariaText(checkRef);
    // ... assertions
} finally {
    // Restore global state
    global.fetch = originalFetch;
}
```

**Fetch Mocking:**

```javascript
// From src/test/integration/SefariaService.test.js
const originalFetch = global.fetch;
global.fetch = async () => ({
    ok: true,
    json: async () => mockResponse
});

try {
    const result = await getSefariaText(checkRef);
    // ... test
} finally {
    global.fetch = originalFetch;
}
```

## Setup Files

**Config File:** `src/test/setup.js`

```javascript
import '@testing-library/jest-dom';
```

**Purpose:** Adds Jest DOM matchers (e.g., `.toBeInTheDocument()`) via `@testing-library/jest-dom`

## Test Utilities

**React Testing Library helpers used:**
- `render()`: Render component with providers
- `renderHook()`: Render custom hook in isolation
- `screen`: Query rendered DOM
- `fireEvent`: Simulate user interactions
- `act()`: Wrap state updates for proper batching

**Memory Router:**

```javascript
// From src/test/integration/SheetFlow.test.jsx
const renderWithRouter = (component) => {
    return render(
        <MemoryRouter>
            {component}
        </MemoryRouter>
    );
};
```

## Test-Driven Patterns

**Testing complex async flows:**
- Sefaria integration tests verify API resilience (nested arrays, typo resolution)
- Sheet flow tests verify component prop contracts and event handling
- Hook tests verify state machine behavior (undo/redo transitions)

**Testing data transformation:**
- Tests focus on edge cases (nested arrays, missing fields)
- Assert on both structure and content of transformed data

---

*Testing analysis: 2026-03-04*
