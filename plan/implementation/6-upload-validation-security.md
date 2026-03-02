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

## Validation steps

Use these steps to verify Feature 6. Prerequisites: backend running (e.g. `npm run dev` in `backend/`), Firebase configured. Get an album token first: create an album or open with seed, then use the returned `token` and `albumId` in the examples below. Replace `ALBUM_ID` and `TOKEN` in curl commands.

### 6.1 MIME allowlist

1. **Allowed types** – POST prepare with one file per allowed MIME; each should return `200` and `uploads` with one item (and a valid `signedUploadUrl` and `storagePath`). Allowed: `image/jpeg`, `image/png`, `image/webp`, `image/gif`, `image/heic`, `image/heif`, `video/mp4`, `video/webm`.

   ```bash
   curl -s -o /dev/null -w "%{http_code}" -X POST "http://localhost:3001/api/albums/ALBUM_ID/upload/prepare" \
     -H "Authorization: Bearer TOKEN" -H "Content-Type: application/json" \
     -d '{"files":[{"filename":"test.jpg","size":1000,"mimeType":"image/jpeg"}]}'
   ```

   Expect `200` for each allowed `mimeType`.

2. **Disallowed type** – POST prepare with a file with MIME not in the list (e.g. `application/pdf`, `image/svg+xml`, `text/plain`). Expect `400` and body `{"error":"File type not allowed"}`.

   ```bash
   curl -s -X POST "http://localhost:3001/api/albums/ALBUM_ID/upload/prepare" \
     -H "Authorization: Bearer TOKEN" -H "Content-Type: application/json" \
     -d '{"files":[{"filename":"x.pdf","size":1000,"mimeType":"application/pdf"}]}'
   ```

### 6.2 Magic-byte check

1. **Valid file** – Upload a real JPEG to Storage via the signed URL from prepare, then call finalize with the same `uploadId` and `storagePath`. Expect `200` and `mediaIds` with one id.
2. **Wrong content** – Prepare with `mimeType: "image/jpeg"`, then upload a file that is not a JPEG (e.g. a small text or PNG file) to the signed URL. Call finalize. Expect `400` and body `{"error":"Invalid file signature"}`.

### 6.3 File size and count limits

1. **Too many files** – POST prepare with 26 or more items in `files`. Expect `400` and `{"error":"Too many files"}`.

   ```bash
   # Build a payload with 26 files (script or repeat "filename", size, mimeType 26 times)
   curl -s -X POST "http://localhost:3001/api/albums/ALBUM_ID/upload/prepare" \
     -H "Authorization: Bearer TOKEN" -H "Content-Type: application/json" \
     -d '{"files":['"$(printf '"{"filename":"f%d.jpg","size":1,"mimeType":"image/jpeg"},' $(seq 1 25))'"{"filename":"f26.jpg","size":1,"mimeType":"image/jpeg"}]}'
   ```

6. **File too large** – POST prepare with one file with `size` greater than 500MB (e.g. `500*1024*1024+1`). Expect `400` and `{"error":"File too large"}`.

   ```bash
   curl -s -X POST "http://localhost:3001/api/albums/ALBUM_ID/upload/prepare" \
     -H "Authorization: Bearer TOKEN" -H "Content-Type: application/json" \
     -d '{"files":[{"filename":"huge.jpg","size":524288001,"mimeType":"image/jpeg"}]}'
   ```

### 6.4 Path safety and signed URL scope

1. **Paths from prepare** – Inspect prepare response: every `storagePath` should start with `albums/ALBUM_ID/` and contain no `..`. Signed URLs are generated only for those paths.
2. **Invalid path at finalize** – Call finalize with a `storagePath` that is not under the album (e.g. `albums/other_album_id/originals/fake.jpg`) or contains `..`. Expect `400` and `{"error":"Invalid path"}`. (Use a valid `uploadId` from a previous prepare for the same album, or a fake one to trigger session/path validation as implemented.)

### 6.5 Rate limiting

1. **Exceed limit** – Send 31 or more requests to prepare (or finalize) within 15 minutes using the same `Authorization: Bearer TOKEN`. After the 30th request, expect `429` and a body such as `{"error":"Too many requests"}`. (Use a script loop; ensure the same token is used.)

### Smoke: happy path

1. **End-to-end** – Create album → prepare with one small JPEG file → upload the file bytes with PUT to the returned `signedUploadUrl` → finalize with the returned `uploadId` and `storagePath` and `uploaderName`. Expect `200` from both prepare and finalize, and a media id in the finalize response. Optionally GET media and confirm the new item appears.
