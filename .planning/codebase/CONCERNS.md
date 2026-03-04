# Codebase Concerns

**Analysis Date:** 2026-03-04

## Tech Debt

### 1. Large Monolithic Hook - useSheetPersistence

**Issue:** The hook at `src/hooks/useSheetPersistence.js` (744 lines) attempts to manage too many concerns in a single component: state management, persistence, undo/redo, Google Docs sync, chat, disambiguation, and loading states.

**Files:** `src/hooks/useSheetPersistence.js`

**Impact:**
- Difficult to test individual features
- Hard to reason about effect dependencies
- Tight coupling between features makes changes risky
- High cognitive load for maintenance

**Fix approach:**
- Extract Google Docs sync logic into a separate hook (`useGoogleDocSync.js`)
- Extract disambiguation modal logic into a separate hook (`useDisambiguation.js`)
- Reduce useSheetPersistence to just autosave + sheet loading/creation
- This will improve testability and reduce side effect complexity

### 2. Duplicate Sheet Loading/Creation Logic

**Issue:** Sheet initialization logic is duplicated across multiple places:
- `src/hooks/useSheetPersistence.js` (lines 146-247)
- `src/hooks/useFirestore.js` (lines 126-164)

**Files:** `src/hooks/useSheetPersistence.js`, `src/hooks/useFirestore.js`

**Impact:** Changes to sheet initialization need to be made in multiple places, increasing bug risk

**Fix approach:** Extract sheet loading logic into a shared utility function at `src/services/sheetLoader.js` with functions:
- `loadSheetFromDB(sheetId)`
- `loadSheetFromLocalStorage()`
- `createNewSheet()`

### 3. Incomplete/Outdated useFirestore Hook

**Issue:** `src/hooks/useFirestore.js` (185 lines) appears to be a deprecated implementation of sheet persistence. The app uses `useSheetPersistence` instead, but both hooks exist and have nearly identical functionality.

**Files:** `src/hooks/useFirestore.js`

**Impact:** Code duplication, confusion about which hook to use, dead code that could harbor bugs

**Fix approach:** Verify that `useFirestore.js` is not used anywhere in the codebase. If unused, remove it. If still in use, merge functionality into `useSheetPersistence.js` and consolidate.

## Security Considerations

### 1. Environment Variables Exposure in Browser Code

**Issue:** Google Firebase credentials are exposed in browser code via `import.meta.env`. While these are meant to be public, Firebase rules should be tightly controlled.

**Files:** `src/services/firebase.js` (lines 25-32), `src/services/google.js` (line 4)

**Current mitigation:**
- Firebase security rules should restrict read/write access
- Firebase is configured for public client use (by design)

**Recommendations:**
- Ensure Firebase Firestore rules enforce strict security (verify in Firebase console)
- Limit Firestore permissions to authenticated users only
- Verify Google Drive scope usage is minimal (currently requesting full drive scope in `src/services/google.js` line 7)

### 2. Rate Limiting is Fragile

**Issue:** Rate limiting in `api/chat.js` (lines 94-114) is implemented in-memory and resets on cold start. This provides no protection in serverless/multi-instance environments.

**Files:** `api/chat.js`

**Current mitigation:** Basic in-memory rate limit (20 requests/minute per IP)

**Recommendations:**
- Implement persistent rate limiting using Redis or database
- Log API abuse attempts
- Add IP-based blocking for repeated violations
- Consider reducing rate limit for anonymous users

### 3. XSS Risk in Google Docs HTML Generation

**Issue:** While `sanitizeHtml()` in `src/services/google.js` (lines 82-88) removes script and iframe tags, it may not catch all XSS vectors.

**Files:** `src/services/google.js` (lines 82-88, 120-161)

**Risk:** User-provided custom source content could include malicious HTML that survives sanitization

**Recommendations:**
- Use a dedicated HTML sanitization library (e.g., DOMPurify)
- Test sanitization against OWASP XSS cheat sheet
- Consider escaping text content instead of allowing HTML at all

### 4. XSS Risk in DOCX Export

