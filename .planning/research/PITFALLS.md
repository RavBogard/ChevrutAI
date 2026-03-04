# Pitfalls Research

**Domain:** Hebrew/English bilingual document editor and PDF exporter (Jewish text sheet maker)
**Researched:** 2026-03-04
**Confidence:** MEDIUM-HIGH — Core pitfalls verified across multiple sources; Sefaria rate limits LOW (undocumented)

---

## Critical Pitfalls

### Pitfall 1: Hebrew Vowel Points (Nikud) Break PDF Line Height

**What goes wrong:**
When printing or exporting to PDF, Hebrew text with nikud (vowel diacritics — שָׁלוֹם vs שלום) causes lines to visually collide. Combining diacritic characters extend above and below the baseline, and if `line-height` is set for standard Latin text, adjacent lines of biblical Hebrew will overlap and become unreadable. This is a known LibreOffice bug and also affects browser print.

**Why it happens:**
Nikud are Unicode combining marks attached above and below the base letter. Standard CSS and PDF renderers size line boxes around the em square, not the actual rendered glyph height. Latin-tuned `line-height: 1.5` is typically insufficient for Hebrew with nikud.

**How to avoid:**
- Set `line-height: 2` or higher on all Hebrew text containers (test both pointed and unpointed text).
- Use fonts that include proper OpenType GPOS mark-positioning tables: Frank Ruhl Libre, Ezra SIL, or Noto Naskh Arabic / Noto Sans Hebrew.
- Test the PDF export with actual pointed Hebrew (Talmud, Chumash with nikud) during Phase: PDF Export, not after.
- Embed fonts explicitly — do not rely on system fonts in PDF generation, as Hebrew-capable fonts may not be installed on user machines.

**Warning signs:**
- Nikud marks visually overlap into the line above or below in browser preview.
- Hebrew looks fine in sans-serif but broken when font is switched to serif (Frank Ruhl Libre).
- PDF screenshots show diacritics cut off at paragraph boundaries.

**Phase to address:** PDF Export phase — must be validated against real biblical texts with nikud before shipping.

---

### Pitfall 2: html2pdf / Canvas-Based PDF Loses Text Searchability and Scales Incorrectly

**What goes wrong:**
The existing codebase has `html2pdf` in its deps and PROJECT.md proposes using it for PDF export. html2pdf renders via html2canvas, which takes a bitmap screenshot of the DOM and embeds it as an image in the PDF. Three concrete failures result: (1) text is not selectable or searchable in the PDF, (2) Hebrew RTL rendering may appear correct visually but the underlying text layer is gone, and (3) large content areas can hit canvas height limits in browsers — especially iOS Safari — causing the bottom of the sheet to render blank.

**Why it happens:**
html2canvas rasterizes the page at a fixed pixel resolution. The resulting PDF is an image, not a text document. Canvas pixel limits in browsers (typically ~16,384px height) cause clipping on multi-source sheets.

**How to avoid:**
- Use browser native `window.print()` with a dedicated `@media print` stylesheet as the primary path — this preserves text, respects RTL correctly, and has no canvas limits. It is the correct approach for a "synagogue handout" use case.
- If a true PDF file download is required (not just print), investigate `@page` CSS rules combined with `window.print()` — this is the most reliable approach for bilingual RTL/LTR documents.
- If a downloadable PDF binary is required (e.g., for "Download PDF" button), evaluate `react-pdf` (renders from a component tree, not canvas) or Puppeteer server-side rendering as alternatives to html2canvas.
- Explicitly not recommended: using jsPDF's native text rendering for Hebrew — GitHub issues from December 2024 confirm broken BiDi support for mixed Hebrew/English in jsPDF even with `setLanguage("he")`.

**Warning signs:**
- "Download PDF" works for 2-source sheets but clips content on 8+ source sheets.
- PDF opens in Adobe Reader but text cannot be selected.
- Hebrew appears RTL in browser but LTR (or garbled) in the downloaded file.

**Phase to address:** PDF Export phase — decision on rendering strategy must be made before implementation begins. Do not default to html2pdf without testing canvas size limits with a 10-source sheet.

---

### Pitfall 3: Sefaria API Text Field Structure Is Inconsistently Nested

