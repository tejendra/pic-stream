# Solution B: Firebase-first with Cloud Functions + minimal Express

Push event-driven and storage-triggered logic into Cloud Functions; keep Express minimal (auth + signed URLs only). Good if you prefer a “Firebase-native” style and want thumbnails and duplicate checks to run server-side without a long-lived Express process.

## Architecture

```
[React SPA] ←→ [Express API]  (create album, verify seed, issue signed URLs only)
                    ↓
              [Firestore] ←→ [Cloud Functions]
                    ↑              ↓
              [Firebase Storage]   (onFinalize: thumbnail, metadata, duplicate check)
```

- **Hosting:** Firebase Hosting (React). Express runs on **Cloud Run** or as a **Firebase callable-style HTTP function** (single Node function handling `/api/*`).
- **Auth flow:** Same as Solution A: Express creates album, stores `hash(seed)` in Firestore, returns seed once. "Open album" = verify seed → return short-lived album token. All subsequent API calls send this token.
- **Upload flow:** Client requests signed upload URL from Express (with album token, filename, size, MIME). Express validates token, size, type, count; checks duplicate (filename+size in Firestore); returns signed URL. Client uploads directly to Storage (resumable). **Storage path convention:** `albums/{albumId}/originals/{uuid}_{sanitizedFilename}`.
- **Cloud Function `onStorageFinalize`:** Triggered when a new object is created under `albums/{albumId}/originals/`. Function: (1) Validate file (magic bytes, type, size) again; if invalid, delete object and return. (2) Check duplicate by content hash (compute hash of the object) or by filename+size in Firestore; if duplicate, delete object, return. (3) Generate thumbnail: images → resize (e.g. 400px width); video → extract one frame (e.g. ffmpeg in Node or use a dedicated service). (4) Write media doc to Firestore (path, thumbnailPath, uploader from object metadata or separate "finalize" call). If you don’t pass uploader name in object metadata, client calls a lightweight "registerUpload" endpoint after upload with (albumId, path, uploaderName).
- **Scheduled delete:** **Cloud Function on schedule** (e.g. daily) queries Firestore for albums with `deleteOn <= today`, deletes their Storage objects and Firestore docs. No Express involvement.

## Pros

- Thumbnails (including video frame) and duplicate-by-hash can be done server-side in one place (onFinalize).
- No long-running server for background work; Functions scale to zero.
- Fits Firebase free tier: Functions + Storage + Firestore.

## Cons

- Logic split: Express (auth, URLs) vs Functions (validation, thumbnail, duplicate). Harder to trace a full "upload" flow across two codebases.
- Cold starts on first request after idle; thumbnail generation can add latency for the first upload in a batch.
- Need to pass uploader name to Storage (metadata) or add a small "register" call after upload.

## Security (concise)

- Same as Solution A: seed hashed, short-lived album token, signed URLs with short expiry.
- **Double validation:** Express validates before issuing URL; Cloud Function validates again on finalize (magic bytes, size, type) and can delete malicious uploads before they’re ever listed.
- No execution of user content; thumbnail generation uses trusted libraries (sharp, ffmpeg) on the uploaded bytes only.

## Duplicate detection

- **v1:** In Function: after upload, compute content hash (e.g. SHA-256). Check Firestore for same album + same hash; if exists, delete the new object and don’t create media doc. Optionally also enforce (filename+size) to avoid confusion.
- Stronger than Solution A’s v1 (hash vs filename+size) but requires reading the object in the Function (slight cost and latency).

## Data model (high level)

- Same as Solution A; add `contentHash` to media for duplicate check. Optional: store thumbnail path so client can show it without recomputing.

## v1 scope (80/20)

- Must: same as Solution A; add server-side thumbnails (image + one frame for video) and hash-based duplicate in the onFinalize Function. Scheduled delete via Cloud Function.
- Defer: email reminders; advanced video thumbnails (e.g. middle of video).
