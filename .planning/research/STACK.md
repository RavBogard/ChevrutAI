# Stack Research

**Domain:** Hebrew/English bilingual PDF export, print-ready typography, shareable public links
**Researched:** 2026-03-04
**Confidence:** MEDIUM-HIGH (PDF/Hebrew findings verified across multiple sources; some Hebrew-specific behavior requires integration testing)

---

## Context: What This Research Covers

The existing app (React 19 + Vite + Firebase + Gemini + Vercel) already handles auth, data storage, Sefaria fetching, and AI chat. This research covers only the **new requirements** for this milestone:

1. High-quality PDF export of Hebrew/English bilingual sheets
2. Beautiful print-ready layout with proper Hebrew typography
3. On-demand AI translation via Gemini
4. Shareable public web links for sheets

---

## Recommended Stack (New Additions Only)

### PDF Export Strategy

**Recommendation: CSS `@media print` + `window.print()` as primary; Puppeteer/Chromium serverless as escape hatch**

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| CSS `@media print` | N/A (browser native) | Primary PDF export mechanism | Zero dependencies, renders exactly what the browser shows, full Hebrew RTL via `direction: rtl` + `unicode-bidi: embed`, no file size bloat from canvas snapshots |
| `@page` CSS rule | N/A (browser native) | Page size, margins, page breaks | Now supported by all major browsers; headless Chrome respects page dimensions set in CSS (unlike graphical Chrome) |
| `window.print()` | N/A (browser native) | Trigger browser print dialog | Familiar UX, user controls orientation and destination (PDF, printer) |

**Why not the existing `html2pdf.js`:**
html2pdf.js uses html2canvas under the hood, which rasterizes the DOM to a canvas bitmap and embeds it as a PNG in the PDF. For Hebrew, this produces a correct-looking but image-based PDF — enormous file sizes (28MB vs 500KB text-based), no text selectability, no copy-paste, accessibility failure. The approach also handles Flexbox/Grid poorly. The existing dependency should be replaced, not extended.