**What goes wrong:**
The Sefaria API returns text in a nested array structure that varies by source type. Simple texts (Tanakh books) return `["verse1", "verse2"]`. Chapter ranges return `[["v1", "v2"], ["v3"]]`. Complex texts (Abarbanel, some commentaries) return SchemaNode structures that error if requested as a whole document. If the code treats `text` as always a flat array of strings, it silently shows partial content or crashes on Talmud/commentary sources.

The existing `sefaria.js` in the codebase already has Levenshtein fuzzy matching and retry logic — but the CONCERNS.md notes this is untested. The nested array normalization is a fragile area with no test coverage.

**Why it happens:**
Sefaria models texts structurally — some books have chapters-within-chapters, some have sub-commentaries. The API reflects this structure directly. There is no single normalized response shape.

**How to avoid:**
- Write a recursive `flattenSefariaText(text)` utility that handles: string, `string[]`, `string[][]`, and `string[][][]` uniformly, joining with a separator that preserves paragraph breaks.
- For complex texts that return `{ "error": "..." }`, fall back to requesting smaller ranges (chapter by chapter) using the `next` field in the API response.
- Add test coverage for `resolveSefariaRef()` and text normalization with at least five representative real-world refs: one Tanakh verse, one Mishnah passage, one Gemara sugya, one Rashi comment, one Zohar passage.
- Note: entire-chapter refs have no second value in `sections`/`toSections` — this is documented but a common off-by-one source.

**Warning signs:**
- Sheet displays `[object Object]` or `undefined` for some sources.
- Hebrew displays fine but English text is blank even though the source has a translation.
- Certain source types (Zohar, Abarbanel) reliably fail while Tanakh works.

**Phase to address:** Core Editor phase — before any new feature is added, stabilize and test the Sefaria fetch + text normalization pipeline.

---

### Pitfall 4: Firestore Schema Migration Breaks Existing Sheets Without a Compatibility Layer

**What goes wrong:**
The existing `sheets` collection stores `{ id, ownerId, title, sources, updatedAt, createdAt, googleDocId }`. When the rebuild adds new fields (e.g., `isPublic`, `shareToken`, `schemaVersion`, richer `sources` objects with translation cache), old documents lack these fields. If the UI reads `sheet.isPublic` and gets `undefined`, the public sharing UI silently breaks. If `sources` object shape changes, old sources may fail to render.

**Why it happens:**
Firestore is schemaless. There is no migration system. Old documents coexist with new ones indefinitely. Code written against the new schema simply finds `undefined` on old docs.

**How to avoid:**
- Implement a schema version field (`schemaVersion: 1`) and a client-side migration function that upgrades old documents as they are read.
- Use defensive defaults everywhere: `sheet.isPublic ?? false`, `source.aiTranslation ?? null`.
- Do not add required fields to the `sources` array objects without providing defaults — sources is an array and each element must be backward-compatible.
- Before adding a new required field, backfill it in a migration script using the Firebase Admin SDK, tested on the Firestore emulator first.
- Export a Firestore backup before any migration run.
- Limit migration writes to 500 per batch to respect Firestore transaction limits.

**Warning signs:**
- Sheets created before the rebuild render without errors but show blank state for new features.
- Old sheets cause `Cannot read properties of undefined` errors in the console.
- User reports: "my old sheets are broken."

**Phase to address:** Data Migration phase — must be explicitly scoped as a phase before new schema-dependent features ship. The Firestore structure must be versioned from day one of the rebuild.

---

### Pitfall 5: AI Translation Fabricates Plausible-Sounding But Incorrect Translations of Religious Texts

**What goes wrong:**
When a Sefaria source has no English translation (`text` field is empty), ChevrutAI will call Gemini to produce one. LLMs — including Gemini — hallucinate when translating classical Jewish texts. They produce fluent English that sounds authoritative but misrepresents the Hebrew, introduces anachronistic theological framing, confuses grammatical constructions in Biblical Hebrew, or silently transposes the meaning of key terms (e.g., rendering נפש as "soul" in a context where "life-force" is the correct interpretation for the specific text).

**Why it happens:**
LLMs are trained on diverse internet content that includes many conflicting translations and commentaries. They have no authoritative single source to anchor to. They will not say "I don't know" — they will produce confident text. For rare texts not well-represented in training data, hallucination rate increases significantly.

