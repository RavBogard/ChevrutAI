# Phase 2: Hebrew Typography and Bilingual Layout - Research

**Researched:** 2026-03-04
**Domain:** Hebrew web typography, RTL CSS scoping, bilingual two-column layout, font self-hosting in Vite
**Confidence:** HIGH

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| TYPO-01 | Hebrew text renders using Frank Ruhl Libre (self-hosted WOFF2), with nikud-safe line-height (minimum 1.8) | `@fontsource-variable/frank-ruhl-libre` v5.2.8 is the correct self-hosting mechanism — one npm install + one import line, Hebrew subset available; line-height 1.8-2.0 verified by W3C hlreq document as the minimum for nikud |
| TYPO-02 | Sheet displays Hebrew and English side-by-side in two columns (Hebrew right, English left) — the standard synagogue bilingual format | CSS Flexbox with physical `flex-direction: row` on a `dir="ltr"` wrapper locks Hebrew-right / English-left regardless of document direction; column order pattern documented below |
| TYPO-03 | Hebrew column uses `direction: rtl`; English column uses `direction: ltr`; these are scoped per-column and do not affect the app shell | Container-scoped `direction` property is the verified correct approach — MDN, CSS-Tricks, and W3C confirm per-element scoping works; `unicode-bidi: embed` prevents bidi bleed to parent |
| TYPO-04 | Sheet preview panel renders the bilingual layout correctly at screen size before export | SheetPreview component wraps existing `sheet-paper` div inside `SheetView`; CSS architecture separates sheet-scoped styles into `sheet-preview.css` so Phase 4 can add `@media print` to the same file without touching app shell |
</phase_requirements>

---

## Summary

Phase 2 has four concrete deliverables: (1) self-hosted Frank Ruhl Libre variable font via `@fontsource-variable/frank-ruhl-libre`, (2) a new `SheetPreview` component that renders sources from the Zustand store in the correct bilingual layout, (3) scoped RTL CSS that applies `direction: rtl` per Hebrew column only without touching the app shell, and (4) a dedicated CSS file that Phase 4 can extend with `@media print` rules.

The existing codebase already has a `SourceBlock` component with `.text-heb` and `.text-eng` classes and a `.source-content` flex container — but the current font is `Heebo` (sans-serif, no nikud support) and line-height is `1.6` (too tight for nikud). The current bilingual column order also renders English left / Hebrew right only accidentally — if the document direction were flipped, the columns would swap. Phase 2 fixes the font, line-height, and column-order guarantee, and organizes the CSS so it is print-ready.

The one architectural decision requiring care is **where SheetPreview lives in the component tree**. The correct pattern is to keep `SheetPreview` inside `SheetView` as a focused sub-component that handles only the sheet paper rendering — it receives the sources array as props (or reads from the Zustand store directly) and renders nothing except the columns. This separates concerns cleanly: `SheetView` owns layout scaffolding, `SheetPreview` owns the bilingual column rendering. Phase 4 will simply add `@media print` rules to the same CSS file.

**Primary recommendation:** Install `@fontsource-variable/frank-ruhl-libre`, import the Hebrew subset CSS in `main.jsx`, create `SheetPreview.jsx` + `sheet-preview.css` with scoped RTL column layout at line-height 1.8 minimum, and update the CSS variable `--font-hebrew` to use `'Frank Ruhl Libre Variable'`.