**Why not `@react-pdf/renderer`:**
RTL/Hebrew support has been broken and unfixed since 2019. Bidi support (PR #2600) was merged in February 2024, but issue #3010 (filed December 2024, still OPEN as of March 2026) confirms Hebrew characters fail to render correctly even with Noto Sans Hebrew at v4.1.6. A maintainer confirmed the bug is in the font loader's caching mechanism and estimated "at least a day of work" to fix — it has not been fixed. The issue reporter's resolution: "gave up and use native pdf print." This library is not viable for this project.

**Why not `pdfmake`:**
No native Hebrew font support — must embed custom TTF files manually. RTL direction is configurable, but nikud (vowel points) placement depends entirely on the chosen font and is not guaranteed. Adding another document-definition-object abstraction layer over a React component tree is the wrong direction for a component-driven codebase. Increases bundle size with no meaningful advantage over CSS print.

**Why not Puppeteer/Playwright serverless (primary):**
Both work on Vercel via `@sparticuz/chromium` + `puppeteer-core`, but cold starts take ~15 seconds and Vercel's default serverless timeout is 10 seconds (max 60 on free tier). This is acceptable as a *fallback* for power users who need guaranteed, server-controlled PDFs, but adds operational complexity that is not warranted as the primary path. Keep as Phase 2 option if browser print UX is insufficient.

---

### Hebrew Typography

**Recommendation: Frank Ruhl Libre for body Hebrew text; Noto Serif Hebrew as fallback**

| Technology | Version/Source | Purpose | Why Recommended |
|------------|----------------|---------|-----------------|
| Frank Ruhl Libre | Google Fonts (variable, 300–900) | Hebrew body text in editor and print | The most ubiquitous Hebrew print typeface (Israeli books, newspapers, Bezalel-designed libre version). Google Fonts CDN delivery with Hebrew + Latin subsets. Works in `@media print` when self-hosted or preloaded. No license restrictions on embedding. |
| Noto Serif Hebrew | Google Fonts (OFL license) | Hebrew fallback, scholarly texts | Full nikud support confirmed. Cross-script harmonization with Latin. OFL license permits embedding. Use when Frank Ruhl Libre is unavailable or when a more neutral scholarly look is needed. |
| System fonts (for English) | N/A | English body text | `Georgia, 'Times New Roman', serif` for print; no external dependency. |

**CSS Pattern for print-safe Hebrew font loading:**

```css
/* Self-host or preload to ensure availability at print time */
@font-face {
  font-family: 'Frank Ruhl Libre';
  src: url('/fonts/FrankRuhlLibre-Regular.woff2') format('woff2');
  font-weight: 400;
  font-display: swap;
  unicode-range: U+0590-05FF, U+FB1D-FB4E; /* Hebrew only */
}

@font-face {
  font-family: 'Frank Ruhl Libre';
  src: url('/fonts/FrankRuhlLibre-Bold.woff2') format('woff2');
  font-weight: 700;
  font-display: swap;
  unicode-range: U+0590-05FF, U+FB1D-FB4E;
}
```

**Critical:** Use self-hosted WOFF2, not Google Fonts CDN, for print reliability. When printing via `window.print()`, fonts loaded from external domains can fail to load before the print dialog opens. Place font declarations in a `<style>` tag in the document `<head>`, not an external stylesheet — this avoids the late-discovery penalty.

**Nikud (vowel points):** Both Frank Ruhl Libre and Noto Serif Hebrew support nikud. Ezra SIL provides the most precise BHS-standard nikud placement for scholarly texts but lacks bold weight. Use Ezra SIL only if users specifically need biblical cantillation marks (`ta'amim`). For ChevrutAI's use case (Sefaria texts, which may or may not carry nikud), Frank Ruhl Libre is sufficient.

---

### Bilingual RTL/LTR Layout

**Recommendation: CSS Flexbox with per-column `direction` declarations inside `@media print`**

```css
/* Screen layout */
.sheet-bilingual {
  display: flex;
  flex-direction: row;
  gap: 2rem;
  align-items: flex-start;
}

.col-hebrew {
  flex: 1;
  direction: rtl;
  unicode-bidi: embed;
  text-align: right;
  font-family: 'Frank Ruhl Libre', 'Noto Serif Hebrew', serif;
  font-size: 1.1rem;
  line-height: 1.8; /* Hebrew requires generous line height for nikud */
}

.col-english {
  flex: 1;
  direction: ltr;
  unicode-bidi: embed;
  text-align: left;
  font-family: Georgia, 'Times New Roman', serif;
  font-size: 1rem;
  line-height: 1.7;
}

/* Print overrides */
@media print {
  @page {
    size: Letter;
    margin: 0.75in 1in;
  }

  .sheet-bilingual {
    display: flex;
    flex-direction: row;
    gap: 1.5rem;
    break-inside: avoid;
  }

  /* Hebrew column on the right (standard synagogue handout) */
  .col-hebrew {
    order: 2; /* Visual right */
  }
  .col-english {
    order: 1; /* Visual left */
  }

  .source-block {
    break-inside: avoid;
    page-break-inside: avoid; /* Legacy fallback */
  }
}
```

**Key rules:**
- Never set `direction: rtl` on the root `<html>` — it will flip the entire app UI. Set it only on Hebrew text containers.
- Use `unicode-bidi: embed` (not `isolate`) on column containers. Use `unicode-bidi: isolate` on inline mixed-direction spans.
- Hebrew column order should be `order: 2` in a row-direction flex context to appear visually right when the layout is LTR — this matches the synagogue handout standard (Hebrew right, English left) without requiring a RTL document root.
- `line-height: 1.8` minimum for Hebrew text with nikud — nikud marks occupy vertical space below the baseline and clip at tighter line heights.

---

### Shareable Public Links

**Recommendation: Firestore public-read security rules + React Router `/sheet/:id` routes (no new dependencies)**

The existing Firestore + React Router setup is sufficient. No new libraries needed.

**Firestore Security Rule change:**

```javascript
// firestore.rules
match /sheets/{sheetId} {
  allow read: if true;  // Public read — any unauthenticated user can view
  allow write: if request.auth != null && request.auth.uid == resource.data.ownerId;
}
```

**React Router route:**

```jsx
// App.jsx — add alongside existing authenticated routes
<Route path="/sheet/:id" element={<PublicSheetView />} />
```

**PublicSheetView:** Fetches sheet by ID from Firestore using `getDoc()`. No auth check. Renders read-only. Uses the same sheet display component as the editor, but without edit controls.

**URL pattern:** `https://chevrut.ai/sheet/[FIRESTORE_DOC_ID]` — the Firestore document ID is already a random 20-character string, making enumeration impractical.

**Note on Firebase Dynamic Links:** Firebase Dynamic Links is deprecated and shutting down. Do not use it. Plain React Router paths are the correct approach.

**Optional:** Add a `isPublic: boolean` field to the sheet document and gate the public read rule on `resource.data.isPublic == true`. This lets users control whether their sheet is publicly accessible without changing Firestore rules structure.

---

### AI Translation (On-Demand)

**Recommendation: Extend existing `/api/chat` Vercel serverless function — no new infrastructure**

The Gemini API via the existing serverless backend already handles this. A new endpoint or a new prompt template in the same endpoint handles translation.

```javascript
// In api/translate.js (new Vercel function, same pattern as api/chat.js)
const prompt = `You are a scholarly translator of classical Jewish texts.
Translate the following Hebrew text into clear, readable English.
Preserve the formal register appropriate for religious study.
If the text contains proper nouns (names of rabbis, places, texts), keep them in transliteration.
Hebrew text:
${hebrewText}

Provide only the English translation. No explanations or commentary.`;
```

**Gemini translation quality for Hebrew:** Gemini supports Hebrew translation. The 2024 Gemini integration into Google Translate confirms strong Hebrew capability. For classical rabbinic Hebrew (Talmudic, Mishnaic), quality will vary — Gemini handles modern Hebrew well but classical forms may require prompt tuning. The existing `gemini-3-flash-preview` model is adequate; upgrade to `gemini-2.0-flash` or `gemini-2.5-flash` for better classical text accuracy. Flag AI-generated translations visually (e.g., asterisk or "AI translation" badge) so users know to verify.

**Rate limiting:** Reuse the existing in-memory rate limiter pattern (20 req/min/IP) from `api/chat.js`. Translation calls are typically shorter than chat — no streaming needed.

---

## Supporting Libraries

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `fontsource/frank-ruhl-libre` | Latest | Self-hosted Hebrew font | Use if not self-hosting woff2 files manually; fontsource packages are npm-installable Google Fonts |
| `fontsource/noto-serif-hebrew` | Latest | Self-hosted Hebrew fallback font | Use if nikud rendering on Frank Ruhl Libre is insufficient for specific texts |

**No other new libraries required.** The PDF export via `window.print()` and CSS `@media print` requires zero new dependencies. Public links require zero new dependencies. AI translation extends existing infrastructure.

---

## Alternatives Considered

| Category | Recommended | Alternative | Why Not |
|----------|-------------|-------------|---------|
| PDF export | CSS `@media print` + `window.print()` | `@react-pdf/renderer` | Hebrew rendering broken as of Dec 2024 (issue #3010, open); image-based workaround produces non-searchable PDFs |
| PDF export | CSS `@media print` + `window.print()` | `html2pdf.js` (existing dep) | Canvas-rasterization approach produces ~28MB files, no text select, Flexbox/Grid rendering broken |
| PDF export | CSS `@media print` + `window.print()` | `pdfmake` | Requires manual TTF embedding, document-definition-object abstraction wrong for React codebase |
| PDF export (server-side) | CSS `@media print` (client) | Puppeteer + `@sparticuz/chromium` | 15s cold start exceeds Vercel's 10s default; operational overhead not warranted for v1 |
| Hebrew font | Frank Ruhl Libre | Ezra SIL | Ezra SIL has no bold weight; better for BHS-exact scholarly use than general publishing |
| Hebrew font | Frank Ruhl Libre | SBL Hebrew | License restricts embedding in non-SBL software contexts |
| Public links | Firestore public read rules | Firebase Dynamic Links | Deprecated, shutting down |
| AI translation | Existing Gemini serverless | Google Cloud Translation API v3 | Adds new credential/billing scope; Gemini already integrated and produces comparable quality |

---

## What NOT to Use

| Avoid | Why | Use Instead |
|-------|-----|-------------|
| `html2pdf.js` for Hebrew PDF | Image-based output: non-searchable, 28MB files, poor Flexbox support | CSS `@media print` with proper Hebrew CSS |
| `@react-pdf/renderer` for Hebrew | Hebrew rendering broken in all versions including v4.3.2; open GitHub issues since 2019 | CSS `@media print` |
| `jsPDF` native text for Hebrew | Hebrew glyph rendering broken; requires custom plugin that doesn't exist in stable form | CSS `@media print` |
| Google Fonts CDN for print fonts | External font requests can fail before print dialog opens | Self-host WOFF2 in `/public/fonts/` |
| `direction: rtl` on `<html>` root | Flips entire application UI layout | Apply `direction: rtl` only to Hebrew text containers |
| Firebase Dynamic Links | Deprecated, shutting down | React Router `/sheet/:id` paths |
| Gemini streaming for translation | Translation is a single-shot request; streaming adds complexity with no UX benefit | Standard non-streaming Gemini API call |
| `html2canvas` screenshot approach | File size 28MB vs 500KB text-based; loses text selectability | CSS print stylesheet |

---

## Stack Patterns by Variant

**If the user is authenticated and views their own sheet:**
- Full editor UI renders
- "Export PDF" button triggers `window.print()` on a hidden print-ready `<div>` that uses the `@media print` sheet layout
- "Share" button generates/copies the public URL (`/sheet/:sheetId`)

**If an unauthenticated user opens `/sheet/:id`:**
- `PublicSheetView` component fetches Firestore doc
- Read-only render of the sheet with print CSS applied
- "Print / Save PDF" button available to unauthenticated viewers
- No auth prompt, no login wall

**If a Sefaria text has no English translation (`text` field empty):**
- "Translate with AI" button appears on that source block
- Calls `/api/translate` with the Hebrew text
- Response stored in local component state (not saved to Firestore unless user explicitly saves)
- Translation marked with "AI translation" indicator

**If high-volume PDF generation is needed (future):**
- Add Puppeteer + `@sparticuz/chromium-min` + `puppeteer-core` as serverless function
- Send sheet HTML to `/api/pdf`, receive binary PDF response
- Store in Firebase Storage, return download URL
- Increases Vercel function size; requires Vercel Pro for 60s timeout

---

## Version Compatibility

| Package | Compatible With | Notes |
|---------|-----------------|-------|
| Frank Ruhl Libre (Google Fonts) | All modern browsers, Chrome/Safari print | Self-host WOFF2 for print reliability; woff2 is the only format needed in 2025 |
| Noto Serif Hebrew (Google Fonts) | All modern browsers | OFL license, safe to embed; variable font available |
| Firebase 12.8.0 (existing) | Firestore public read rules require no SDK changes | Rule change is server-side only |
| React Router DOM 7.12.0 (existing) | `/sheet/:id` route requires no version change | Add new route to existing router config |
| Gemini API (existing serverless) | `/api/translate` is a new file using identical pattern | No SDK version change needed |

---

## Installation

```bash
# If using fontsource for npm-managed font delivery (alternative to manual WOFF2)
npm install @fontsource/frank-ruhl-libre @fontsource/noto-serif-hebrew

# No other new dependencies required for this milestone
```

**Manual font self-hosting (recommended over fontsource for print reliability):**

1. Download Frank Ruhl Libre WOFF2 from Google Fonts or the official GitHub repo
2. Place in `/public/fonts/`
3. Add `@font-face` declarations in `index.html` `<style>` tag (inline, not external CSS)
4. Add `<link rel="preload" href="/fonts/FrankRuhlLibre-Regular.woff2" as="font" type="font/woff2" crossorigin>` to `<head>`

---

## Sources

- [react-pdf/renderer RTL support issue #1571](https://github.com/diegomura/react-pdf/issues/1571) — Bidi support added via PR #2600, merged Feb 2024 (HIGH confidence — fetched directly)
- [react-pdf Hebrew rendering issue #3010](https://github.com/diegomura/react-pdf/issues/3010) — Hebrew still broken as of Dec 2024 v4.1.6, issue OPEN, no fix committed (HIGH confidence — fetched directly)
- [react-pdf Arabic broken after bidi PR #2638](https://github.com/diegomura/react-pdf/issues/2638) — Bidi merge introduced regressions (MEDIUM confidence — WebSearch)
- [Frank Ruhl Libre — Google Fonts](https://fonts.google.com/specimen/Frank+Ruhl+Libre) — Font availability, weights, license confirmed (HIGH confidence)
- [Noto Serif Hebrew — Google Fonts](https://fonts.google.com/noto/specimen/Noto+Serif+Hebrew) — OFL license, nikud support confirmed (HIGH confidence)
- [Open Siddur Project Hebrew Fonts](https://opensiddur.org/help/fonts/) — Comprehensive Hebrew font nikud comparison, 2024 update (MEDIUM confidence)
- [Hebrew Layout Requirements — W3C](https://w3c.github.io/hlreq/) — Authoritative RTL layout spec (HIGH confidence)
- [CSS direction — MDN](https://developer.mozilla.org/en-US/docs/Web/CSS/direction) — `direction: rtl` behavior confirmed (HIGH confidence)
- [html2canvas + jsPDF Hebrew workaround analysis](https://medium.com/@vinaymahamuni/rtl-right-to-left-in-the-pdf-ae6704070f06) — File size comparison (28MB vs 500KB) documented (MEDIUM confidence — WebSearch)
- [Creating PDFs from HTML + CSS: What actually works — Joyfill](https://joyfill.io/blog/creating-pdfs-from-html-css-in-javascript-what-actually-works) — Analysis of CSS print vs canvas approaches (MEDIUM confidence — WebSearch)
- [Deploying Puppeteer on Vercel — Vercel KB](https://vercel.com/kb/guide/deploying-puppeteer-with-nextjs-on-vercel) — Cold start behavior, timeout limits confirmed (MEDIUM confidence)
- [Firebase Dynamic Links deprecated — Firebase Docs](https://firebase.google.com/docs/dynamic-links/) — Deprecation and shutdown confirmed (HIGH confidence)
- [Sefaria Source Sheet format wiki](https://github.com/Sefaria/Sefaria-Project/wiki/Source-Sheets-Document-Format) — Sefaria's own bilingual layout model (he/en fields, sideBySide option) verified (HIGH confidence)
- [Chrome headless print-to-PDF vs graphical Chrome differences](https://andre.arko.net/2025/05/25/chrome-headless-print-to-pdf/) — Headless respects CSS page dimensions; graphical uses window width (MEDIUM confidence — WebSearch)

---

*Stack research for: ChevrutAI — PDF export + Hebrew typography + public links + AI translation*
*Researched: 2026-03-04*