**How to avoid:**
- Display AI-translated text with a visible, non-dismissable disclaimer: "AI Translation — not reviewed by a human. Verify before using in teaching."
- Store AI translations in Firestore attached to the source (`source.aiTranslation`) and never overwrite the Sefaria `text` field.
- Use a prompt that explicitly instructs Gemini to: (a) translate literally, (b) preserve technical terms untranslated with a note, (c) output a confidence indicator, and (d) flag if the text appears to be in Aramaic rather than Hebrew — LLMs frequently confuse the two in Talmudic passages.
- For Aramaic-heavy texts (Talmud Bavli, Zohar), add an explicit note in the UI that AI translation quality is lower and verification is required.
- Do not automatically trigger translation — require explicit user action to request it.

**Warning signs:**
- Generated translation sounds smooth and fluent but diverges from established translations in ways the AI is confident about.
- Users with Hebrew knowledge notice significant errors; users without do not.
- Gemini returns a translation for a reference that, on inspection, is entirely in Aramaic — and the translation is plausible Hebrew-to-English but wrong.

**Phase to address:** AI Translation phase — the prompt engineering and disclaimer UI must be part of the implementation spec, not added later.

---

### Pitfall 6: RTL/LTR Side-by-Side Column Layout Breaks in Unexpected Print/PDF Contexts

**What goes wrong:**
The intended layout is Hebrew (RTL) in the right column, English (LTR) in the left column. In screen CSS, CSS Flexbox or Grid handles this. But when printing or generating a PDF, the column layout can collapse — especially if the Hebrew text is significantly taller due to nikud line height, causing misaligned columns that make the sheet look broken. Additionally, mixed-direction text within a single block (e.g., a source with an English title embedded in a Hebrew sentence) can render in the wrong reading order.

**Why it happens:**
Print CSS has limited support for some layout features, especially complex Flexbox behaviors with `@media print`. BiDi text algorithm applies Unicode directional rules at the character level, but CSS `direction` and HTML `dir` attributes must be set explicitly at each element boundary for correct behavior.

**How to avoid:**
- Use HTML `dir="rtl"` attribute on Hebrew text containers (not CSS `direction` alone) — this is the W3C recommendation and also works when CSS fails.
- Use CSS logical properties (`margin-inline-start`, `padding-inline-end`) instead of hard-coded `left`/`right` values in the bilingual layout, so direction-awareness is built in.
- Test the print layout explicitly with `@media print` styles, using a real browser print dialog (not just screen view), before considering PDF export done.
- For the side-by-side column layout, use a `<table>` for print rather than Flexbox — tables have better cross-browser print support and do not collapse columns.
- Wrap English words or phrases embedded in Hebrew text in `<span dir="ltr">` to prevent BiDi algorithm from placing them in the wrong visual position.

**Warning signs:**
- Screen view looks correct; print preview collapses columns into a single column.
- Hebrew and English blocks of the same source have different heights, causing the layout to appear misaligned when printed.
- English words embedded in Hebrew paragraphs appear on the wrong side of the line.

**Phase to address:** Sheet Layout / PDF Export phase — test with print dialog before calling layout "done."

---

## Technical Debt Patterns

Shortcuts that seem reasonable but create long-term problems.

| Shortcut | Immediate Benefit | Long-term Cost | When Acceptable |
|----------|-------------------|----------------|-----------------|
| Keeping `useSheetPersistence` monolith (744 lines) unchanged during rebuild | No refactor time spent | Adding PDF export, public sharing, AI translation all touches this one hook — bugs compound | Never: extract before adding new features |
| Using in-memory rate limiting for AI translation API | No Redis/KV setup required | Cold starts reset limits; one abusive user can exhaust Gemini quota for everyone | MVP only — add persistent rate limiting before public launch |
| Auto-triggering AI translation on empty `text` field | Seamless UX, no user action required | Every sheet load with untranslated sources costs tokens; hallucinated translations appear without user intent | Never: require explicit user action |
| Reusing existing `useFirestore.js` (deprecated hook) | No refactor time | Dead code + active code diverge, data loss risk on write conflicts | Never: verify and remove before rebuild |
| Skipping font embedding in PDF and relying on user's system fonts | Simpler PDF generation code | Hebrew fonts rarely installed on Windows machines; PDFs look broken for most users | Never: always embed fonts |
| Using `allow read: if true` for public sheets at collection level | Simple security rule | Exposes all sheets to anonymous reads, including private user data | Never: scope to `isPublic == true` on individual documents |

---

## Integration Gotchas

Common mistakes when connecting to external services.

