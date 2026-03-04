# Coding Conventions

**Analysis Date:** 2026-03-04

## Naming Patterns

**Files:**
- React components: PascalCase with `.jsx` extension (e.g., `SourceBlock.jsx`, `ErrorBoundary.jsx`)
- Hooks: camelCase with `.js` extension prefixed with `use` (e.g., `useChat.js`, `useFirestore.js`)
- Services: camelCase with `.js` extension (e.g., `ai.js`, `firebase.js`, `sefaria.js`)
- Utility/data files: camelCase (e.g., `prompts.js`)

**Functions:**
- React components: PascalCase (e.g., `App`, `SheetView`, `SourceBlock`)
- Custom hooks: camelCase with `use` prefix (e.g., `useChat`, `useFirestore`, `useSheetManager`)
- Helper functions: camelCase (e.g., `formatSheetForAI`, `hasContent`, `handleVersionChange`)
- Event handlers: camelCase with `handle` prefix (e.g., `handleSendMessage`, `handleVersionChange`, `handleReset`)
- Callbacks: camelCase with `on` prefix (e.g., `onRemove`, `onUpdate`, `onRefine`, `onAddSource`)

**Variables:**
- State variables: camelCase (e.g., `messages`, `isLoading`, `currentUser`, `darkMode`)
- Component props: camelCase (e.g., `sheetTitle`, `onAddSource`, `dragHandleProps`)
- Constants in data files: UPPER_SNAKE_CASE when used across modules (e.g., `PROMPTS_EN`, `PROMPTS_HE`)
- Local constants: lowercase or camelCase (e.g., `version`, `viewMode`)

**Types/Interfaces:**
- No TypeScript definitions found; project uses PropTypes for runtime validation
- Object property names: camelCase (e.g., `versionTitle`, `suggestedSources`, `sheetId`)

## Code Style

**Formatting:**
- No Prettier config detected; ESLint is primary linter
- Indentation: 4 spaces (observed in config and source files)
- Line length: No strict limit enforced, code naturally wraps

**Linting:**
- Tool: ESLint (v9.39.1) with flat config format
- Config file: `eslint.config.js`
- Key rules enforced:
  - `no-unused-vars`: Error, with varsIgnorePattern `^[A-Z_]` (ignores component names and constants)
  - React Hooks rules via `eslint-plugin-react-hooks`
  - React Refresh rules via `eslint-plugin-react-refresh`
  - ECMAScript 2020 with JSX support
- ESLint output artifact: `eslint-output.json` (historical debug file)

## Import Organization

**Order:**
1. React and React ecosystem imports (e.g., `import React, { useState, useEffect } from 'react'`)
2. Third-party library imports (e.g., `import { DndContext } from '@dnd-kit/core'`, `import html2pdf from 'html2pdf.js'`)
3. Local relative imports (contexts, services, components, data)
4. CSS/style imports (e.g., `import './App.css'`)

**Path Aliases:**
- No path aliases configured (all imports use relative paths like `../contexts/AuthContext`)
- Relative path pattern: `../` for parent directory traversal

**Examples from codebase:**

```javascript
// src/components/SheetView.jsx - Import ordering pattern
import React, { useState, useMemo } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Link } from 'react-router-dom';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import html2pdf from 'html2pdf.js';
import { exportToGoogleDoc } from '../services/google';
import { PROMPTS_EN, PROMPTS_HE } from '../data/prompts';
import { version } from '../../package.json';

import SourceBlock from './sheet/SourceBlock';
import CustomSourceBlock from './sheet/CustomSourceBlock';
import SectionHeaderBlock from './sheet/SectionHeaderBlock';
```

## Error Handling

**Patterns:**
- Try-catch blocks for async operations: Used consistently in services (`src/services/ai.js`, `src/hooks/useFirestore.js`)
- Error logging: `console.error()` with descriptive messages
- User feedback: Toast notifications via `useToast()` hook for non-critical errors
- React Error Boundary: Class component (`ErrorBoundary.jsx`) for catching render-time errors
- Error fallback UI: Error Boundary shows error message and recovery options (clear data, reload)

**Examples:**

