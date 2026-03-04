# External Integrations

**Analysis Date:** 2026-03-04

## APIs & External Services

**AI & Text Generation:**
- Google Gemini API (generative-ai)
  - Purpose: Generate source suggestions, answer user questions about Jewish texts, structure sheet content
  - SDK/Client: `@google/generative-ai@0.24.1`
  - Auth: `VITE_GEMINI_API_KEY` (client-side) or `GEMINI_API_KEY` (server-side)
  - Model: `gemini-3-flash-preview` (configurable via `GEMINI_MODEL_VERSION`)
  - Endpoint: `https://generativelanguage.googleapis.com/` (via SDK)
  - Implementation: `src/services/ai.js` for client calls, `api/chat.js` for server-side streaming

**Jewish Text Database:**
- Sefaria API
  - Purpose: Fetch Hebrew and English text from canonical Jewish sources (Torah, Talmud, Mishnah, Zohar, Hasidic texts, etc.)
  - API Base URLs:
    - Text fetch: `https://www.sefaria.org/api/texts/{ref}?context=0`
    - Name resolution: `https://www.sefaria.org/api/name/{term}?limit=20`
    - Text search: `https://www.sefaria.org/api/search/text/_search` (POST)
  - Auth: None (public API)
  - Client Library: Native fetch API (no SDK)
  - Implementation: `src/services/sefaria.js`
  - Features:
    - Fuzzy reference resolution with Levenshtein distance matching
    - Automatic version fallback for missing English translations
    - Retry logic with 500ms backoff
    - Support for complex nested array text structures

**Google Drive & Docs Export:**
- Google Drive API v3
  - Purpose: Create new Google Docs from source sheets, sync updates to existing docs
  - Discovery Document: `https://docs.googleapis.com/$discovery/rest?version=v1`
  - GAPI Script: `https://apis.google.com/js/api.js`
  - GIS (Google Identity Services) Script: `https://accounts.google.com/gsi/client`
  - OAuth Scope: `https://www.googleapis.com/auth/drive` (full drive access)
  - Auth: `VITE_GOOGLE_CLIENT_ID` (OAuth 2.0 token client)
  - Implementation: `src/services/google.js`
  - Features:
    - HTML-to-Google-Doc conversion with bilingual Hebrew/English support
    - Document creation and update (PATCH multipart requests)
    - Document existence validation
    - Multipart MIME body construction

**Analytics & Monitoring:**
- Google Analytics 4
  - Purpose: Track user engagement, feature usage, session analytics
  - Tracking ID: `G-PYL7BT4HX9`
  - Implementation: Inline script in `index.html`
  - Type: Global Site Tag (gtag.js)

## Data Storage

**Databases:**
- Firebase Firestore (NoSQL)
  - Purpose: Store user source sheets, metadata, ownership, timestamps
  - Connection: Via Firebase SDK (`firebase@12.8.0`)
  - Client Library: `firebase/firestore`
  - Config loaded from environment:
    - `VITE_FIREBASE_API_KEY`
    - `VITE_FIREBASE_AUTH_DOMAIN`
    - `VITE_FIREBASE_PROJECT_ID`
    - `VITE_FIREBASE_STORAGE_BUCKET`
    - `VITE_FIREBASE_MESSAGING_SENDER_ID`
    - `VITE_FIREBASE_APP_ID`
  - Collections:
    - `sheets` - Stores source sheet documents with fields: `id`, `ownerId`, `title`, `sources` (array), `updatedAt`, `createdAt`, `googleDocId` (optional)
  - Implementation: `src/services/firebase.js`
  - Features:
    - Real-time listeners with `onSnapshot()`
    - Server-side timestamps with `serverTimestamp()`
    - Automatic undefined sanitization before save
    - Merge semantics to preserve unmodified fields

**File Storage:**
- Browser LocalStorage (implicit)
  - Purpose: May cache temporary sheet drafts or user preferences (not confirmed in code)
- Google Drive
  - Purpose: User-created Google Docs exports stored in their Drive

**Caching:**
- Browser Service Worker (PWA)
  - Purpose: Cache static assets for offline functionality
  - Config: Vercel cache headers in `vercel.json`
  - Service worker file: `/sw.js` (registration in `src/main.jsx`)

## Authentication & Identity

**Auth Provider:**
- Google OAuth 2.0 (via Firebase)
  - Provider SDK: `firebase/auth`
  - Auth Type: Google Sign-In popup (`signInWithPopup`)
  - Provider: `GoogleAuthProvider` from Firebase
  - Scope: Default Firebase scopes
  - Implementation: `src/services/firebase.js` - `loginWithGoogle()`, `logoutUser()`, `subscribeToAuth()`
  - Login Flow:
    1. User clicks "Sign in with Google"
    2. Firebase opens Google OAuth consent popup
    3. Token exchanged, user object returned
    4. Auth state subscribed via `onAuthStateChanged()`

**Session Management:**
- Firebase Auth state listener in `AuthContext` (`src/contexts/AuthContext.jsx`)
- Auth context provides user object and login/logout functions to app

## Monitoring & Observability

**Error Tracking:**
- None detected (errors logged to browser console)

**Logs:**
- Browser console (`console.log()`, `console.error()`)
- Server-side: Vercel function logs (not analyzed)

## CI/CD & Deployment

**Hosting:**
- Vercel
  - Framework: Vite-built React SPA
  - API Routes: Serverless functions in `/api/` directory
  - Environment: Node.js runtime for API handlers
  - Configuration: `vercel.json` for headers, rewrites, CORS policies
  - Security Headers:
    - `Cross-Origin-Opener-Policy: same-origin-allow-popups` (for OAuth popups)
    - `X-Content-Type-Options: nosniff`

**CI Pipeline:**
- Not detected (GitHub repository exists but no CI config found)

## Environment Configuration

**Required env vars for development:**

Client (.env.local or .env):
```
VITE_GEMINI_API_KEY=your_gemini_api_key
VITE_FIREBASE_API_KEY=your_firebase_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id
VITE_GOOGLE_CLIENT_ID=your_google_client_id
```

Server (Vercel environment):
```
GEMINI_API_KEY=your_server_gemini_api_key
GEMINI_MODEL_VERSION=gemini-3-flash-preview (optional)
```

**Secrets location:**
- Development: `.env`, `.env.local` (NOT committed)
- Production: Vercel Environment Variables dashboard
- Example template: `.env.example` (safe to commit)

## Webhooks & Callbacks

**Incoming:**
- None detected

**Outgoing:**
- Google OAuth callback: User redirected after auth consent (handled by Firebase SDK)
- Google Docs export callback: Multipart response from Google Drive API

## Request Rate Limiting

**Implementation:**
- In-memory rate limiting in `api/chat.js`
  - Window: 60 seconds
  - Max requests: 20 per minute per IP
  - IP detection: `x-forwarded-for` header (Vercel proxied)
  - Response: 429 status code when exceeded

## Data Flow Summary

**Source Sheet Creation & Collaboration:**
1. User authenticates via Google OAuth → Firebase stores user identity
2. User provides topic → Sent to `/api/chat` (Gemini API)
3. Gemini suggests source references → User searches Sefaria API
4. Sefaria API returns Hebrew/English text → Sheet populated locally
5. User saves sheet → Saved to Firestore with owner reference
6. User exports to Google Docs → Drive API creates new document

---

*Integration audit: 2026-03-04*