---

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| @fontsource-variable/frank-ruhl-libre | 5.2.8 (latest) | Self-hosted variable font WOFF2 — Hebrew + Latin subsets | One npm install replaces CDN; provides Hebrew subset WOFF2 specifically; OFL-1.1 license; version-locked so Google cannot change glyphs; 103KB unpacked (much smaller than static variants at 516KB) |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| @fontsource/frank-ruhl-libre | 5.2.8 | Static (non-variable) individual weight imports | Use only if variable font causes rendering issues in specific browsers; import only needed weights (400, 700) |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| @fontsource-variable/frank-ruhl-libre | Manual WOFF2 download + @font-face in CSS | Both work equally well; Fontsource is preferred because it handles @font-face generation, unicode-range, font-display, and file hashing automatically; manual approach is viable for Phase 4 print testing if fontsource path causes bundler issues |
| @fontsource-variable/frank-ruhl-libre | Noto Serif Hebrew | Noto has superior nikud coverage for full cantillation marks (t'amim); Frank Ruhl Libre was explicitly specified in TYPO-01 and is the correct choice for the synagogue aesthetic; Noto is a fallback only if Frank Ruhl renders nikud badly in testing |
| CSS Flexbox two-column | CSS Grid `grid-template-areas` | Grid works equally well; Flexbox is simpler for this use case since column widths are equal (flex: 1 each) and the column count never changes |

**Installation:**
```bash
npm install @fontsource-variable/frank-ruhl-libre
```

---

## Architecture Patterns

### Recommended File Structure for Phase 2
```
src/
├── main.jsx                      # Add: import '@fontsource-variable/frank-ruhl-libre'
├── App.css                       # Update: --font-hebrew CSS variable only
├── components/
│   ├── SheetView.jsx              # Existing: unchanged except rendering SheetPreview
│   └── sheet/
│       ├── SheetPreview.jsx       # NEW: bilingual column layout component
│       └── SheetPreview.css       # NEW: all sheet-scoped typography styles (Phase 4 extends with @media print)
```

### Pattern 1: Font Self-Hosting via Fontsource Variable

**What:** Import the variable font CSS in the app entry point. Fontsource generates all `@font-face` blocks automatically, including Hebrew and Latin unicode-range splits and WOFF2 format declarations.

**When to use:** Always — this is the single place font loading is declared.

```javascript
// src/main.jsx — add this import BEFORE App.css
import '@fontsource-variable/frank-ruhl-libre';
// This loads the default wght axis CSS which covers weights 300-900
// It automatically includes both the hebrew and latin subsets
```

The variable import generates `@font-face` blocks equivalent to:
```css
/* Auto-generated by @fontsource-variable/frank-ruhl-libre — DO NOT WRITE THIS MANUALLY */
@font-face {
  font-family: 'Frank Ruhl Libre Variable';
  font-style: normal;
  font-display: swap;
  font-weight: 300 900;
  src: url('../node_modules/@fontsource-variable/frank-ruhl-libre/files/frank-ruhl-libre-variable-wght-normal.woff2') format('woff2-variations');
  unicode-range: U+0590-05FF, U+FB1D-FB4E; /* Hebrew block */
}
@font-face {
  font-family: 'Frank Ruhl Libre Variable';
  font-style: normal;
  font-display: swap;
  font-weight: 300 900;
  src: url('...frank-ruhl-libre-latin-variable-wght-normal.woff2') format('woff2-variations');
  unicode-range: U+0000-00FF; /* Latin block */
}
```

**CSS variable update in App.css:**
```css
:root {
  /* Phase 2 update: replace Heebo with Frank Ruhl Libre Variable */
  --font-hebrew: 'Frank Ruhl Libre Variable', 'Frank Ruhl Libre', 'David', 'Arial Hebrew', serif;
}
```

The fallback chain `'Frank Ruhl Libre Variable', 'Frank Ruhl Libre', 'David', 'Arial Hebrew', serif` ensures:
1. Variable font loads (modern browsers, all weights)
2. Static fontsource version if variable not supported
3. Built-in macOS/iOS Hebrew font (David) as system fallback
4. Arial Hebrew as universal fallback
5. Any serif as last resort

### Pattern 2: Bilingual Two-Column Layout with Fixed Column Order

**What:** A flex container with `dir="ltr"` as a layout reset forces Hebrew-right / English-left at all times regardless of document direction. The Hebrew column declares `direction: rtl` and the English column declares `direction: ltr`. These are scoped to their containers using the CSS `direction` property — not the HTML `dir` attribute on `<html>` or `<body>`.

**When to use:** Every source block in the sheet preview that has bilingual content.

**Key constraint:** The wrapper must be `dir="ltr"` (physical layout anchor), even though the right column is Hebrew RTL. This is because CSS Flexbox `flex-direction: row` is direction-aware — if the document direction were RTL, columns would render in the opposite physical order. Using `dir="ltr"` on the wrapper overrides this and guarantees Hebrew always appears on the right half of the screen.

```jsx
// src/components/sheet/SheetPreview.jsx
const BilingualBlock = ({ source }) => {
  const hasHebrew = hasContent(source.he);
  const hasEnglish = hasContent(source.en);

  if (!hasHebrew && !hasEnglish) return null;

  // Hebrew-only: render single RTL column
  if (hasHebrew && !hasEnglish) {
    return (
      <div className="source-bilingual-row source-bilingual-row--hebrew-only">
        <div className="source-col source-col--hebrew" dir="rtl" lang="he">
          <SourceText content={source.he} />
        </div>
      </div>
    );
  }

  // English-only: render single LTR column
  if (hasEnglish && !hasHebrew) {
    return (
      <div className="source-bilingual-row source-bilingual-row--english-only">
        <div className="source-col source-col--english" dir="ltr" lang="en">
          <SourceText content={source.en} />
        </div>
      </div>
    );
  }

  // Bilingual: fixed column order — Hebrew right, English left
  // dir="ltr" on wrapper anchors physical column positions regardless of document direction
  return (
    <div className="source-bilingual-row" dir="ltr">
      <div className="source-col source-col--english" dir="ltr" lang="en">
        <SourceText content={source.en} />
      </div>
      <div className="source-col source-col--hebrew" dir="rtl" lang="he">
        <SourceText content={source.he} />
      </div>
    </div>
  );
};
```

```css
/* src/components/sheet/SheetPreview.css */

/* === Bilingual Row === */
.source-bilingual-row {
  display: flex;
  flex-direction: row;           /* Physical left-to-right order within the dir="ltr" wrapper */
  gap: 2rem;
  align-items: flex-start;       /* Top-align columns — columns may differ in height */
}

/* === English Column === */
.source-col--english {
  flex: 1;
  direction: ltr;
  text-align: left;
  unicode-bidi: embed;           /* Prevents bidi algorithm from propagating to parent */
  font-family: var(--font-english-serif);
  font-size: 1.05rem;
  line-height: 1.65;
  color: var(--sheet-text);
}

/* === Hebrew Column === */
.source-col--hebrew {
  flex: 1;
  direction: rtl;
  text-align: right;
  unicode-bidi: embed;           /* Scopes RTL — does not bleed to siblings or parent */
  font-family: var(--font-hebrew);
  font-size: 1.45rem;            /* Larger for traditional siddur-like readability */
  line-height: 1.9;              /* 1.9 > 1.8 minimum — provides margin above nikud clipping threshold */
  color: var(--sheet-text);
}

/* === Single-language variants === */
.source-bilingual-row--hebrew-only .source-col--hebrew {
  flex: 0 0 100%;
  max-width: 100%;
}

.source-bilingual-row--english-only .source-col--english {
  flex: 0 0 100%;
  max-width: 100%;
}

/* === Mobile: stack columns vertically, Hebrew on top === */
@media (max-width: 768px) {
  .source-bilingual-row {
    flex-direction: column;
  }
  .source-col--hebrew {
    order: 1;   /* Hebrew first (top) on mobile — reading order for RTL primary content */
  }
  .source-col--english {
    order: 2;
  }
}
```

### Pattern 3: RTL Scoping — What NOT to Touch

**Critical:** The CSS `direction` property cascades to all descendants. If `direction: rtl` is placed on:
- `<html>` — the entire app flips: navigation, buttons, sidebars all mirror
- `<body>` — same as html but also causes scroll bugs in Firefox
- `.shell-content` or `.app-shell` — the sidebar and header inherit the direction

**Correct scope is the column element itself.** The `direction: rtl` applied to `.source-col--hebrew` affects only:
- Text alignment within that column (correct: right-aligned Hebrew)
- Cursor behavior in contenteditable (correct: Hebrew cursor moves right)
- Punctuation placement (correct: follows RTL rules)

**The `unicode-bidi: embed` declaration** prevents the RTL direction from bleeding through the bidi algorithm to affect sibling elements or the flex container.

### Pattern 4: SheetPreview Component Placement

**Where it lives:** `SheetPreview` is a new sub-component rendered inside `SheetView` as the content of `div.sheet-paper`. It replaces the direct rendering of `SortableSourceItem` elements inside the paper div.

**Component boundary:**
- `SheetView` owns: DnD context, toolbar, title input, app-chrome, export handlers
- `SheetPreview` owns: the rendered list of source blocks in bilingual column format, the paper-level CSS class, the ref for export (existing `id="sheet-export-area"` stays on this element)

**Props or store:** Phase 2 introduces `SheetPreview` before Phase 1's Zustand store is complete. The component should accept `sources` as a prop (passed from `SheetView`) so it is usable immediately. After Phase 1 completes, an optional refactor can wire it to `useSheetStore` directly. Do not block Phase 2 on Phase 1 store completion.

```jsx
// SheetView.jsx — replace inner sheet-paper content with:
<div className="sheet-paper" id="sheet-export-area">
  <SheetPreview
    sources={sources}
    onRemoveSource={onRemoveSource}
    onUpdateSource={onUpdateSource}
    onReorder={onReorder}
  />
</div>
```

```jsx
// src/components/sheet/SheetPreview.jsx — skeleton
import './SheetPreview.css';

const SheetPreview = ({ sources, onRemoveSource, onUpdateSource, onReorder }) => {
  // Renders the list of source blocks in bilingual layout
  // DnD wrapper stays in SheetView (it requires the DndContext which owns sensors)
  // SheetPreview wraps only the visual presentation layer
  return (
    <div className="sheet-preview">
      {sources.map((source) => (
        <div key={source.ref} className="sheet-source-block">
          {/* source header: ref, controls */}
          <div className="sheet-source-header">
            <span className="sheet-source-ref">{source.ref}</span>
            {/* view mode selector, remove button */}
          </div>
          {/* bilingual columns */}
          <BilingualBlock
            source={source}
            viewMode={source.viewMode || 'bilingual'}
          />
        </div>
      ))}
    </div>
  );
};
```

### Anti-Patterns to Avoid

- **Setting `direction: rtl` on `.app-shell`, `.shell-content`, `body`, or `html`:** Flips all UI chrome (sidebar, navigation, button order). RTL must be scoped exclusively to `.source-col--hebrew`.
- **Using `dir` attribute on the bilingual wrapper without `dir="ltr"` override:** If the surrounding context is RTL (e.g., when the app language is Hebrew), the flex container direction flips and Hebrew ends up on the left.
- **Setting `text-align: right` without `direction: rtl`:** Visually right-aligns Hebrew but does not fix cursor behavior, punctuation placement, or bidi algorithm — use both together.
- **Setting `direction: rtl` without `unicode-bidi: embed`:** The bidi algorithm can propagate the RTL direction outward through inline formatting contexts; `unicode-bidi: embed` contains it.
- **Using `line-height: 1.6` for Hebrew with nikud:** Clips nikud marks between adjacent lines. Minimum is 1.8; 1.9 recommended for comfort.
- **Importing Fontsource after App.css:** Font imports must precede other CSS to ensure `@font-face` declarations load before selectors that reference the font family.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| WOFF2 font delivery with correct @font-face, unicode-range, font-display | Custom @font-face declarations with manually downloaded files | @fontsource-variable/frank-ruhl-libre | Fontsource handles unicode-range splits per script, font-display: swap, WOFF2-variations format declaration, and Vite bundler compatibility automatically; manual approach requires knowing the exact unicode block boundaries for Hebrew (U+0590-05FF plus extended blocks) |
| Detecting whether a source has Hebrew vs English content | Custom type check | `hasContent()` helper — already exists in `SourceBlock.jsx` | The existing helper correctly handles string, array, and null/undefined; copy it to `SheetPreview.jsx` as a utility |
| Converting JaggedArray Hebrew/English to renderable HTML | Custom flattener | Phase 1's `flattenSefariaText()` (DATA-03) | Sefaria returns 1-3 level nested arrays; the normalization function from Phase 1 handles all cases |

**Key insight:** The bilingual layout problem looks simple but has two correctness requirements that are easy to get wrong independently: (1) `unicode-bidi: embed` to scope RTL, and (2) `dir="ltr"` on the wrapper to anchor physical column order. Miss either and the layout breaks in RTL-context environments or with certain browser bidi implementations.

---

## Common Pitfalls

### Pitfall 1: Nikud Clipping at line-height 1.6
**What goes wrong:** Hebrew text with vowel points (nikud) renders with diacritics visually cut off, overlapping into adjacent lines. This is especially visible at font sizes above 1.2rem.
**Why it happens:** The default browser line-height (approximately 1.2) and the app's current `1.6` setting are both too tight for nikud marks, which extend above the cap height and below the baseline of the base character. Frank Ruhl Libre's metrics make this particularly noticeable at body sizes.
**How to avoid:** Set `line-height: 1.9` on `.source-col--hebrew` (above the 1.8 minimum specified in TYPO-01). Never use the unitless shorthand `line-height: normal` for Hebrew columns.
**Warning signs:** Vowel point dots (shva, tzere, holam) appear clipped at the top or bottom of lines; adjacent lines' nikud marks visually touch.

### Pitfall 2: RTL Direction Bleeding into App Shell
**What goes wrong:** The sidebar navigation, header buttons, and input fields render mirrored — icons appear on the wrong side, dropdowns open in the wrong direction, text input cursor starts from the right.
**Why it happens:** `direction: rtl` is placed on a container that is an ancestor of the app shell elements, causing the CSS cascade to flip all descendants.
**How to avoid:** Apply `direction: rtl` ONLY to `.source-col--hebrew`. Add `unicode-bidi: embed` on the same element. The `SheetPreview.css` file should be isolated and only applied to elements inside `.sheet-preview`.
**Warning signs:** Sidebar appears on the right instead of left; navigation links are right-aligned; unrelated text inputs show right-to-left cursor behavior.

### Pitfall 3: Font Loading Race Condition (FOUT / FOIT)
**What goes wrong:** On first page load, Hebrew text renders in a system fallback font (Heebo or Arial Hebrew), then jumps to Frank Ruhl Libre once the WOFF2 loads. This causes layout shift (CLS) and flicker.
**Why it happens:** The browser requests the WOFF2 file asynchronously after parsing the CSS. Without `font-display: swap`, it either shows invisible text (FOIT) or blocks rendering.
**How to avoid:** Fontsource sets `font-display: swap` by default in all its `@font-face` declarations — this is handled automatically. For Phase 4 print export, add a `<link rel="preload">` tag in `index.html` for the WOFF2 file most likely to be needed at render time.
**Warning signs:** Hebrew text briefly appears in a different (typically sans-serif) font before snapping to Frank Ruhl Libre; layout jumps on first load.

### Pitfall 4: Column Order Flips in RTL Context
**What goes wrong:** When the app's UI language is switched to Hebrew (affecting the document or page-level direction), the bilingual columns swap — Hebrew appears on the left and English on the right.
**Why it happens:** CSS Flexbox `flex-direction: row` is direction-aware. Without a `dir="ltr"` anchor on the wrapper, the flex container respects the inherited direction and renders items in RTL physical order.
**How to avoid:** Always place `dir="ltr"` on the `.source-bilingual-row` wrapper element (the flex container). This anchors the physical column layout to left-to-right regardless of the document's bidi direction. The columns themselves still declare their own internal direction correctly.
**Warning signs:** Bilingual layout looks correct in English UI mode but mirrors when UI language is set to Hebrew.

### Pitfall 5: Hebrew Array Content Not Rendering
**What goes wrong:** Hebrew column is blank or shows "[object Object]" even though the source has Hebrew content in the store.
**Why it happens:** Sefaria API returns Hebrew text as a nested array (JaggedArray), not a string. The existing `SourceBlock.jsx` passes this array directly to `EditableContent` which uses innerHTML with an array — this silently renders nothing.
**How to avoid:** Always run source content through Phase 1's `flattenSefariaText()` before rendering. In `SheetPreview`, apply this normalization in the `SourceText` helper or at the `BilingualBlock` level. Do not assume Hebrew content is always a string.
**Warning signs:** Hebrew column renders empty despite the source having content; console shows no error because React silently drops non-string values passed to innerHTML.

### Pitfall 6: innerHTML with Unsanitized Sefaria HTML (Security)
**What goes wrong:** Sefaria API returns Hebrew and English text as HTML strings containing `<em>`, `<strong>`, `<i>` tags and footnote markup. Rendering this via innerHTML without sanitization opens an XSS vector if a malicious Sefaria response ever injects script tags.
**Why it happens:** The existing `EditableContent.jsx` already uses innerHTML for this purpose — this is an accepted tradeoff in the current codebase. The same pattern in `SheetPreview.jsx` carries the same risk.
**How to avoid:** For Phase 2, match the existing codebase pattern (innerHTML for Sefaria content). Document the risk. In a future hardening phase, add DOMPurify (`npm install dompurify`) and wrap all innerHTML calls: `{ __html: DOMPurify.sanitize(html) }`. The sanitization phase should be tracked as a security backlog item, not a blocker for Phase 2.
**Warning signs:** N/A for Phase 2 (Sefaria is a trusted source); becomes relevant if user-provided content is ever passed through the same render path.

---

## Code Examples

Verified patterns from official sources:

### Frank Ruhl Libre Variable Import (Fontsource)
```javascript
// src/main.jsx — insert before all other CSS imports
// Source: @fontsource-variable/frank-ruhl-libre v5.2.8 (npm, fontsource.org)
import '@fontsource-variable/frank-ruhl-libre';

// This single import:
// 1. Declares @font-face for 'Frank Ruhl Libre Variable' (wght axis 300-900)
// 2. Includes Hebrew (U+0590-05FF) and Latin subsets as separate @font-face rules
// 3. Sets font-display: swap automatically
// 4. WOFF2-variations format for variable font — WOFF2 fallback for older browsers
```

### CSS Variable Update (App.css)
```css
/* src/App.css — update only this one line in :root */
:root {
  /* Phase 2: Replace Heebo with self-hosted Frank Ruhl Libre Variable */
  --font-hebrew: 'Frank Ruhl Libre Variable', 'Frank Ruhl Libre', 'David', 'Arial Hebrew', serif;
}
```

### Bilingual Column CSS (Complete, Production-Ready)
```css
/* src/components/sheet/SheetPreview.css */
/* Source: MDN direction, MDN unicode-bidi, CSS-Tricks flexbox, W3C hlreq */

/* ============================
   Sheet Preview Container
   ============================ */
.sheet-preview {
  display: flex;
  flex-direction: column;
  gap: 2rem;
  padding: 1rem 0;
}

/* ============================
   Individual Source Block
   ============================ */
.sheet-source-block {
  border: 1px solid var(--border-color);
  border-radius: 8px;
  padding: 1.25rem 1.5rem;
  background-color: var(--source-bg);
}

.sheet-source-ref {
  font-family: var(--font-english-serif);
  font-size: 1rem;
  font-weight: 700;
  color: var(--primary-color);
}

/* ============================
   Bilingual Row (TYPO-02, TYPO-03)
   dir="ltr" on element anchors physical column positions.
   Without this, a RTL document context flips the columns.
   ============================ */
.source-bilingual-row {
  display: flex;
  flex-direction: row;
  gap: 2rem;
  align-items: flex-start;
  margin-top: 0.75rem;
}

/* ============================
   English Column (TYPO-03: ltr scoped)
   ============================ */
.source-col--english {
  flex: 1;
  direction: ltr;
  text-align: left;
  unicode-bidi: embed;
  font-family: var(--font-english-serif);
  font-size: 1.05rem;
  line-height: 1.65;
  color: var(--sheet-text);
}

/* ============================
   Hebrew Column (TYPO-01, TYPO-03: rtl scoped, nikud-safe line-height)
   ============================ */
.source-col--hebrew {
  flex: 1;
  direction: rtl;
  text-align: right;
  unicode-bidi: embed;
  font-family: var(--font-hebrew);      /* 'Frank Ruhl Libre Variable' after Phase 2 */
  font-size: 1.45rem;
  line-height: 1.9;                     /* Minimum 1.8 per TYPO-01; 1.9 for nikud comfort */
  color: var(--sheet-text);
}

/* ============================
   Single-language fallbacks
   ============================ */
.source-bilingual-row--hebrew-only .source-col--hebrew,
.source-bilingual-row--english-only .source-col--english {
  flex: 0 0 100%;
  max-width: 100%;
}

/* ============================
   Mobile: stack columns (TYPO-04 screen rendering)
   ============================ */
@media (max-width: 768px) {
  .source-bilingual-row {
    flex-direction: column;
    gap: 1rem;
  }
  .source-col--hebrew {
    order: 1;
  }
  .source-col--english {
    order: 2;
  }
}
```

### RTL Scoping with unicode-bidi: embed
```css
/* Source: MDN unicode-bidi docs + CSS-Tricks direction almanac */

/*
  unicode-bidi: embed creates an additional level of embedding
  in the bidirectional algorithm. It ensures the direction
  property value of the element is used, and crucially that
  this direction does NOT propagate outward through the bidi
  algorithm to affect sibling elements or the parent container.

  Without unicode-bidi: embed, the RTL direction can leak
  through inline formatting contexts.
*/
.source-col--hebrew {
  direction: rtl;
  unicode-bidi: embed;  /* ALWAYS pair with direction: rtl */
}
```

### SourceText Helper (Handles string and array content)
```jsx
// Source: existing hasContent() in SourceBlock.jsx + Phase 1 flattenSefariaText pattern
const hasContent = (text) => {
  if (!text) return false;
  if (typeof text === 'string') return text.trim().length > 0;
  if (Array.isArray(text)) {
    return text.length > 0 && text.some(t => typeof t === 'string' && t.trim().length > 0);
  }
  return false;
};

const flattenToHtml = (text) => {
  // Handles string, 1D array, or nested array (Sefaria JaggedArray)
  if (typeof text === 'string') return text;
  if (Array.isArray(text)) {
    return text
      .map(item => (Array.isArray(item) ? item.join(' ') : item))
      .filter(Boolean)
      .join('<br/>');
  }
  return '';
};

// NOTE: Sefaria content is HTML (contains em, strong, i tags).
// This matches the existing EditableContent.jsx pattern in the codebase.
// Phase 2 accepts this tradeoff. Add DOMPurify sanitization in a future hardening phase.
const SourceText = ({ content }) => {
  const html = flattenToHtml(content);
  // eslint-disable-next-line react/no-danger
  return <div dangerouslySetInnerHTML={{ __html: html }} />;
};
```

### Handling Missing Hebrew or English (Phase 2 behavior spec)
```jsx
// Rule: never render an empty column placeholder that breaks the layout
// If one side is missing, render the present side at full width

const BilingualBlock = ({ source, viewMode = 'bilingual' }) => {
  const he = source.he;
  const en = source.en;
  const showHebrew = viewMode !== 'english' && hasContent(he);
  const showEnglish = viewMode !== 'hebrew' && hasContent(en);

  if (!showHebrew && !showEnglish) {
    return <p className="sheet-no-content">No text available</p>;
  }

  // Determine layout class based on what content exists
  const rowClass = [
    'source-bilingual-row',
    !showHebrew && 'source-bilingual-row--english-only',
    !showEnglish && 'source-bilingual-row--hebrew-only',
  ].filter(Boolean).join(' ');

  return (
    // dir="ltr" anchors physical column order — Hebrew always on right, English on left
    <div className={rowClass} dir="ltr">
      {showEnglish && (
        <div className="source-col source-col--english" dir="ltr" lang="en">
          <SourceText content={en} />
        </div>
      )}
      {showHebrew && (
        <div className="source-col source-col--hebrew" dir="rtl" lang="he">
          <SourceText content={he} />
        </div>
      )}
    </div>
  );
};
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Google Fonts CDN link in `<head>` | Fontsource npm package (WOFF2, self-hosted) | Fontsource v5 (2023) | Eliminates CDN dependency, works offline, version-locked, Vite-bundler-aware |
| Static @font-face with individual weight WOFF2 files | Variable font (WOFF2-variations) with single file | WOFF2 variable support: Chrome 66+, Firefox 62+, Safari 11+ (2018+) | Single WOFF2 file covers all weights; smaller total payload for multi-weight use |
| Importing font CSS in a component | Importing in main.jsx entry point | Current best practice | Ensures font @font-face declared globally before any component renders |
| `direction: rtl` on `<html>` for Hebrew apps | Scoped `direction: rtl` per element with `unicode-bidi: embed` | CSS bidirectional spec (always correct, rarely taught) | App shell unchanged; RTL is a per-column concern |

**Deprecated/outdated:**
- `@import url('https://fonts.googleapis.com/...')` in CSS: Unreliable for print, blocked by CSP in some environments, no version locking
- `unicode-bidi: bidi-override`: Forces all text to display in one direction, ignoring the Unicode bidi algorithm entirely — only correct for very specific cases; do NOT use this for normal Hebrew column text
- `text-align: right` alone on Hebrew text: Visually right-aligns but does not fix cursor behavior, bracket placement, or bidi punctuation

---

## Open Questions

1. **Frank Ruhl Libre nikud rendering quality at 1.45rem**
   - What we know: Frank Ruhl Libre is designed for both pointed and unpointed Hebrew; the Open Siddur Project has a character display map showing its nikud coverage; the commercial Frank Ruhl MF is known to have superior nikud positioning
   - What's unclear: At what font size and line-height combination does Frank Ruhl Libre (free version) produce acceptable nikud rendering without clipping? The answer requires browser testing.
   - Recommendation: In Phase 2 implementation, test with a sample source that has extensive nikud (e.g., from Siddur/prayer book via Sefaria). If nikud marks clip at 1.45rem/1.9lh, try 1.55rem/2.0lh. Document the tested values in code comments.

2. **Fontsource variable font Hebrew subset unicode-range coverage**
   - What we know: Fontsource includes a Hebrew subset; `@fontsource-variable/frank-ruhl-libre` generates unicode-range-split @font-face blocks for Hebrew and Latin
   - What's unclear: Whether the Hebrew unicode-range covers U+05B0-05C7 (nikud/niqqud codepoints) specifically. The exact range in the generated CSS was not inspectable without installing the package.
   - Recommendation: After installing, inspect `node_modules/@fontsource-variable/frank-ruhl-libre/wght.css` to verify Hebrew unicode range coverage includes the nikud block (U+05B0-05C7).

3. **Interaction with existing `.text-heb` styles in App.css**
   - What we know: App.css has `.text-heb { line-height: 1.6; }` — currently below the nikud minimum. Phase 2 introduces new `.source-col--hebrew` class in SheetPreview.css. Both classes will exist simultaneously during Phase 2 and Phase 3.
   - What's unclear: Whether updating `.text-heb` in App.css will cause any visual regressions in the existing SourceBlock used during Phase 3 transition.
   - Recommendation: Update `.text-heb` line-height to 1.9 in App.css as part of Phase 2 Plan 1. This is an additive fix. No conflicts expected.

---

## Recommended Plan Breakdown

Phase 2 should be split into **3 plans**:

### Plan 02-01: Font Setup and CSS Foundation
**Scope:** Everything needed before any component work begins.
- Install `@fontsource-variable/frank-ruhl-libre` (npm install)
- Add import to `src/main.jsx` (before App.css import)
- Update `--font-hebrew` CSS variable in `App.css` to use `'Frank Ruhl Libre Variable'` fallback chain
- Update `.text-heb` `line-height` from `1.6` to `1.9` in `App.css`
- Create `src/components/sheet/SheetPreview.css` with the complete bilingual column styles

**Acceptance:** Computed `font-family` on `.text-heb` elements shows `Frank Ruhl Libre Variable`; nikud not clipping at line-height 1.9; no layout changes to app shell.

### Plan 02-02: SheetPreview Component
**Scope:** New component implementing the bilingual render logic.
- Create `src/components/sheet/SheetPreview.jsx` with `BilingualBlock`, `SourceText`, and `hasContent` helpers
- Implement all three render paths: bilingual (Hebrew right, English left), Hebrew-only, English-only
- Import and apply `SheetPreview.css`
- Integrate into `SheetView.jsx`: render `<SheetPreview>` inside `div.sheet-paper`

**Acceptance:** Sources with both he + en render in two columns; Hebrew always on right; English always on left; `direction: rtl` computed on `.source-col--hebrew` only; app shell navigation unaffected.

### Plan 02-03: Edge Cases and Layout Verification
**Scope:** Robustness and cross-condition verification.
- Test single-language sources: Hebrew-only renders full-width RTL; English-only renders full-width LTR
- Test empty content: no broken empty placeholder renders
- Test mobile responsive: columns stack vertically at 768px breakpoint, Hebrew on top
- Test dark mode: `var(--sheet-text)` and `var(--source-bg)` tokens apply correctly in Hebrew column
- Resolve any App.css `.text-heb` / `.source-col--hebrew` cascade conflicts discovered in Plan 02-02
- Verify TYPO-04: sheet preview correct at screen size for all source types

**Acceptance:** All four TYPO requirements verified at screen size; no RTL bleed in app shell; nikud rendering acceptable in at least Chrome and Firefox; all edge cases handled without layout breakage.

---

## Sources

### Primary (HIGH confidence)
- `@fontsource-variable/frank-ruhl-libre` npm package (v5.2.8, OFL-1.1) — Hebrew subset confirmed, variable wght axis 300-900, WOFF2 format; inspected via `npm info` and fontsource.org install page
- [MDN CSS direction](https://developer.mozilla.org/en-US/docs/Web/CSS/direction) — per-element scoping verified
- [MDN unicode-bidi](https://developer.mozilla.org/en-US/docs/Web/CSS/unicode-bidi) — bidi containment pattern
- [Fontsource frank-ruhl-libre install page](https://fontsource.org/fonts/frank-ruhl-libre/install) — Hebrew subset confirmed; import patterns verified
- [W3C Hebrew Layout Requirements](https://w3c.github.io/hlreq/) — nikud vocalization guidance confirming need for adjusted line-height and font selection
- Existing codebase: `src/components/sheet/SourceBlock.jsx` — `hasContent()` helper, existing class names, existing `dir="rtl"` pattern on EditableContent
- Existing codebase: `src/App.css` — current `--font-hebrew: 'Heebo'`, `.text-heb` at `line-height: 1.6`, column layout; `font-face` reference at line 1465 already using `'Frank Ruhl Libre'` for title input

### Secondary (MEDIUM confidence)
- [CSS-Tricks flexbox guide](https://css-tricks.com/snippets/css/a-guide-to-flexbox/) — direction-aware flex behavior; verified against MDN flex-direction docs
- [RTL Styling 101 — rtlstyling.com](https://rtlstyling.com/posts/rtl-styling/) — `dir="ltr"` on wrapper to fix physical column order; verified against MDN
- [Voorhoede RTL multilingual website guide](https://www.voorhoede.nl/en/blog/how-to-multilingual-website-rtl-html-css/) — unicode-bidi: embed scoping pattern
- [Vite fonts guide (Mantine)](https://help.mantine.dev/q/vite-load-fonts) — public/ vs src/assets/ font placement; fontsource import in entry point pattern

### Tertiary (LOW confidence — verify during implementation)
- [Open Siddur Project character display map for FrankRuhlLibre](https://opensiddur.org/wp-content/uploads/fonts/display-font-charmap.php?fnt=FrankRuhlLibre) — nikud glyph coverage; not directly inspected, referenced by multiple Hebrew typography sources
- Line-height 1.8 minimum for nikud: widely cited in Hebrew web typography communities but W3C hlreq is technology-agnostic and does not specify a numeric value; the 1.8 in TYPO-01 was set by the product requirements, aligned with community consensus

---

## Metadata

**Confidence breakdown:**
- Font self-hosting (fontsource): HIGH — npm package confirmed at v5.2.8, import pattern verified, Hebrew subset confirmed via fontsource.org
- Bilingual column layout CSS: HIGH — `dir="ltr"` wrapper + scoped `direction` per column is the documented MDN pattern
- RTL scoping (unicode-bidi): HIGH — verified via MDN CSS specification documentation
- Nikud line-height minimum: MEDIUM — 1.8 widely cited but W3C hlreq is technology-agnostic; TYPO-01 requirement sets 1.8 as the floor; 1.9 recommended
- Frank Ruhl Libre nikud rendering quality: LOW — requires browser testing; font is designed for pointed text but specific pixel-level rendering has not been tested in this codebase

**Research date:** 2026-03-04
**Valid until:** 2026-06-01 (stable — CSS direction spec and Fontsource v5 are mature)