| Integration | Common Mistake | Correct Approach |
|-------------|----------------|------------------|
| Sefaria API | Assuming `text` (English) field always has the same structure as `he` (Hebrew) field | Check both fields independently; `text` can be `""`, `[]`, `[[]]`, or `null` depending on source and translation availability |
| Sefaria API | Requesting an entire complex text (e.g., Abarbanel) in one call | API returns an error; use the `next` field to paginate through chunks; detect complex texts by checking for SchemaNode structure |
| Sefaria API | Treating `sections` as always having two values for chapter+verse refs | Entire-chapter refs have no second value in `sections` — parse defensively |
| Sefaria API | No rate limit documentation found — unknown threshold | Add client-side request throttling and exponential backoff; do not make concurrent bulk requests; use Sefaria's data dumps for batch operations |
| Gemini API | Sending full 10-message chat history on every translation request | Translation requests are stateless — send only the source text and prompt, no history, to minimize tokens and latency |
| Gemini API | Rate limiting resets on Vercel cold start (in-memory) | Current architecture has this flaw documented in CONCERNS.md — do not ship AI translation without persistent rate limiting |
| Firestore | `onSnapshot()` subscription not cleaned up when component unmounts during autosave | `mountedRef` pattern exists in codebase but is noted as incomplete — verify cleanup on all async paths before adding new subscriptions |
| Firestore | Security rules `allow read: if true` applied at collection level for public sharing | Scope public read to documents where `isPublic == true` using `resource.data.isPublic` field check |

---

## Performance Traps

Patterns that work at small scale but fail as usage grows.

| Trap | Symptoms | Prevention | When It Breaks |
|------|----------|------------|----------------|
| Fetching all user sheets in memory, filtering client-side | Sheet list loads slowly for power users with 50+ sheets | Add Firestore `where('ownerId', '==', uid)` index + pagination (already identified in CONCERNS.md) | At ~30-50 sheets per user |
| Making one Sefaria API call per source when adding multiple sources at once | Sheet feels sluggish when AI suggests 5+ sources and user adds them all | Debounce bulk adds; resolve refs sequentially not concurrently to avoid rate issues | At 3+ simultaneous source additions |
| Canvas-based PDF generation (html2canvas) for sheets with many sources | PDF bottom is clipped blank; browser tab may crash | Switch to `window.print()` or server-side rendering; canvas has ~16K px height limit | At ~8-10 sources per sheet |
| Sending full message history to AI chat on every message (10 messages kept) | Gemini token costs increase; latency increases for long sessions | Trim to 3-5 messages; summarize older context | At conversation length ~10 messages |
| Storing AI-generated translations in component state only | Translation is lost on page refresh; user has to request again | Cache in Firestore on the source object (`source.aiTranslation`) | Every page refresh |

---

## Security Mistakes

Domain-specific security issues beyond general web security.

| Mistake | Risk | Prevention |
|---------|------|------------|
| Public sharing implemented with `allow read: if true` at collection level | All private user sheets become publicly readable | Use per-document `isPublic` field; write rule as `allow read: if resource.data.isPublic == true \|\| request.auth.uid == resource.data.ownerId` |
| Anonymous Firebase users pass `auth != null` security rule check | Users without accounts could read protected content if rule only checks `auth != null` | Always check `request.auth.uid == resource.data.ownerId` for private data, not just `auth != null` |
| AI translation API endpoint has no persistent rate limiting | Single user can exhaust Gemini quota; cost spike with no ceiling | Replace in-memory rate limiting with KV-store (Vercel KV or Upstash Redis) before adding translation endpoint |
| Full Google Drive OAuth scope (`auth/drive`) requested for Docs export | Excessive permissions — user is granting full Drive access for a narrow feature | Switch to `auth/drive.file` scope, which only allows access to files created by the app |
| XSS in custom commentary blocks rendered as HTML | User-authored content could inject scripts | Use DOMPurify on all user-supplied HTML before render — identified in CONCERNS.md but not yet fixed |

---

## UX Pitfalls

Common user experience mistakes in this domain.

