# Feature Research

**Domain:** Jewish text sheet maker (rabbis and educators)
**Researched:** 2026-03-04
**Confidence:** MEDIUM — Sefaria's sheet maker features confirmed via multiple sources; educator pain points confirmed via JTA reporting and official Sefaria help docs; some gaps in direct rabbi interview data.

---

## Context: What a Source Sheet Actually Is

A source sheet (daf mekoros) is the foundational artifact of Jewish pedagogy. Physical format conventions established over 70+ years of mimeograph/photocopy culture:

- Layers primary sources (Torah, Talmud, Midrash) with secondary commentary (Rishonim, Acharonim) and modern writings
- Organized around a central theme or question for guided discussion
- Functions as a "set list" — more material than one session can cover
- Read/discussed in chavruta pairs before group discussion
- Hebrew on right column, English on left — this is the synagogue standard, not a preference
- Attribution matters: source citation (book, chapter, verse) is required in religious scholarship contexts
- Creator attribution is expected (rabbi name appears on sheet)

**Implication for ChevrutAI:** We are not building a general document editor. We are building an artifact that has 70 years of convention. Every design decision must honor that convention or have a strong reason to break it.

---

## Competitive Baseline: What Sefaria's Sheet Maker Provides

Sefaria is the incumbent. Understanding what it does sets the floor for table stakes and reveals the gaps ChevrutAI exploits.

**Sefaria has:**
- Source search and add (Hebrew + English from their library)
- Bilingual layout: Hebrew/English side-by-side OR stacked
- langLayout control: heRight (standard) or heLeft
- Source numbering, boxing, indentation (3 levels)
- Custom text/commentary blocks between sources
- Images, video, MP3 embeds
- Divine Name display preferences
- Nekkudot (vowel marks) removal per source
- ב"ס (Bezrat Hashem) header option
- Collections for organizing related sheets
- Public sharing via URL
- Copy another user's sheet as a starting point
- Export to Google Docs (for better printing)
- Print via browser (inconsistent)
- PDF via browser print-to-PDF (indirect, unreliable)
- Social discovery on "Voices on Sefaria"

**Sefaria does NOT have (confirmed gaps):**
- Direct PDF export button with reliable output
- Page break control in print view
- Mobile app sheet editing (browser only)
- AI source suggestions from topic description
- AI translation for untranslated texts
- Consistent cross-browser print/PDF output
- A workflow optimized for speed (it is discovery-first, not creation-first)
- Beautiful, designed output — it looks like a web page printed, not a handout designed for print

---

## Feature Landscape

### Table Stakes (Users Expect These)

Features users assume exist. Missing these = product feels incomplete.

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Sefaria text search and add | Core value — can't function without it | LOW | Already built; needs UI polish |
| Hebrew + English bilingual display | 70+ years of convention; users will leave without it | MEDIUM | heRight standard; side-by-side layout; already partial in codebase |
| Correct Hebrew typography | Nikud must render; wrong fonts look unprofessional | MEDIUM | Frank Ruhl Libre or David Libre; must embed in PDF output too |
| RTL rendering | Hebrew is RTL; broken RTL kills credibility with users | MEDIUM | CSS `dir="rtl"`, font must support it |
| Custom text/commentary blocks | Educators add their own words between sources — always | LOW | Already built; ensure it persists in new UI |
| Section headers and dividers | Structure multi-part shiurim | LOW | Simple UI add; critical for usability |
| Source citation display | Rabbi/educator credibility depends on accurate attribution | LOW | Sefaria API returns this; must display book, chapter, verse |
| Reorder sources (drag-and-drop) | Every teacher reorders their set list | MEDIUM | Already built; keep working through rebuild |
| Save and resume | Sheets take days to build; autosave is required | LOW | Already in Firestore; preserve through rebuild |
| Multiple sheets (sheet library) | Rabbis have dozens of sheets for different occasions | LOW | Already built; needs search/filter added |
| Sheet title editing | Every sheet needs a name | LOW | Already built |
| Undo/redo | Text editing without undo is unacceptable | MEDIUM | Already built but fragile (see CONCERNS.md) |
| Public share via URL | Educators send sheet links to students before class | LOW | Must be implemented; not in current codebase |
| High-quality PDF export | Physical handouts are still the norm in many synagogues | HIGH | Core gap vs Sefaria; react-to-print preferred approach for Hebrew RTL |
| Print-optimized layout | Page breaks must be predictable; no cut-off sources | HIGH | CSS `@media print` with careful page-break-avoid rules |
| Creator attribution | Rabbis put their name on their sheets — always | LOW | Simple field; must appear on printed output |