**Issue:** `src/services/docxExport.js` uses `innerHTML` to strip HTML (lines 7-9), which creates a temporary DOM element that could be exploited if content is malicious.

**Files:** `src/services/docxExport.js` (lines 4-17)

**Risk:** Potential DOM-clobbering or other HTML injection attacks

**Recommendations:**
- Replace `innerHTML` usage with a proper HTML parser/sanitizer
- Use DOMPurify or similar library
- Validate source data before processing

## Performance Bottlenecks

### 1. Full History Resend on Every Message

**Issue:** In `src/services/ai.js` (line 48), message history is kept to last 10 messages but is sent to API on every request.

**Files:** `src/services/ai.js`

**Current behavior:**
- Slice to last 10 messages (line 48)
- Send full history + context + current message to `/api/chat` endpoint
- No batching or caching of context

**Impact:**
- Unnecessary bandwidth for large message histories
- Context formatting (lines 7-35 in `api/chat.js`) runs every request
- AI model processes repetitive context

**Improvement path:**
- Consider keeping only last 3-5 messages for context window
- Cache formatted context if user hasn't changed sheets
- Use shorter message summaries instead of full text for older messages

### 2. Sefaria API Search is Inefficient

**Issue:** In `src/services/sefaria.js`, the reference resolution (lines 24-162) uses sequential API calls with multiple retries and fuzzy matching that can be slow.

**Files:** `src/services/sefaria.js` (lines 24-162)

**Current behavior:**
- `resolveSefariaRef()` makes Levenshtein distance calculations for every candidate (O(n*m) per candidate)
- Falls back to searching just the base term recursively (line 148)
- Can trigger multiple fetch attempts with 500ms backoff between retries

**Impact:** User-facing latency when adding sources with fuzzy refs

**Improvement path:**
- Implement client-side caching of resolved refs (e.g., localStorage)
- Pre-compute and cache common reference variations
- Consider debouncing source additions to batch Sefaria lookups
- Reduce retry count or use exponential backoff

## Fragile Areas

### 1. Google Docs Authentication Flow

**Files:** `src/services/google.js`

**Why fragile:**
- OAuth initialization is split across multiple script loads (lines 16-66)
- Global state (`tokenClient`, `gapiInited`, `gisInited`) is not protected
- Re-initialization checks are heuristic-based (line 57)
- Token callback defined inline as empty string initially (line 45)
- Multiple sequential Promise resolutions without timeout protection

**Safe modification:**
- Test all initialization paths (first call, subsequent calls, concurrent calls)
- Add timeout handling for slow or blocked script loads
- Add explicit error states for Google API failures
- Log initialization steps for debugging

**Test coverage:** Minimal - no tests for Google Docs integration

### 2. Undo/Redo History Management

**Files:** `src/hooks/useSheetPersistence.js` (lines 37-39, 84-122)

**Why fragile:**
- History limited to 50 items (line 95) with no warning when limit reached
- History index can become desynchronized if state updates race
- `updateSources()` callback depends on `historyIndex` closure (line 102), can cause stale history
- Redo functionality clears when any source update happens (line 92-97)

**Safe modification:**
- Test concurrent undo/redo operations
- Verify history limit behavior doesn't lose user work
- Test that history correctly reflects all source modifications
- Ensure historyIndex never goes out of bounds

**Test coverage:** Basic tests exist at `src/test/useUndoRedo.test.js` (84 lines) but test is for simple hook, not the full sheet context

### 3. Async Persistence Race Conditions

**Files:** `src/hooks/useSheetPersistence.js` (lines 249-358)

**Why fragile:**
- Multiple async saves can be pending simultaneously
- `mountedRef` checks prevent some race conditions but not all
- If user navigates away while saving, save may fail silently
- Autosave timeout is cleared/reset constantly with dependency array (line 358)

**Safe modification:**
- Test: save → change title → save again, verify both saves succeed
- Test: unmount component while autosave in flight
- Test: offline/network errors during autosave
- Add abort signal to in-flight requests

**Test coverage:** No tests for autosave behavior

## Missing Critical Features

### 1. Search/Filter for User Sheets

