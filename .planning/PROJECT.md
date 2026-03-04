# ChevrutAI — Jewish Text Sheet Maker

## What This Is

ChevrutAI is a web application for rabbis and Jewish educators to create beautiful, professionally-designed text study sheets. Users search Sefaria's database for Hebrew sources, build sheets with AI assistance, and export polished elegant handouts for print, PDF, or web sharing. The product competes directly with Sefaria's built-in sheet maker by being dramatically better in output quality, building experience, and AI integration.

## Core Value

A rabbi should be able to go from topic → beautiful, print-ready sheet in minutes — with AI helping find sources and fill translation gaps.

## Requirements

### Validated

<!-- Existing capabilities confirmed in codebase -->

- ✓ User can authenticate with Google (Firebase Auth) — existing
- ✓ User can search Sefaria API for Jewish texts by reference or keyword — existing
- ✓ User can add Sefaria texts to a sheet and reorder them via drag-and-drop — existing
- ✓ User can save sheets to Firestore and access them across sessions — existing
- ✓ User can export sheet to DOCX format — existing
- ✓ User can chat with Gemini AI assistant about the texts on their sheet — existing
- ✓ Serverless API backend handles Gemini calls with rate limiting — existing

### Active

<!-- New scope for this milestone — rebuilding toward best-in-class -->

- [ ] Sheet editor rebuilt with clean, intentional UX (minimal clicks, fast workflow)
- [ ] Sheet output renders as elegant synagogue handout (Hebrew/English side-by-side, strong typography)
- [ ] User can export sheets as high-quality PDF
- [ ] User can share sheets via public web link
- [ ] User can request AI translation for any Sefaria text that lacks an English translation
- [ ] AI suggests relevant Sefaria sources from a topic description (topic → source list)
- [ ] User can add their own commentary/text blocks between sources
- [ ] User can add section headers and visual dividers to structure the sheet
- [ ] Existing user sheets are preserved and accessible in the new UI
- [ ] Sheet has a beautiful, styled print/PDF layout with proper Hebrew typography

### Out of Scope

- Real-time collaborative editing — complexity not warranted for v1
- Mobile native app — web-first, mobile browser is acceptable
- Non-Sefaria text sources — focus on Sefaria database exclusively for now
- Social features (likes, comments, follows) — not core to sheet-making value
- Paid tiers / billing — free for everyone

## Context

**Brownfield:** Existing React 19 + Vite + Firebase + Gemini app at ChevrutAI. Significant architectural debt noted in codebase map (duplicate state management, oversized components, no error boundaries). A partial rebuild is warranted — keep Firebase auth + Firestore data layer, rebuild editor and export pipeline.

**Competitive context:** Sefaria launched their own AI chatbot, making pure chevruta-chat less differentiated. Text sheet making remains a weak spot in their offering. The opportunity is to be dramatically better at the actual product output (the sheet itself) and the workflow to produce it.

**Jewish typography notes:** Hebrew is RTL, requires proper font rendering (Frank Ruhl Libre, Ezra SIL, or similar), nikud (vowel points) must render correctly. Side-by-side bilingual layout (Hebrew right column, English left) is the standard synagogue format.

**AI integration:** Gemini API already wired via Vercel serverless. AI translation should call the same pipeline. Topic-to-sources should query Sefaria search + use AI to rank/filter relevance.

**Sefaria API:** Already integrated. Texts come with or without English translation — the `he` field always exists, `text` field is empty when no translation available. AI translation triggers on empty `text` field.

## Constraints

- **Tech Stack**: React 19 + Vite + Firebase + Vercel — keep this, rebuild on top
- **Data Migration**: Existing Firestore sheet data must remain accessible
- **API**: Sefaria public API (no auth required), Gemini via existing serverless backend
- **Typography**: Must render Hebrew correctly in both editor and exported output
- **Performance**: Sheet editor must feel fast — no perceptible lag on text add/reorder

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Keep Firebase auth + Firestore | Users have existing sheets, don't break them | — Pending |
| Rebuild editor UI from scratch | Codebase map flagged major debt in components | — Pending |
| PDF via browser print / html2pdf | Already in deps, avoid heavy server-side PDF | — Pending |
| Elegant synagogue handout aesthetic | Matches core user's context and output destination | — Pending |
| Topic → source list AI mode | Lower risk than full AI drafting, more user control | — Pending |
| On-demand AI translation | User explicitly requests per-source, not automatic | — Pending |

---
*Last updated: 2026-03-04 after initialization*