---

### Differentiators (Competitive Advantage)

Features that set ChevrutAI apart. Not required by baseline expectations, but create strong preference over Sefaria.

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| AI translation for untranslated sources | Sefaria has many texts with no English — blocks educators who need bilingual | HIGH | Gemini already wired; trigger on empty `text` field; user-initiated per source; must be flagged as AI-generated |
| AI topic-to-sources suggestions | From "I'm teaching about teshuvah" → ranked source list | HIGH | Sefaria Topics API + Gemini ranking; most time-consuming part of sheet creation is finding sources |
| Beautiful synagogue handout aesthetic | Sefaria sheets look like web pages printed; ours looks like a designed handout | MEDIUM | Typography-first design; Frank Ruhl Libre for Hebrew, a clean serif for English; proper spacing; NOT just a browser print |
| Reliable one-click PDF with Hebrew | Sefaria's PDF is indirect and inconsistent; educators hate this | HIGH | react-to-print inherits CSS RTL; needs careful `@media print` styling; this is a true differentiator |
| Fast creation workflow | Sefaria is discovery-first; our workflow is creation-first (topic → sheet) | MEDIUM | Minimize clicks between idea and finished sheet; AI suggestions reduce research time |
| Preserved sheets with new UI | Educators already have ChevrutAI sheets — continuity matters | MEDIUM | Firestore data migration/compatibility must be maintained |
| Commentary-aware layout | Clearly distinguish Sefaria source text from educator's own commentary visually | LOW | Visual design: different font weight, background, or indentation for custom blocks |
| Sheet search/filter | Users with 20+ sheets need to find "that Shabbat Teshuvah sheet I made in 2024" | LOW | Simple text search over sheet titles and metadata; Sefaria does not have this for personal library |
| AI translation labeled as AI | Builds trust with scholars who need to know provenance | LOW | Badge or note: "AI translation — verify before distribution" |

---

### Anti-Features (Commonly Requested, Often Problematic)

Features that seem good but create problems in v1. Explicitly out of scope.

| Feature | Why Requested | Why Problematic | Alternative |
|---------|---------------|-----------------|-------------|
| Real-time collaborative editing | "Google Docs for Torah" sounds great | Requires WebSocket infrastructure, conflict resolution, presence indicators — massive complexity for a v1 product used primarily by solo educators | Share via public URL; educators work solo and share finished sheets |
| Non-Sefaria text sources (manual import, web scraping) | "I want to paste in a quote from a book" | Copyright landmines; quality control nightmare; Sefaria coverage is vast enough for v1 | Custom text blocks already cover educator's own words |
| Social features (likes, comments, follows) | Sefaria has public sheets; social discovery seems logical | Adds content moderation burden; not why rabbis choose a tool; dilutes focus | Public share URL is sufficient; let Sefaria be the discovery network |
| AI auto-drafting full sheets | "Have AI write my shiur" | Religious educators need to own their content intellectually and halachically; AI-drafted liturgical content raises authenticity concerns | AI suggests sources; human assembles and edits — this is the right split |
| Version history / git-like branching | Power users ask for this | Complexity out of proportion to usage; 50-item undo is enough for a session | Undo/redo for session; autosave for persistence |
| Multiple translation versions per source | Sefaria offers many translations | UI complexity; creates "which translation is right" debates | Pick one translation per source; display AI translation as an alternative with clear labeling |
| Paid tiers / feature gating | Revenue sustainability | Explicitly out of scope in PROJECT.md | Free for everyone in v1 |
| Mobile app (iOS/Android native) | Mobile is popular | React web is already mobile-browser capable; native app doubles development surface; Sefaria doesn't have mobile sheet editing either | Ensure web editor is usable on tablet; phone editing is a v2 problem |

---

## Feature Dependencies

