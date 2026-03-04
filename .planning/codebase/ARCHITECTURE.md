# Architecture

**Analysis Date:** 2026-03-04

## Pattern Overview

**Overall:** Client-Server with React Frontend + Serverless API Backend

**Key Characteristics:**
- Component-driven UI built with React 19 + React Router for SPA navigation
- Unified state management in custom hooks (`useSheetPersistence`, `useUndoRedo`)
- Context-based providers for cross-cutting concerns (Auth, Toast notifications)
- Lazy-loaded route components for performance optimization
- Firebase Firestore for persistent storage + Google Auth
- Gemini AI API (via serverless backend) for chat/suggestions
- Sefaria.org API integration for Jewish text fetching
- Google Docs export/sync capability

## Layers

**Presentation Layer (React Components):**
- Purpose: Render UI and handle user interactions
- Location: `src/components/`
- Contains: 23 JSX components organized by feature (auth, sheet, common, home)
- Depends on: Hooks, Contexts, Services
- Used by: React Router (Routes)

**Container/Smart Components:**
- Purpose: Orchestrate state, side effects, and coordinate child components
- Key files:
  - `src/components/EditorContainer.jsx` - Main editor orchestrator, coordinates all sheet operations
  - `src/components/SheetView.jsx` - Displays sheet content with drag-drop reordering
  - `src/components/ChatSidebar.jsx` - Chat interface for AI interaction
  - `src/App.jsx` - Root component with routing and theme management

**Hooks Layer (Custom State Management):**
- Purpose: Encapsulate business logic and state mutations
- Location: `src/hooks/`
- Key hooks:
  - `useSheetPersistence.js` - Master hook managing all sheet state (title, sources, messages, undo/redo, Google Docs sync)
  - `useUndoRedo.js` - Generic undo/redo implementation with history stack
  - `useSheetManager.js` - Alternative sheet management (may be duplicated with useSheetPersistence)
  - `useChat.js` - Chat message handling
  - `useFirestore.js` - Firestore database operations
  - `useResizableSidebar.js` - UI sidebar resize and mobile state
- Depends on: Services, Contexts, React hooks
- Used by: Container components, Contexts

**Context Layer (Global State):**
- Purpose: Provide cross-cutting state to entire component tree
- Location: `src/contexts/`
- Providers:
  - `AuthContext.jsx` - User authentication state (Firebase Auth)
  - `SourceSheetContext.jsx` - Sheet data context (duplicates useSheetManager functionality)
  - `ToastContext` (in `src/components/Toast.jsx`) - Notification messages

**Services Layer (Business Logic & External APIs):**
- Purpose: Handle external integrations and business logic
- Location: `src/services/`
- Services:
  - `firebase.js` - Firebase Auth (Google login), Firestore CRUD (saveSheetToFirestore, getSheetFromFirestore, subscribeToUserSheets)
  - `sefaria.js` - Sefaria API client (getSefariaText, searchSefariaText, resolveSefariaRef) with fuzzy text matching and Levenshtein distance
  - `ai.js` - Gemini AI integration (sendGeminiMessage) with streaming response handling
  - `google.js` - Google Docs API integration (exportToGoogleDoc, syncToGoogleDoc)
  - `docxExport.js` - DOCX file generation
- Depends on: External APIs, Utilities
- Used by: Hooks, Components

**Serverless API Layer:**
- Purpose: Backend API endpoints for AI and sensitive operations
- Location: `api/chat.js` - Vercel serverless function
- Exposes: `POST /api/chat` endpoint receiving messages, history, and context
- Calls: Google Gemini API with system instructions
- Implements: Rate limiting, streaming response handling
- Contains: Detailed system prompt for AI behavior (scholar, context-aware, title generation rules)

**Data & Configuration:**
- Location: `src/data/`
- Files: `prompts.js` - Hardcoded prompts for different languages (EN, HE)
- Location: `src/i18n/`
- Files: `index.js` - Internationalization helper

## Data Flow

**Sheet Creation and Editing:**

1. User navigates to `/sheet/:sheetId` → `App.jsx` routes to `EditorContainer.jsx` (wrapped with key for remounting on ID change)
2. `EditorContainer` calls `useSheetPersistence(sheetId)` which:
   - Checks if `currentUser` exists (from `AuthContext`)
   - Loads existing sheet from Firestore or creates new one
   - Initializes state: title, sources, messages, undo/redo history