| Pitfall | User Impact | Better Approach |
|---------|-------------|-----------------|
| Showing AI translation without clear attribution | Rabbis and educators may use hallucinated translations in teaching, attribute them to Sefaria, and damage trust in the product | Non-dismissable "AI Translation" badge on every AI-generated text block |
| Triggering AI translation automatically for every untranslated source on sheet load | Token cost + latency + hallucination risk for content user may not care about | On-demand only: explicit "Translate with AI" button per source |
| Side-by-side layout with equal-width columns | Hebrew often much shorter than English (or vice versa for poetic texts); equal columns leave large whitespace | Allow column width adjustment; default to Hebrew column being slightly narrower (Hebrew is more information-dense) |
| No indication of which sources lack English translation before adding to sheet | User builds a 10-source sheet only to discover 6 have no translation | Show a "No English translation" indicator in the Sefaria search results before adding |
| Public share link that mirrors the editor URL | Users expect a clean read-only view, not an editor interface | Build a distinct `/sheet/:id/view` route with print-optimized, non-editable layout |
| Stripping all formatting when migrating from old to new sheet data model | Old sheets may have rich text in custom commentary blocks; stripping it removes user work | Preserve raw content and map to new rich text format; test with a real saved sheet before migration |

---

## "Looks Done But Isn't" Checklist

Things that appear complete but are missing critical pieces.

- [ ] **Hebrew PDF export:** Verify with a real Talmud passage containing nikud — if line heights overlap, it is not done
- [ ] **Side-by-side layout:** Test with print dialog in Chrome, Firefox, and Safari before calling done — Flexbox collapses in some print modes
- [ ] **AI translation:** Verify the disclaimer UI appears on every AI-translated block, even after save/reload
- [ ] **Public sharing:** Verify a logged-out browser cannot read private sheets — test with Firebase Rules Simulator
- [ ] **Public sharing:** Verify that the share URL renders a read-only view, not the editor
- [ ] **Firestore migration:** Open an existing saved sheet in the new UI and verify every field renders correctly — test with a sheet created before any schema changes
- [ ] **Sefaria text normalization:** Test adding a Zohar passage, a Mishnah with Rashi commentary, and a Talmud Bavli sugya — these three cover the three major array nesting depths
- [ ] **Rate limiting for AI translation:** Verify rate limiting persists across serverless cold starts — fire 25 requests in 60 seconds and confirm the 21st is rejected
- [ ] **Font embedding in PDF:** Open the PDF on a machine without Hebrew fonts installed — text should still render correctly

---

## Recovery Strategies

When pitfalls occur despite prevention, how to recover.

| Pitfall | Recovery Cost | Recovery Steps |
|---------|---------------|----------------|
| Nikud line heights broken in shipped PDF | MEDIUM | Ship CSS-only hotfix; add `line-height: 2.2` to Hebrew text containers; no data changes needed |
| AI translation hallucination discovered in production | LOW (if disclaimer present) | Disclaimer already visible; add a "Report translation issue" link; no data migration needed since AI translations are stored separately |
| Firestore schema change breaks old sheets | HIGH | Restore from backup; write lazy migration in client code to upgrade old docs on read; test in emulator before re-deploying |
| Public sharing security rule misconfiguration exposes private sheets | HIGH | Immediately tighten security rules (propagates in ~1 minute, full propagation up to 10 minutes); audit Firestore logs for unauthorized reads; notify affected users |
| Canvas PDF clips content for large sheets | LOW | Ship window.print() as fallback immediately; canvas approach was the wrong choice — redirect to print dialog |
| Sefaria API returns error for complex text request | LOW | Handle error gracefully in UI; show "Source too large — please add a specific chapter reference" message |

---

## Pitfall-to-Phase Mapping

How roadmap phases should address these pitfalls.

| Pitfall | Prevention Phase | Verification |
|---------|------------------|--------------|
| Nikud breaks PDF line height | PDF Export phase | Test with Shema (pointed) + unpointed Talmud text; check printed page visually |
| html2canvas canvas size limits | PDF Export phase (strategy decision) | Test with 10-source sheet before building; decide approach before implementation |
| Sefaria nested text array normalization | Core Editor phase (data layer) | Test with 5 representative source types; add unit tests for `flattenSefariaText()` |
| Firestore schema migration breaks old sheets | Data Migration phase (explicit phase before new features) | Open old sheet in new UI before marking phase complete |
| AI translation hallucination | AI Translation phase | Ship with disclaimer; validate prompt against 3 Aramaic texts |
| RTL/LTR layout collapses in print | Sheet Layout phase + PDF Export phase | Test print dialog in 3 browsers before marking layout done |
| Public sharing security rules | Public Sharing phase | Run Firebase Rules Simulator with anonymous user against private sheet |
| XSS in user-authored commentary | Core Editor phase | Integrate DOMPurify when implementing rich text commentary blocks |
| In-memory rate limiting resets | AI Translation phase | Add persistent rate limiting before shipping AI translation endpoint |
| Google Drive full-scope OAuth | Out of scope (Google Docs export is not in active requirements) | N/A — remove or restrict if re-introduced |