```
[Sefaria search]
    └──required by──> [Add source to sheet]
                          └──required by──> [Bilingual layout]
                          └──required by──> [PDF export]
                          └──required by──> [AI translation]

[Sheet saved to Firestore]
    └──required by──> [Public share URL]
    └──required by──> [Sheet library / user history]

[AI translation]
    └──enhances──> [PDF export] (bilingual PDF with AI-filled translations)

[AI topic suggestions]
    └──enhances──> [Add source to sheet] (faster sourcing workflow)

[Bilingual layout with correct Hebrew typography]
    └──required by──> [Print-optimized PDF] (RTL must be right before PDF works)

[Custom text/commentary blocks]
    └──enhances──> [Section headers] (both are "author's own content" types)

[Section headers]
    └──enhances──> [Print-optimized PDF] (headers anchor page break logic)
```

### Dependency Notes

- **AI translation requires Source added to sheet:** Translation is triggered per-source after the source is on the sheet.
- **PDF export requires bilingual layout working correctly:** If Hebrew RTL is broken in the editor view, it will be broken in the PDF. Fix typography first, PDF second.
- **Public share URL requires Firestore persistence:** The sheet must have a stable ID in Firestore before a public URL can point to it.
- **AI topic suggestions enhances but does not require the core sheet:** It is additive; sheets can be built without it.
- **Print-optimized layout conflicts with rich text embedding (images, video):** Video and audio cannot appear in a PDF. Either hide non-printable elements in print view, or warn the user. Do not try to print video.

---

## MVP Definition

### Launch With (v1 — this milestone)

Minimum needed to outperform Sefaria for the core use case: rabbi builds a beautiful print-ready sheet in minutes.

- [ ] Sefaria text search and add — why essential: core value delivery
- [ ] Hebrew/English bilingual display (side-by-side, heRight default) — why essential: 70 years of convention
- [ ] Correct Hebrew typography (Frank Ruhl Libre) rendering in editor and PDF — why essential: credibility
- [ ] Custom text/commentary blocks — why essential: every educator adds their own words
- [ ] Section headers and dividers — why essential: structure multi-part sheets
- [ ] Drag-and-drop reorder — why essential: educators iterate their set list constantly
- [ ] Autosave to Firestore — why essential: sheets take days; data loss is unforgivable
- [ ] High-quality PDF export (one click, reliable, Hebrew RTL correct) — why essential: physical handouts; the #1 Sefaria complaint
- [ ] Public share URL — why essential: educators send links to students; Sefaria has this
- [ ] AI translation per source (on demand) — why essential: many Sefaria texts have no English; this is a true ChevrutAI differentiator
- [ ] AI topic-to-source suggestions — why essential: cuts research time from hours to minutes; core AI value prop
- [ ] Sheet library with search/filter — why essential: educators have many sheets; basic organization is expected
- [ ] Creator attribution field (name on sheet and PDF) — why essential: professional norm in rabbinic scholarship

### Add After Validation (v1.x)

Features to add once core is working and educator feedback is in.

- [ ] Source numbering toggle — when users ask for more formatting control
- [ ] Indentation levels for sources — when users are building more complex sheets
- [ ] Sheet duplication ("use this as a template") — when educators want to build a series
- [ ] Nekkudot removal per source — when advanced users ask for it
- [ ] Divine Name display preferences — when Orthodox users request it

### Future Consideration (v2+)

Features to defer until product-market fit is established.