```javascript
// From src/hooks/useChat.js
try {
    const data = await sendGeminiMessage(userText, messages);
    // ... success handling
} catch (error) {
    console.error("Chat error:", error);
    setMessages(prev => [...prev, {
        id: Date.now().toString(),
        role: 'model',
        text: "I'm having trouble connecting to the Beit Midrash right now. Please try again.",
        suggestedSources: []
    }]);
} finally {
    setIsLoading(false);
}

// From src/hooks/useFirestore.js
try {
    // ... operation
    setIsSaving(true);
} catch (error) {
    console.error("Autosave failed:", error);
    showToast("Autosave failed! Please check connection.", "error");
} finally {
    setIsSaving(false);
}
```

## Logging

**Framework:** `console` object (no structured logging library detected)

**Patterns:**
- `console.error()`: Errors in catch blocks, primarily in services and hooks
- `console.log()`: Debug information (54 instances found in codebase)
- Typical usage: Logging async operation results, autosave events, parsing failures

**Examples:**

```javascript
console.error("Chat error:", error);
console.error("Uncaught error:", error, errorInfo);
console.error("Failed to parse sources JSON", e);
console.log("Autosaved sheet:", savedId);
```

## Comments

**When to Comment:**
- JSDoc-style comments for exported functions (seen in `ai.js`)
- Inline comments for complex logic or non-obvious code patterns
- Comments explaining "why" for workarounds or heuristics

**JSDoc/TSDoc:**
- Used selectively for service functions and exported helpers
- Includes parameter types and return types in plain language

**Examples:**

```javascript
/**
 * Formats the source sheet into a structured Markdown-like context for the AI.
 * Distinguishes between Section Headers, Texts, and Notes.
 * @param {Array} sources
 * @returns {string}
 */
const formatSheetForAI = (sources) => {
    // ...
};

/**
 * Sends a message to the Google Gemini API.
 * @param {string} userText - The user's input message.
 * @param {Array} messageHistory - Previous messages for context.
 * @param {Array} sheetSources - The current list of sources on the sheet.
 * @returns {Promise<Object>} - The API response object.
 */
export const sendGeminiMessage = async (userText, messageHistory, sheetSources = [], onChunk = null) => {
```

**Inline comments for complex logic:**

```javascript
// Safe string conversion
let textSnippet = "";
if (typeof s.en === 'string') textSnippet = s.en;
else if (Array.isArray(s.en)) textSnippet = s.en.join(" ");

// Check for JSON-like start (heuristic)
if (fullText.length < 50 && (fullText.trim().startsWith('{') || fullText.trim().startsWith('```json'))) {
    isJsonLike = true;
}
```

## Function Design

**Size:** Functions typically 15-50 lines; larger functions exist for complex operations (e.g., `sendGeminiMessage` is ~130 lines handling streaming, parsing, and error cases)

**Parameters:**
- Functions accept 2-4 parameters typically
- Callbacks as trailing parameters (e.g., `onChunk` in `sendGeminiMessage`)
- Object destructuring for multiple related parameters

**Return Values:**
- Objects with descriptive property names: `{ content, suggested_sources, suggested_title, raw }`
- Arrays for list results
- Promises for async operations
- Boolean flags for state queries (e.g., `canUndo`, `canRedo`)

**Examples:**

```javascript
// Simple return from hook
export const useChat = (initialMessages = []) => {
    // ... setup
    return {
        messages,
        setMessages,
        isLoading,
        handleSendMessage
    };
};

// Complex object return from service
return {
    content: content,
    suggested_title: suggested_title,
    suggested_sources: suggested_sources,
    raw: fullText
};
```

## Module Design

**Exports:**
- Default export: React components (e.g., `export default App`)
- Named exports: Hooks (e.g., `export const useChat`), services (e.g., `export const sendGeminiMessage`)
- Mix of default and named exports used contextually

**Barrel Files:**
- `src/data/prompts.js`: Exports constants `PROMPTS_EN`, `PROMPTS_HE`
- `src/i18n/index.js`: Likely aggregates i18n configuration
- No explicit index.js barrel files in component directories; imports are direct

**Examples:**

```javascript
// From src/hooks/useChat.js - Named export for hook
export const useChat = (initialMessages = []) => {
    // ...
};

// From src/components/App.jsx - Default export for component
export default App;

// From src/data/prompts.js - Named exports for constants
import { PROMPTS_EN, PROMPTS_HE } from '../data/prompts';
```

## ESLint Suppressions

- `eslint-disable-next-line react-hooks/set-state-in-effect` observed in conditional state updates in `useFirestore.js`
- `eslint-disable-next-line react-refresh/only-export-components` in context providers (`AuthContext.jsx`)
- Suppressions used sparingly and documented inline

---

*Convention analysis: 2026-03-04*
