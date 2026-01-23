# Fixing Zohar Text Fetching (and other complex citations)

## Goal Description
The application currently fails to fetch texts from the Zohar when the AI suggests references in the "Parasha structure" (e.g., "Zohar, Metzora 2:1-3"). This is caused by two factors:
1.  **Contradictory AI Instructions**: The system prompt explicitly tells the AI to use "Parasha structure" for Zohar, but these references often don't map cleanly to Sefaria's text segments, leading to "starts at X" errors.
2.  **Brittle Error Handling**: When a specific Ref fails (400/404), the application simply shows a toast error ("Could not fetch text..."), leaving the user stuck.

This plan proposes a holistic solution that fixes the "Source" (the AI's instructions) and significantly improves the "Consumer" (the client's resilience) by introducing a "Search Fallback" and "Smart Disambiguation" system.

## User Review Required
> [!IMPORTANT]
> This plan changes the AI System Prompt in `api/chat.js`. This will affect future AI responses.

> [!NOTE]
> This plan introduces a new UI flow: a "Disambiguation Modal" (or similar selection mechanism) that appears when a direct text fetch fails, offering search results instead of just an error.

## Proposed Changes

### Backend / AI Configuration

#### [MODIFY] [api/chat.js](file:///c:/Users/dsbog/ChevrutAI/api/chat.js)
-   **Update System Instruction**:
    -   Remove the contradictory instruction banning Volume:Page for Zohar.
    -   Explicitly recommend Volume:Page (e.g., `Zohar 1:1a`) as the primary, most reliable citation format.
    -   Add a warning about verse accuracy in Zohar.

### Frontend Service Layer

#### [MODIFY] [src/services/sefaria.js](file:///c:/Users/dsbog/ChevrutAI/src/services/sefaria.js)
-   **Add `searchSefariaText(query, book)`**:
    -   Implement a function to call Sefaria's Search API.
    -   This will be used as a fallback when `getSefariaText` fails.
    -   It will search for the *text content* or the *ref string* within the specific book index if known.
-   **Enhance `getSefariaText`**:
    -   Parse specific Sefaria error messages (like "Zohar, X starts at Y").
    -   Return structured error objects that can guide the UI (e.g., `{ error: "REF_MISMATCH", suggestions: [...] }`).

### Frontend Components & Hooks

#### [MODIFY] [src/hooks/useSheetManager.js](file:///c:/Users/dsbog/ChevrutAI/src/hooks/useSheetManager.js)
-   **Update `handleAddSource`**:
    -   Current behavior: `getSefariaText` -> `null` -> `showToast`.
    -   **New behavior**:
        1.  Try `getSefariaText`.
        2.  If successful, add source.
        3.  If failed:
            -   Trigger a "Resolving..." state.
            -   Call `searchSefariaText(source.ref)`.
            -   If search results found, set a `disambiguationOptions` state (to be handled by UI).
            -   If no results, *then* show the error toast.

#### [NEW] [src/components/SourceDisambiguationModal.jsx](file:///c:/Users/dsbog/ChevrutAI/src/components/SourceDisambiguationModal.jsx)
-   A new modal component.
-   **Props**: `isOpen`, `originalRef`, `options`, `onSelect`, `onCancel`.
-   **UI**: "We couldn't find exact text for '{originalRef}'. Did you mean one of these?"
-   Lists top 3-5 search results with brief snippets.
-   User clicks -> calls `onSelect(newRef)` -> adds to sheet.

#### [MODIFY] [src/components/ChatSidebar.jsx](file:///c:/Users/dsbog/ChevrutAI/src/components/ChatSidebar.jsx)
-   Integrate the `SourceDisambiguationModal` (or pass the need for it up to the parent).
-   Ensure that when `useSheetManager` triggers disambiguation, this modal appears over the chat or sheet.

## Verification Plan

### Automated Tests
-   Not applicable for this API-integration heavy change.

### Manual Verification
1.  **AI Reference Test**: Ask the AI "Give me a Zohar text about leprosy derived from Metzora".
    -   Verify it now suggests a Volume:Page ref (e.g., "Zohar 3:55a") or a valid Parasha ref.
2.  **Failure Fallback Test**:
    -   Manually try to add a broken ref: `Zohar, Metzora 2:1-3`.
    -   Verify that instead of a "Could not fetch text" toast, the **Disambiguation Modal** appears.
    -   Verify the modal shows relevant Zohar sections (e.g., "Zohar, Leviticus, Tazria..." or "Zohar 3:55a").
    -   Select an option and verify it adds correctly to the sheet.