- [ ] Collaborative editing — why defer: massive complexity, solo workflow dominates v1
- [ ] Mobile native app — why defer: web-on-tablet works; native doubles scope
- [ ] Version history — why defer: undo/redo and autosave cover the real need
- [ ] Collections / organization beyond basic sheet list — why defer: basic library covers v1 use
- [ ] Social discovery (public sheet index, copy other users' sheets) — why defer: Sefaria already has this; don't compete on their strength

---

## Feature Prioritization Matrix

| Feature | User Value | Implementation Cost | Priority |
|---------|------------|---------------------|----------|
| Bilingual Hebrew/English layout with correct typography | HIGH | MEDIUM | P1 |
| One-click reliable PDF export | HIGH | HIGH | P1 |
| AI translation for untranslated sources | HIGH | HIGH | P1 |
| AI topic-to-source suggestions | HIGH | HIGH | P1 |
| Public share URL | HIGH | LOW | P1 |
| Section headers and dividers | HIGH | LOW | P1 |
| Custom text/commentary blocks | HIGH | LOW | P1 |
| Sheet library with search | MEDIUM | LOW | P1 |
| Creator attribution | MEDIUM | LOW | P1 |
| Print-optimized page break control | HIGH | MEDIUM | P1 |
| Source numbering / formatting toggles | MEDIUM | LOW | P2 |
| Nekkudot removal | MEDIUM | LOW | P2 |
| Divine Name preferences | MEDIUM | LOW | P2 |
| Sheet duplication / template | MEDIUM | LOW | P2 |
| Collaborative editing | HIGH | HIGH | P3 |
| Version history | LOW | HIGH | P3 |
| Social discovery | MEDIUM | HIGH | P3 |

**Priority key:**
- P1: Must have for this milestone launch
- P2: Should have, add when possible
- P3: Nice to have, future consideration

---

## Competitor Feature Analysis

| Feature | Sefaria Sheet Maker | Google Docs (export target) | ChevrutAI Plan |
|---------|---------------------|----------------------------|----------------|
| Source search | Deep Sefaria library integration | None | Same Sefaria integration, faster UI |
| Bilingual layout | Yes — side-by-side or stacked | Manual formatting | Built-in, Hebrew-right default |
| PDF export | Indirect — print-to-PDF via browser, inconsistent | Export to PDF, reliable | One-click, reliable, CSS print layout |
| AI translation | None | None (third-party AI tools separately) | On-demand per source via Gemini |
| AI source suggestions | None | None | Topic → source list via Sefaria Topics API + Gemini |
| Hebrew typography | Reasonable but not designed | Font-dependent | Frank Ruhl Libre, designed handout aesthetic |
| Public share URL | Yes | Shareable Google Doc link | Yes — direct URL to rendered sheet |
| Mobile editing | No (browser only) | Yes (Google Docs mobile) | Web browser works; no native app |
| Sheet library search | No | Google Drive search | Yes — filter by title |
| Creator attribution | Informal | Manual | Explicit field, appears on PDF |
| Collections / organization | Yes (Sefaria Collections) | Google Drive folders | v2 — basic list is enough for v1 |

---

## Sources

- [Sefaria Sheet Maker / Voices on Sefaria](https://voices.sefaria.org/sheets) — confirmed via multiple help docs and educator testimonials (MEDIUM confidence — observed features, not official changelog)
- [How to Format and Edit Sheets — Sefaria Help Center](https://help.sefaria.org/hc/en-us/articles/20531238413468-How-to-Format-and-Edit-Sheets) — formatting features confirmed (MEDIUM confidence)
- [How to Export, Print, or Share a Sheet — Sefaria Help Center](https://help.sefaria.org/hc/en-us/articles/20532656851228-How-to-Export-Print-or-Share-a-Sheet) — print/PDF limitations confirmed (HIGH confidence, official docs)
- [This Torah study tool is everywhere — JTA](https://www.jta.org/2017/10/03/lifestyle/this-torah-study-tool-is-everywhere-but-you-may-have-never-heard-of-it) — source sheet conventions and educator needs (HIGH confidence, primary reporting)
- [Source Sheets are Books of a Digital Kind — JTA](https://www.jta.org/2017/11/15/ny/source-sheets-are-books-of-a-digital-kind) — physical format conventions (HIGH confidence)
- [Rabbinical Assembly Source Sheets](https://www.rabbinicalassembly.org/resources-ideas/education/source-sheets) — professional format standards observed (MEDIUM confidence)
- [Sefaria for Educators — GitHub Wiki](https://github.com/Sefaria/Sefaria-Project/wiki/Sefaria-for-Educators) — educator use cases (MEDIUM confidence)
- [How to Use and Share Sheets — Jewish Educator Portal](https://educator.jewishedproject.org/content/how-use-and-share-sheets-sefaria) — educator workflow context (MEDIUM confidence)
- [PDF export with Hebrew RTL in React — DEV Community / GitHub Issues](https://dev.to/ansonch/6-open-source-pdf-generation-and-modification-libraries-every-react-dev-should-know-in-2025-13g0) — confirmed react-to-print as best approach for RTL (MEDIUM confidence, community sources)
- [Sefaria Search API v2](https://developers.sefaria.org/docs/search-api) — API capabilities confirmed (HIGH confidence, official docs)
- ChevrutAI PROJECT.md and CONCERNS.md — existing codebase capabilities and constraints (HIGH confidence, primary source)

---

*Feature research for: Jewish text sheet maker (ChevrutAI)*
*Researched: 2026-03-04*
