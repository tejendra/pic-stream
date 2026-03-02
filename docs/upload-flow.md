# Upload flow: prepare → upload → finalize

Media uploads use a three-step flow so the client uploads files **directly to Firebase Storage** (via signed URLs) instead of through the Express server. The server only validates, issues URLs, and records metadata.

## Overview

```
Client                          Express API                     Firebase Storage
   |                                  |                                  |
   |  POST .../upload/prepare         |                                  |
   |  { files: [{ filename, size,     |                                  |
   |             mimeType }] }        |                                  |
   |--------------------------------->|                                  |
   |                                  |  validate MIME, size, count,     |
   |                                  |  duplicate check; build paths    |
   |                                  |  getSignedUploadUrl(path)        |
   |                                  |  setUploadSession(uploadId, ...)  |
   |  { uploads: [{ uploadId,         |                                  |
   |    signedUploadUrl, storagePath }],                                  |
   |    duplicates: [...] }           |                                  |
   |<---------------------------------|                                  |
   |                                  |                                  |
   |  PUT signedUploadUrl (file body) |                                  |
   |--------------------------------------------------------------->     |
   |  (repeat per file; no rate limit) |                                  |
   |                                  |                                  |
   |  POST .../upload/finalize       |                                  |
   |  { uploads: [{ uploadId,         |                                  |
   |    storagePath, uploaderName,    |                                  |
   |    displayName? }] }             |                                  |
   |--------------------------------->|                                  |
   |                                  |  path check, session lookup      |
   |                                  |  downloadFileHead(path)          |
   |                                  |  checkMagicBytes(buffer, mime)   |
   |                                  |<---------------------------------|
   |                                  |  writeMediaDoc(); jobs (video)   |
   |  { mediaIds: [...] }             |                                  |
   |<---------------------------------|                                  |
```

## Why finalize?

After the client uploads bytes to Storage, the file exists only as a blob at a path. The app has no record of it yet. **Finalize** is what turns that into a visible, manageable item in the album:

1. **Create the media doc** – We write a document in `albums/{albumId}/media` with `storagePath`, `uploaderName`, `displayName`, `size`, `mimeType`, etc. Without this, the file would never show up in the album list or in any API that lists media.

2. **Verify the upload** – At prepare we only saw what the client *claimed* (size, mimeType). We never saw the bytes. At finalize we read the first 512 bytes from Storage and run the **magic-byte check**. That way we only “bless” content that actually matches the declared type (and reject executables or wrong types uploaded to a signed URL).

3. **Bind metadata from prepare** – We use the session (uploadId → mimeType, size, duplicateKey) from prepare so finalize doesn’t trust the client again for type/size. We create the media doc from server-held data plus the path we verified.

4. **Video jobs** – For video, finalize creates a `jobs` entry so a worker can generate preview and thumbnail. That only happens after we’ve confirmed the file is really a video.

If the client never calls finalize (e.g. closed the tab), we end up with an orphan object in Storage and no media doc—so the file never appears in the app. Cleanup of such orphans can be done separately (e.g. cron).

## Step 1: Prepare

**Endpoint:** `POST /api/albums/:albumId/upload/prepare`  
**Auth:** `Authorization: Bearer <album token>`

**Request body:** `{ files: [{ filename, size, mimeType }] }`  
- Up to **25 files** per request.  
- Each file: max **500 MB**; MIME must be in the allowlist (JPEG, PNG, WebP, GIF, HEIC, HEIF, MP4, WebM).

**What the server does:**

1. Validates count (≤ 25), per-file size (≤ 500 MB), and MIME allowlist. Returns 400 with a specific error message if any check fails.
2. For each file, checks for an existing media doc in the album with the same `duplicateKey` (`filename|size`). Such files are listed in `duplicates` and do not get upload URLs.
3. For each non-duplicate file:
   - Builds a storage path under `albums/{albumId}/originals/{uniqueId}_{sanitizedFilename}` (see [storage-paths.md](storage-paths.md)).
   - Gets a **signed upload URL** from Firebase Storage (15 min expiry).
   - Stores a **session entry** in memory: `uploadId → { mimeType, storagePath, size, duplicateKey }` (15 min TTL) for finalize to use.
4. Returns `{ uploads: [{ uploadId, signedUploadUrl, storagePath }], duplicates: [filename, ...] }`.

**Rate limit:** 30 prepare+finalize requests per 15 minutes per album token (shared with finalize). So effectively up to 15 batches of 25 files (375 files) per 15 minutes.

---

## Step 2: Upload (client → Storage)

The client uploads each file **directly to Firebase Storage** by sending a `PUT` (or resumable upload) to the `signedUploadUrl`, with the file bytes as the body. These requests do **not** hit the Express server, so they are not rate-limited by the upload limiter and do not use server bandwidth.

The client should use the same `storagePath` returned from prepare when calling finalize.

---

## Step 3: Finalize

**Endpoint:** `POST /api/albums/:albumId/upload/finalize`  
**Auth:** `Authorization: Bearer <album token>`

**Request body:** `{ uploads: [{ uploadId, storagePath, uploaderName, displayName? }] }`

**What the server does:**

1. Validates that each `storagePath` is under `albums/{albumId}/` and safe (no `..`, allowed chars). Returns 400 if not.
2. For each item, looks up the **upload session** by `uploadId`. If missing or expired (e.g. > 15 min since prepare), returns 400.
3. Confirms the path in the session matches the request’s `storagePath`.
4. **Magic-byte check:** Downloads the first 512 bytes of the file from Storage and verifies the header matches the MIME stored at prepare (e.g. JPEG starts with `FF D8 FF`). Returns 400 `"Invalid file signature"` on mismatch.
5. Creates a **media doc** in `albums/{albumId}/media` with `storagePath`, `uploaderName`, `displayName`, `size`, `mimeType`, `duplicateKey`; `thumbnailPath` and `previewPath` are set to null (v1).
6. For **video** (mimeType `video/mp4` or `video/webm`), creates a **job** doc in the `jobs` collection with `status: "pending"` so a worker can generate preview and thumbnail.
7. Returns `{ mediaIds: [...] }` in the same order as the request’s `uploads`.

**Rate limit:** Same as prepare (30 requests per 15 min per token, shared).

---

## Validation and security (Feature 6)

| Check            | Where    | Failure response                          |
|------------------|----------|--------------------------------------------|
| MIME allowlist   | Prepare  | 400 `"File type not allowed"`              |
| File size ≤ 500MB| Prepare  | 400 `"File too large"`                     |
| Count ≤ 25       | Prepare  | 400 `"Too many files"`                     |
| Path safety      | Prepare & finalize | 400 `"Invalid path"`              |
| Magic bytes      | Finalize | 400 `"Invalid file signature"`             |
| Session valid    | Finalize | 400 `"Invalid or expired upload session"` |
| Rate limit       | Both     | 429 `"Too many requests"`                 |

Signed URLs are generated only for paths under the requesting album; path helpers reject `..` and disallow segments that would leave the album folder.
