# 7 Upload flow – prepare, upload, finalize

## Summary

Backend prepare/finalize APIs aligned to spec (duplicates as `[{ filename, size }]`, `thumbnailPath: null`); frontend upload UI with file input, per-file progress, and duplicate handling.

## Approach

- **Backend**
  - **7.1 Prepare**: Already implemented; duplicates response shape updated from `string[]` to `PrepareUploadDuplicate[]` (`{ filename, size }`) per spec. Valid request returns 200 with `uploads` and `duplicates`; URLs use 15 min expiry (storage default).
  - **7.2 Finalize**: Already implemented; media doc now sets `thumbnailPath: null` (was `''`). Magic-byte check, media docs, and video job creation unchanged.
- **Frontend**
  - **7.3 Upload UI**: Album page has an "Upload" button that opens a dialog. User can enter optional uploader name and click "Choose files (max 25)" (accept images and video). On file select: call prepare → upload each file to `signedUploadUrl` via XHR (PUT) with progress → call finalize. Per-file progress shown with `LinearProgress`.
  - **7.4 Duplicates**: When prepare returns `duplicates`, they are shown as "Already in album" with filenames; duplicate files are excluded from upload and from the finalize body.

## Files to add or change

- `shared/types.ts` — Added `PrepareUploadDuplicate`, `PrepareUploadResponse.duplicates` typed as `PrepareUploadDuplicate[]`.
- `backend/src/routes/albums.ts` — Prepare: push `{ filename, size }` into duplicates; finalize: `thumbnailPath: null`; import `PrepareUploadDuplicate`.
- `frontend/src/api/client.ts` — Added `prepareUpload`, `finalizeUpload`, `uploadFileToSignedUrl` (XHR with progress).
- `frontend/src/pages/AlbumPage.tsx` — Upload button, upload dialog (uploader name, file input, duplicate list, progress bars), `handleFileSelect` flow: prepare → upload to URLs → finalize.

## Acceptance criteria

- [x] 7.1: Valid request returns 200 with uploads and duplicates arrays; duplicates not in uploads; URLs expire in 15 minutes.
- [x] 7.2: Each upload becomes a media doc with thumbnailPath and previewPath null; video creates job with status pending; magic-byte failure returns 400; response lists media IDs.
- [x] 7.3: User selects up to 25 files; progress per file; prepare → upload to URL → finalize succeeds; duplicate filenames not uploaded and user sees "Already in album".
- [x] 7.4: Duplicate files omitted from upload and finalize body; UI shows which files were skipped.