3. User edits sheet (adds/removes/reorders sources)
4. `EditorContainer` calls handler functions (addSource, removeSource, etc.)
5. Handlers call `updateSources()` which updates state and history (useUndoRedo)
6. Changes are debounced and persisted to Firestore (~1000ms debounce)
7. `SavingIndicator` shows save status to user

**Source Addition Flow:**

1. User types text reference (e.g., "Genesis 1:1")
2. `EditorContainer` calls `addSource()` → `useSheetPersistence.handleAddSource()`
3. For text sources (not custom notes/headers):
   - Calls `getSefariaText(ref)` to fetch full text from Sefaria API
   - If fetch fails, calls `searchSefariaText(ref)` to find alternatives
   - If search returns results, opens `SourceDisambiguationModal` for user selection
   - User selects option → `resolveDisambiguation()` recursively calls `handleAddSource()` with canonical ref
4. On success: source added to state array, history updated, sheet re-renders

**Chat/AI Interaction Flow:**

1. User sends message in `ChatSidebar`
2. `EditorContainer` calls `sendMessage(text)` → `useSheetPersistence.sendMessage()`
3. Message added to messages array (UI updates immediately)
4. Current sheet is formatted via `formatSheetForAI()` to provide context
5. Calls `sendGeminiMessage(userText, history, context)` from `src/services/ai.js`
6. Frontend makes POST to `/api/chat` (Vercel serverless function)
7. API calls Google Gemini with system instruction + user message + history + sheet context
8. Response streams back as `Content-Encoding: gzip` (chunked)
9. Frontend parses streamed JSON responses:
   - `content`: conversational text for display
   - `suggested_sources`: array of {ref, summary} for sheet integration
   - `suggested_title`: proposed sheet title
10. User clicks "Add Source" buttons or applies suggested title
11. Sources added via regular addition flow (step 3 above)

**Persistence & Sync:**

- **Local Storage**: Used as fallback/initial cache (`chevruta_sources`, `chevruta_title`)
- **Firestore**: Source of truth for signed-in users
- **Debouncing**: Changes saved to Firestore ~1000ms after last edit (debounceRef)
- **Google Docs Sync** (optional): User can link sheet to Google Doc, then sync sheet → Doc or Doc → sheet

**Undo/Redo:**

- Implements custom history stack via `useUndoRedo` hook
- Maintains array: `history = [initialState, state2, state3, ...]`
- Tracks `currentIndex` pointer
- On setState: truncates redo states, adds new state to history, increments index
- Max history size: 50 items
- Keyboard shortcuts: Ctrl+Z (undo), Ctrl+Y (redo)

**State Management:**

- Sources list uses undo/redo-enabled state: `state: sourcesList, setState: setSourcesList`
- Messages list does NOT use undo/redo (linear chat)
- Title has separate state from undo/redo (small, simple)
- Google Docs sync state (googleDocId, googleDocUrl, isSyncing) is independent

## Key Abstractions

**SourceBlock Types:**

- Purpose: Represent different kinds of content items on sheet
- Types:
  - `text`: Bible/Talmud/Sefaria sources with he/en text versions
  - `custom`: User notes/commentary
  - `header`: Section dividers with titles
- Location: Handled by `SheetView.jsx` which selects component based on type:
  - `<SourceBlock>` for text sources
  - `<CustomSourceBlock>` for notes
  - `<SectionHeaderBlock>` for headers
- Data structure: `{ type, ref, he, en, versions, versionTitle, ... }`

**Drag-Drop Reordering:**

- Framework: `@dnd-kit/core` + `@dnd-kit/sortable`
- Implementation: `SheetView.jsx` wraps sources in `<SortableSourceItem>`
- Handlers: `onReorder()` receives new source array from `<DndContext>`
- Updates: `updateSources(newArray)` → history updated

**Modal Flow (Disambiguation):**

- State: `disambiguationState = { isOpen, originalRef, options[], pendingSource }`
- Component: `SourceDisambiguationModal.jsx`
- Triggered when: Sefaria search finds alternatives to invalid ref
- Flow: User selects → `resolveDisambiguation()` → recurses `addSource()`
- Clean exit: `cancelDisambiguation()` closes without adding

**Export Formats:**

- PDF: Uses `html2pdf.js` library, renders sheet HTML → PDF
- DOCX: Dynamic import of `docxExport.js`, creates structured Word document
- Google Docs: `exportToGoogleDoc()` creates new Google Doc + inserts formatted sheet
- Location: Export menu triggered from `SheetToolbar.jsx`