---

## Sources

- [Sefaria Developer Documentation](https://developers.sefaria.org/docs/welcome) — API structure and edge cases (MEDIUM confidence — official but limited on rate limits)
- [Sefaria API Documentation wiki](https://github.com/Sefaria/Sefaria-Project/wiki/API-Documentation/948bb3dcf283653163a2d0a6b88dca152cabaf76) — Nested array structure, complex texts, sections gotchas (MEDIUM confidence — official)
- [Working with Sefaria's API: Practical Tips](https://www.ezrabrand.com/p/working-with-sefarias-api-practical) — Off-by-one, partial returns, zero-indexing (MEDIUM confidence — practitioner article)
- [From Hallucination to Precision: Sefaria MCP](https://www.ezrabrand.com/p/from-hallucination-to-precision-how) — AI hallucination on Hebrew religious texts (MEDIUM confidence — practitioner article)
- [jsPDF Hebrew issue #3807](https://github.com/parallax/jsPDF/issues/3807) — jsPDF Hebrew rendering broken as of December 2024 (HIGH confidence — official GitHub issue)
- [react-pdf Hebrew issue #3010](https://github.com/diegomura/react-pdf/issues/3010) — react-pdf Hebrew rendering issues (HIGH confidence — official GitHub issue)
- [react-pdf Hebrew issue #732](https://github.com/diegomura/react-pdf/issues/732) — Additional react-pdf RTL issues (HIGH confidence — official GitHub issue)
- [html2pdf.js documentation](https://ekoopmans.github.io/html2pdf.js/) — Canvas-based approach and limitations (HIGH confidence — official)
- [Creating PDFs from HTML + CSS: What actually works](https://joyfill.io/blog/creating-pdfs-from-html-css-in-javascript-what-actually-works) — HTML-to-PDF strategy comparison (MEDIUM confidence — practitioner article)
- [Complete Guide to RTL Layout Testing](https://placeholdertext.org/blog/the-complete-guide-to-rtl-right-to-left-layout-testing-arabic-hebrew-more/) — RTL CSS pitfalls (MEDIUM confidence — practitioner article)
- [RTL Styling 101](https://rtlstyling.com/posts/rtl-styling/) — CSS logical properties, bidi issues (MEDIUM confidence — practitioner reference)
- [W3C: Structural markup and RTL text in HTML](https://www.w3.org/International/questions/qa-html-dir) — `dir` attribute vs CSS `direction` (HIGH confidence — W3C official)
- [Microsoft: Developing OpenType Fonts for Hebrew Script](https://learn.microsoft.com/en-us/typography/script-development/hebrew) — Nikud positioning, GPOS tables (HIGH confidence — official)
- [Firebase: Fix insecure rules](https://firebase.google.com/docs/firestore/security/insecure-rules) — `allow read: if true` pitfalls (HIGH confidence — official Firebase docs)
- [Firebase: Secure data access for users and groups](https://firebase.google.com/docs/firestore/solutions/role-based-access) — RBAC patterns for sharing (HIGH confidence — official Firebase docs)
- [Firebase: Best practices for Cloud Firestore](https://firebase.google.com/docs/firestore/best-practices) — 500/50/5 ramp-up rule, hotspotting (HIGH confidence — official Firebase docs)
- [How to handle Firestore data migration and schema evolution](https://bootstrapped.app/guide/how-to-handle-firebase-firestore-data-migration-and-schema-evolution) — Schema versioning, lazy migration (MEDIUM confidence — practitioner guide)
- [Schema Versioning with Google Firestore](https://www.captaincodeman.com/schema-versioning-with-google-firestore) — Version field pattern (MEDIUM confidence — practitioner article)
- [Real Cost of AI Translations](https://crowdin.com/blog/ai-translation-cost) — Cost estimates, glossary context cost multiplier (MEDIUM confidence — industry data)
- [Best LLMs for Translation in 2025](https://www.getblend.com/blog/which-llm-is-best-for-translation/) — Gemini mid-range quality, consistent error patterns (MEDIUM confidence — industry benchmark)

---
*Pitfalls research for: Hebrew/English bilingual document editor and PDF exporter (ChevrutAI)*
*Researched: 2026-03-04*
