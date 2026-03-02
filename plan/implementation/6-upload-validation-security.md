# 6 Upload validation and security

## Summary

Backend: MIME allowlist, magic-byte check, file size/count limits, path safety and signed URL scope, and rate limiting for upload prepare/finalize. Add POST prepare and POST finalize routes that apply these validations.

## Approach

- **Backend**
  - **6.1 MIME allowlist**: New `lib/upload-validation.ts` with `ALLOWED_MIME_TYPES` (image/jpeg, image/png, image/webp, image/gif, video/mp4, video/webm). In prepare, reject any file with other MIME → 400 `{ error: "File type not allowed" }`.
  - **6.2 Magic-byte check**: In `lib/upload-validation.ts`, add `checkMagicBytes(buffer: Buffer, mimeType: string): boolean` for the six types. In finalize, read first 512 bytes from Storage at `storagePath`, run check; on fail → 400 `{ error: "Invalid file signature" }`. Store `uploadId → { mimeType, storagePath }` at prepare (in-memory, 15 min TTL) for finalize to look up expected MIME.
  - **6.3 Size/count**: Constants `MAX_FILE_SIZE_BYTES = 500 * 1024 * 1024`, `MAX_FILES_PER_PREPARE = 25`. In prepare: per-file size > 500MB → 400 "File too large"; files.length > 25 → 400 "Too many files".
  - **6.4 Path safety**: Paths under `albums/{albumId}/`. `lib/paths.ts` already has `sanitizeFilename`, `buildStoragePath`, and segment checks. Add `isPathUnderAlbum(albumId: string, path: string): boolean` and reject paths with `..` or not under `albums/{albumId}/`. When generating signed URLs only use paths from `buildStoragePath` for that album. In finalize validate each `storagePath` with `isPathUnderAlbum(albumId, path)` and reject with 400 if invalid.
  - **6.5 Rate limiting**: Add `express-rate-limit` on POST `.../upload/prepare` and POST `.../upload/finalize`: 30 requests per 15 minutes per album token (key = Authorization header or token payload). Return 429 when exceeded.
- **Routes**: Add POST `/api/albums/:albumId/upload/prepare` and POST `.../upload/finalize` (auth: album token). Prepare: validate body, MIME, count, size, build paths with path helper, generate signed URLs, store uploadId→mimeType for finalize, duplicate check (existing media duplicateKey), return `{ uploads, duplicates }`. Finalize: validate body and path safety, look up mimeType per uploadId, download first 512 bytes from Storage, magic-byte check, create media docs (and job for video). Storage: add `downloadFileHead(path: string, maxBytes: number): Promise<Buffer>` for magic-byte read.

## Files to add or change

- `backend/src/lib/upload-validation.ts` — NEW: MIME allowlist, magic-byte check, MAX_FILE_SIZE_BYTES, MAX_FILES_PER_PREPARE.
- `backend/src/lib/paths.ts` — Add `isPathUnderAlbum(albumId, path)`.
- `backend/src/lib/storage.ts` — Add `downloadFileHead(path, maxBytes)`; ensure signed URLs only for paths (caller responsibility via path helper).
- `backend/src/lib/upload-session.ts` — NEW: in-memory store uploadId → { mimeType, storagePath } with 15 min TTL.
- `backend/src/routes/albums.ts` — Add nested router for `/:albumId/upload` with POST prepare, POST finalize; apply rate limit to these routes.
- `backend/package.json` — Add `express-rate-limit`.
- `backend/src/lib/firestore.ts` — Add `getExistingDuplicateKeys(albumId): Promise<Set<string>>` (or extend listMedia to return duplicateKey where needed).

## Acceptance criteria

- [x] 6.1: Only the six MIME types accepted; any other returns 400 "File type not allowed".
- [x] 6.2: Correct magic bytes for MIME pass; mismatch returns 400 "Invalid file signature".
- [x] 6.3: Over 500MB per file → 400 "File too large"; over 25 files → 400 "Too many files".
- [x] 6.4: No path leaves album folder; signed URLs only for that album; invalid path → 400.
- [x] 6.5: More than 30 requests in 15 minutes from same token → 429.
