# Technology Stack

**Analysis Date:** 2026-03-04

## Languages

**Primary:**
- JavaScript (ES2020+) - Client-side application, React components, hooks
- JSX - React component syntax in `src/components/` and `src/pages/`
- Node.js - Serverless API handler in `api/chat.js`

## Runtime

**Environment:**
- Node.js (Vercel Serverless Functions)
- Browser: ES2020+ with native fetch/streaming support

**Package Manager:**
- npm
- Lockfile: `package-lock.json` present

## Frameworks

**Core:**
- React 19.2.0 - UI framework
- React DOM 19.2.0 - DOM rendering
- React Router DOM 7.12.0 - Client-side routing with hash-based navigation

**AI/LLM:**
- @google/generative-ai 0.24.1 - Google Gemini API client

**Drag & Drop:**
- @dnd-kit/core 6.3.1 - Foundation for drag-and-drop interactions
- @dnd-kit/sortable 10.0.0 - Sortable collections (source reordering)
- @dnd-kit/utilities 3.2.2 - Utility functions

**Export/Document Generation:**
- docx 9.5.1 - DOCX file generation for Microsoft Word exports
- html2pdf.js 0.14.0 - PDF generation from HTML
- file-saver 2.0.5 - Browser file download API

**Markdown:**
- react-markdown 10.1.0 - Render markdown in React components (AI responses)

**Environment:**
- dotenv 17.2.3 - Load environment variables from .env files

**Build/Dev:**
- Vite 7.2.4 - Build tool and dev server
- @vitejs/plugin-react 5.1.1 - React JSX transformation for Vite

**Testing:**
- Vitest 4.0.17 - Unit/component test runner
- @testing-library/react 16.3.1 - React component testing utilities
- @testing-library/jest-dom 6.9.1 - DOM matchers
- jsdom 27.4.0 - DOM simulation for tests

**Linting/Code Quality:**
- ESLint 9.39.1 - JavaScript linter
- @eslint/js 9.39.1 - ESLint core configuration
- eslint-plugin-react-hooks 7.0.1 - React hooks linting
- eslint-plugin-react-refresh 0.4.24 - React Fast Refresh support
- globals 16.5.0 - Global environment definitions for ESLint

**Type Checking:**
- @types/react 19.2.5 - React TypeScript definitions
- @types/react-dom 19.2.3 - React DOM TypeScript definitions

## Key Dependencies

**Critical:**
- firebase 12.8.0 - Database, authentication, real-time sync for user sheets
- @google/generative-ai 0.24.1 - Gemini API for AI-powered source suggestions

**UI/UX:**
- react-markdown - Render AI-generated markdown responses
- @dnd-kit/* - Drag-and-drop source reordering

**Export/Data:**
- docx - Generate .docx files
- html2pdf.js - Generate PDFs
- file-saver - Trigger browser downloads

## Configuration

**Environment Variables:**
User-facing (loaded via `import.meta.env.VITE_*`):
- `VITE_GEMINI_API_KEY` - Google Gemini API key for client-side requests (note: API key may be exposed in browser)
- `VITE_FIREBASE_API_KEY` - Firebase API key
- `VITE_FIREBASE_AUTH_DOMAIN` - Firebase auth domain
- `VITE_FIREBASE_PROJECT_ID` - Firebase project ID
- `VITE_FIREBASE_STORAGE_BUCKET` - Firebase storage bucket
- `VITE_FIREBASE_MESSAGING_SENDER_ID` - Firebase messaging sender ID
- `VITE_FIREBASE_APP_ID` - Firebase app ID
- `VITE_GOOGLE_CLIENT_ID` - Google OAuth 2.0 client ID for Google Docs integration

Server-side (Vercel environment):
- `GEMINI_API_KEY` - Server-side Gemini API key for `/api/chat` endpoint (more secure)
- `GEMINI_MODEL_VERSION` - Gemini model selection (default: `gemini-3-flash-preview`)

**Build Configuration:**
- `vite.config.js` - Vite build configuration with React plugin
- `vitest.config.js` - Test runner configuration with jsdom environment
- `eslint.config.js` - ESLint configuration (flat config format)
- `vercel.json` - Deployment headers and rewrites for Vercel

**Entry Points:**
- `src/main.jsx` - React app initialization
- `api/chat.js` - Vercel serverless function for Gemini chat

## Platform Requirements

**Development:**
- Node.js 18+ (for npm packages)
- Modern browser with ES2020+ support
- Service Worker support (PWA)

**Production:**
- Vercel (serverless deployment platform)
- Firebase (Firestore database, Google Auth)
- Google Cloud (Gemini API)
- Google OAuth 2.0 application credentials

**Service Workers:**
- PWA manifest at `/public/manifest.json`
- Service worker registration in `src/main.jsx` pointing to `/sw.js`
- Serves offline capabilities (caching strategy defined in SW)

---

*Stack analysis: 2026-03-04*