**Issue:** Users with many sheets have no way to find specific sheets in the sidebar.

**Files:** `src/components/ChatSidebar.jsx`, `src/hooks/useSheetPersistence.js`

**Impact:** Poor user experience with growing number of saved sheets

### 2. Export/Import Sheets

**Issue:** Users cannot backup or transfer sheets between accounts. No import mechanism exists.

**Impact:** Data portability, disaster recovery difficult

## Test Coverage Gaps

### 1. Sefaria API Integration Untested

**What's not tested:**
- `resolveSefariaRef()` fuzzy matching logic (critical for user experience)
- Text normalization for nested arrays
- Error handling for API timeouts
- Retry logic with 500ms backoff

**Files:** `src/services/sefaria.js`

**Risk:** Reference resolution bugs discovered only by users. Changes to matching heuristic could break common use cases.

**Priority:** High - This is user-facing and error-prone

### 2. Firebase Firestore Sync Untested

**What's not tested:**
- Autosave triggers on title/sources/messages changes
- Merge logic when sheet is updated in multiple tabs
- Subscription cleanup on unmount
- Error recovery after network failures

**Files:** `src/hooks/useSheetPersistence.js`

**Risk:** Data loss on network errors, orphaned subscriptions, stale data in UI

**Priority:** High - Core functionality

### 3. Google Docs Export/Sync Untested

**What's not tested:**
- HTML generation correctness
- Multipart request body formatting
- OAuth token refresh
- Deleted document handling

**Files:** `src/services/google.js`

**Risk:** Silent failures, corrupted exports, orphaned Google Docs

**Priority:** Medium - Less critical than chat/persistence

### 4. Message Streaming and JSON Parsing

**What's not tested:**
- Chunk reassembly with split JSON boundaries
- Fallback JSON parsing (lines 131-156 in `src/services/ai.js`)
- JSON detection heuristic (line 89)

**Files:** `src/services/ai.js`

**Risk:** Malformed suggested sources, incomplete streaming updates

**Priority:** Medium

### 5. Component-Level UI Tests

**What's not tested:**
- Chat message rendering and interaction
- Source addition flow with disambiguation modal
- Undo/redo button states
- Loading states and transitions

**Files:** `src/components/ChatSidebar.jsx`, `src/components/EditorContainer.jsx`, `src/components/SheetView.jsx`

**Risk:** UI bugs discovered in production

**Priority:** Medium

## Build Configuration Issue

### Issue: JSX in i18n Index File

**Problem:** Build fails with syntax error at `src/i18n/index.js:46:8` - JSX expression expected. This suggests a React/JSX component is being written in what should be a configuration file.

**Files:** `src/i18n/index.js` (line 46)

**Impact:** Build pipeline broken when attempting production deployment

**Fix approach:**
1. Verify that i18n/index.js should not contain JSX at all (it's a configuration module)
2. If JSX is needed, move it to a proper component file
3. If not needed, remove JSX syntax and use plain JavaScript for i18n setup

## Scaling Limits

### 1. In-Memory Rate Limiting

**Current capacity:** 20 requests/minute per IP (soft limit)

**Limit:** Serverless environment cold starts reset the rate limit map, providing no real protection across instances

**Scaling path:**
- Move to Redis-backed rate limiting for horizontal scalability
- Consider per-user rate limits instead of per-IP
- Implement gradual backoff instead of hard rejection

### 2. Firestore Query Performance

**Current approach:** Fetches all user sheets, filters in memory (line 133-138 in `src/hooks/useSheetPersistence.js`)

**Limit:** O(n) memory and time for every user with many sheets

**Scaling path:**
- Add Firestore composite indexes for filtered queries
- Implement pagination for sheet list
- Consider archive/soft-delete for old sheets

### 3. Message History Context Window

**Current:** Keeps 10 messages in history (line 48 in `src/services/ai.js`)

**Limit:** Gemini has token limit; large messages or long conversations could exceed context

**Scaling path:**
- Implement sliding window compression (summarize older messages)
- Add user-selectable context size
- Consider separate chat sessions for different topics

---

*Concerns audit: 2026-03-04*