## Entry Points

**Web Entry Point:**

- Location: `src/main.jsx`
- Responsibilities:
  1. Creates React root on `#root` element
  2. Wraps App in error boundary, auth provider, toast provider
  3. Registers Service Worker for PWA (offline support)
  4. Renders strict mode for development warnings

**App Route Entry Point:**

- Location: `src/App.jsx`
- Responsibilities:
  1. Sets up HashRouter for client-side routing
  2. Manages dark mode and language state
  3. Lazy-loads route components (HomeView, Terms, Privacy, EditorContainer)
  4. Implements NewSheetRedirect (generates new ID on demand)
  5. Applies theme attribute to document root

**Editor Entry Point:**

- Location: `src/components/EditorContainer.jsx`
- Responsibilities:
  1. Receives sheetId from URL params
  2. Initializes sheet state via `useSheetPersistence`
  3. Coordinates all child components
  4. Handles sidebar resizing and mobile state
  5. Delegates source operations to persistence hook
  6. Manages disambiguation modal

**API Entry Point:**

- Location: `api/chat.js` (Vercel serverless)
- Responsibilities:
  1. Receives POST requests with user message + history + context
  2. Implements rate limiting per IP
  3. Calls Gemini API with system prompt
  4. Streams response back with chunked encoding
  5. Parses AI JSON responses for content/suggestions/title

## Error Handling

**Strategy:** Multi-layer error recovery with user-friendly fallbacks

**UI Layer (`ErrorBoundary.jsx`):**
- Catches React component rendering errors
- Displays error message + stack trace in red panel
- Offers "Reset App Data & Recover" button (clears localStorage + reloads)
- Fallback: "Try Reloading" for soft recovery

**API Layer (Services):**
- `getSefariaText()`: Returns null on API failure, triggers fallback search
- `sendGeminiMessage()`: Throws Error with API status + response text
- `saveSheetToFirestore()`: Throws Error if no user ID
- Firebase: Promise-based, errors bubble to caller with console.log

**Hook Layer (useSheetPersistence):**
- Debounced save catches errors and continues (doesn't block UI)
- Toast notification shows on Sefaria fetch failure
- Modal fallback for disambiguating bad refs

**User-Facing:**
- Toast notifications with type (error, success, info)
- Graceful degradation when features fail (e.g., Google Docs sync)
- Guest banner for unauthenticated users (sheet only in localStorage, lost on refresh)

**Patterns:**
- Try-catch in async handlers
- Null/undefined checks before array access
- Conditional rendering based on loading/error states
- Error messages in console for debugging

## Cross-Cutting Concerns

**Logging:**
- Console.log/warn/error throughout (no centralized logger)
- Locations: Service calls (firebase.js, sefaria.js, ai.js), component mounts (main.jsx)
- Example: "SW registered", "Fetch failed", "API Error"

**Validation:**
- Input sanitization in Firebase save: `sanitize()` removes undefined values recursively
- Sefaria ref fuzzy matching: Levenshtein distance for typo tolerance
- Disambiguation modal: user must select valid ref before adding

**Authentication:**
- Handled by `AuthContext.jsx` wrapping entire app
- Google OAuth via Firebase
- `currentUser` object available everywhere via `useAuth()` hook
- Unauthenticated users get warning banner, sheet stored in localStorage only
- Logout destroys session

**Internationalization:**
- Languages: English (en) and Hebrew (he)
- Toggle via `toggleLanguage()` in `App.jsx`
- Prompts stored in `src/data/prompts.js` (PROMPTS_EN, PROMPTS_HE)
- CSS supports RTL via `data-theme` attribute changes

**Styling:**
- CSS files in `src/styles/` (AppShell.css, LayoutFixes.css)
- Component-level inline styles in JSX (React standard)
- Dark mode via `data-theme="dark"` attribute on document root
- Theme preference persisted in localStorage

**Performance:**
- Lazy component loading via `lazy()` + Suspense in routes
- Code splitting by route (HomeView, EditorContainer, Terms, Privacy separate chunks)
- Debounced Firestore saves (1000ms) to batch updates
- Sendable messages filtered (last 10 messages) to manage Gemini API context window
- Dynamic import for docxExport (only when needed)
- Skeleton loaders for async content (SkeletonLoader component)

---

*Architecture analysis: 2026-03-04*
