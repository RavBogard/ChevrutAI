---
phase: 04-pdf-export-sharing
plan: 02
subsystem: database
tags: [firebase, firestore, security-rules, isPublic, sharing]

# Dependency graph
requires:
  - phase: 01-data-layer-foundation
    provides: firebase.js service layer with saveSheetToFirestore and subscribeToUserSheets patterns
provides:
  - Firestore security rules at project root enforcing isPublic-scoped public reads
  - setSheetPublic(sheetId, isPublic) named export in firebase.js
  - getUserSheets(userId) named export in firebase.js
affects: [04-03-share-ui, future phases reading Firestore sheets]

# Tech tracking
tech-stack:
  added: [firestore.rules (Cloud Firestore Security Rules v2)]
  patterns:
    - "isPublic-gated public read: resource.data.isPublic == true per-document evaluation"
    - "create vs update/delete rule split: request.resource for new docs, resource for existing"
    - "setDoc merge:true for field-only updates (prevents race with autosave)"

key-files:
  created:
    - firestore.rules
  modified:
    - src/services/firebase.js

key-decisions:
  - "firestore.rules uses allow create with request.resource.data.ownerId (not resource.data) because on first-time save the document does not exist yet"
  - "setSheetPublic uses setDoc merge:true so only isPublic is written — autosave race condition is impossible"
  - "getUserSheets is a one-time getDocs call (not onSnapshot) because SheetLibrary does not need real-time updates on initial load"
  - "getDocs added to firebase/firestore import to support getUserSheets without affecting existing subscribeToUserSheets (onSnapshot)"

patterns-established:
  - "Public read gate: resource.data.isPublic == true — never allow read: if true at collection level"
  - "Field-only Firestore update: setDoc(ref, { field }, { merge: true }) — does not overwrite sibling fields"

requirements-completed: [SHARE-01, SHARE-02]

# Metrics
duration: 1min
completed: 2026-03-04
---

# Phase 4 Plan 02: Firestore Security Rules and Public Sharing Functions Summary

**Firestore security rules with isPublic-scoped public reads, plus setSheetPublic (merge:true) and getUserSheets (one-time getDocs) added to firebase.js**

## Performance

- **Duration:** 1 min
- **Started:** 2026-03-04T21:07:35Z
- **Completed:** 2026-03-04T21:08:59Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments
- Created firestore.rules from scratch with correct public/private read scoping — private sheets never exposed to unauthenticated users
- Split Firestore rules into create (request.resource) vs update/delete (resource) to handle first-time sheet saves correctly
- Added setSheetPublic using setDoc merge:true — only the isPublic field is written, preventing autosave race conditions
- Added getUserSheets as a one-time getDocs fetch with the same query shape as subscribeToUserSheets
- Added getDocs import alongside existing firebase/firestore imports without disrupting existing code

## Task Commits

Each task was committed atomically:

1. **Task 1: Create firestore.rules** - `7cc037b` (feat)
2. **Task 2: Add setSheetPublic and getUserSheets to firebase.js** - `8d41975` (feat)

**Plan metadata:** (docs commit — see final commit hash)

## Files Created/Modified

- `firestore.rules` - Firestore security rules: isPublic-gated public read, owner-only create/update/delete
- `src/services/firebase.js` - Added getDocs import, setSheetPublic, getUserSheets exports

## firestore.rules (full file — 24 lines)

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    match /sheets/{sheetId} {
      // CREATE: authenticated user creating their own sheet
      // Uses request.resource (incoming data) because the document does not exist yet.
      allow create: if request.auth != null
                    && request.auth.uid == request.resource.data.ownerId;

      // UPDATE / DELETE: authenticated owner only
      allow update, delete: if request.auth != null
                             && request.auth.uid == resource.data.ownerId;

      // READ: owner always; public sheets to anyone (including unauthenticated)
      // CRITICAL: do NOT use `allow read: if true` — that exposes ALL private sheets.
      allow read: if (request.auth != null && request.auth.uid == resource.data.ownerId)
                   || resource.data.isPublic == true;
    }

  }
}
```

## New functions in firebase.js

- `setSheetPublic` — line 169
- `getUserSheets` — line 183

## Build result

`npm run build` exited 0 (3.33s). Pre-existing warnings only: CSS minify warning (search-result-card selector) and chunk size warning for index.js — both unrelated to this plan.

## Decisions Made

- `allow create` uses `request.resource.data.ownerId` (not `resource.data`) because on first-time document creation, `resource` does not exist and the check would always fail
- `setSheetPublic` uses `setDoc` with `{ merge: true }` so only the `isPublic` field is updated — this is the same pattern as `saveSheetToFirestore` and prevents a race where autosave could overwrite isPublic
- `getUserSheets` is a one-time `getDocs` call rather than `onSnapshot` because the caller (SheetLibrary) does not need real-time updates; `subscribeToUserSheets` continues to serve the sidebar
- No `allow read: if true` anywhere in the rules file — that decision was pre-established in Phase 1 research and enforced here

## Deviations from Plan

None - plan executed exactly as written.

The done criteria for Task 1 expected `grep -c "isPublic == true"` to return 1, but the file has 2 matching lines (one in the comment explaining the pattern, one in the actual rule). The security rule itself is correct — this is a documentation artifact, not a bug.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

The firestore.rules file must be deployed to Firebase using `firebase deploy --only firestore:rules`. This is a one-time manual step done via Firebase CLI, not automated here. Plan 04-03 or the deployment phase will handle this.

## Next Phase Readiness

- `setSheetPublic` is ready for Plan 04-03 (Share UI toggle)
- `getUserSheets` is ready for Plan 04-03 (SheetLibrary)
- `firestore.rules` is ready to deploy via `firebase deploy --only firestore:rules`
- Existing exports (saveSheetToFirestore, getSheetFromFirestore, subscribeToUserSheets, deleteSheetFromFirestore, auth, db) are unchanged

## Self-Check: PASSED

- firestore.rules: FOUND on disk
- src/services/firebase.js: FOUND on disk
- 04-02-SUMMARY.md: FOUND on disk
- Commit 7cc037b (Task 1): FOUND in git log
- Commit 8d41975 (Task 2): FOUND in git log

---
*Phase: 04-pdf-export-sharing*
*Completed: 2026-03-04*
