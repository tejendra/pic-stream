# Solution A: Express-centric API + Firebase Storage

Single backend (Express) owns all business logic. Firebase is used for persistence and file storage only. Easiest to reason about and debug; all validation and security live in one codebase.

## Architecture

```
[React SPA] ←→ [Express API] ←→ [Firestore] (metadata)
                    ↓
              [Firebase Storage] (originals + compressed previews + thumbnails)
```

- **Hosting:** Firebase Hosting for the React app; Express runs on **Cloud Run** (or a single Node server elsewhere). Firebase Hosting rewrites `/api/*` to Cloud Run if needed.
- **Auth flow:** No login. Express creates album, stores `hash(seed)` in Firestore, returns the 5-word seed to the client once. To "open" an album, client sends seed → Express verifies against hash, returns a short-lived **album token** (JWT or opaque) that the client sends on subsequent requests. Token encodes `albumId` + expiry (e.g. 24h). No session storage on server.
- **Upload flow:** Client requests "prepare upload" (albumId, filename, size, MIME). Express checks album token, validates size/type/count (≤25 per batch, max file size), checks duplicate (filename + size already in album → reject or warn). Express generates a **signed upload URL** for Firebase Storage (resumable). Client uploads directly to Storage using that URL (browser/React can use resumable upload for large files). Client then calls "finalize upload" (albumId, storage path, display name, uploader name). Express writes metadata to Firestore (path, name, uploader, size, duplicate key). Thumbnails: **v1** = client generates (e.g. canvas for images, or skip for video / use placeholder).
- **Scheduled delete:** Cloud Scheduler (or cron) calls an Express endpoint (protected by a secret or Cloud Run auth) that queries Firestore for albums where `deleteOn <= today`, deletes objects in Storage and album docs in Firestore.

## Thumbnail view and compression

- **Thumbnail view:** The UI shows a grid (or list) of **thumbnails** for fast loading. Tapping/clicking opens the item for viewing; “Download” fetches the **original**. Thumbnail view is first-class.
- **Three tiers per item:**
  - **Thumbnail** – small image for the grid (fast).
  - **Preview (compressed)** – used for **in-app viewing** so playback starts quickly without loading the full original. Videos and optionally large images use this.
  - **Original** – stored without re-encoding; used only for “download original.”

### Images

- **Original:** Stored as uploaded (no compression).
- **Thumbnail:** Client-generated (e.g. canvas resize ~400px, JPEG), uploaded with the original.
- **Preview:** Optional. For v1, in-app “view” can show original or a client-scaled version; add a server-generated compressed preview later if needed.

### Videos (important for fast viewing)

- **Original:** Stored as uploaded (no compression). Used for “download original.”
- **Compressed preview:** Stored **in addition** to the original. Used for **in-app playback** so the user gets fast start and lower bandwidth. Generate server-side in the same codebase (e.g. Express background job or same-repo worker using ffmpeg): after “finalize upload,” trigger async processing that produces a compressed variant (e.g. 720p or 1080p, efficient codec/bitrate), uploads it to Storage, and saves `previewPath` (or `compressedVideoPath`) in Firestore. Until processing finishes, the UI can show “Processing…” or fall back to the original.
- **Thumbnail:** One frame for the grid (e.g. extract in the same ffmpeg pass as compressed preview, or first frame). Stored as `thumbnailPath`.

**Flow:** User uploads video → original stored → async job creates compressed + thumbnail → both paths saved in Firestore. In-app: play from `previewPath` (compressed). Download: serve from `storagePath` (original).

## Pros

- One place for security and validation (Express). No split between Express and Cloud Functions.
- Simple mental model: Express is the only backend.
- Duplicate check before issuing upload URL avoids storing duplicates.
- Resumable upload stays in Firebase Storage (native support), so large videos are handled well.

## Cons

- Express must run somewhere (Cloud Run is free tier friendly). No “serverless-only” option.
- Video processing (compressed preview + thumbnail) runs in the same codebase (e.g. ffmpeg in a background job or worker); you need a way to run ffmpeg (e.g. in the same container or a separate worker process).

## Security (concise)

- **Seed:** Store only `bcrypt(seed)` in Firestore. Never log or return seed after create.
- **Album token:** Short-lived; only contains albumId + expiry. Validated on every Express request.
- **Upload validation (Express):** Enforce MIME allowlist (image/*, video/*), magic-byte check for allowed types, max file size (e.g. 500MB per file), max 25 files per batch. Reject zip/executables. No server-side execution of user content.
- **Signed URLs:** Short expiry (e.g. 15 min for upload, 1h for download). Path scoped to album folder.

## Duplicate detection (v1)

- Key = `(filename, size)` per album. Before issuing upload URL, Express checks Firestore for existing media in that album with same filename and size; if found, return 409 with message "already in album". Optional: later add content-hash (e.g. SHA-256) for stronger duplicate detection (compute in client or in a post-upload job).

## Data model (high level)

- **albums:** `id`, `name`, `seedHash`, `deleteOn`, `createdAt`, `createdBy` (display name).
- **media:** `id`, `albumId`, `storagePath` (original), `previewPath` (compressed – used for in-app viewing; videos and optionally large images), `thumbnailPath`, `displayName`, `uploaderName`, `size`, `mimeType`, `duplicateKey` (e.g. `filename|size`), `createdAt`. For video, `previewPath` is required for fast playback; until the async job completes it can be null and the UI can show “Processing…” or fall back to original.

## v1 scope (80/20)

- **Must:** Create album, open album (seed), upload (resumable, 25 files, duplicate by filename+size), list media, **in-app viewing** (play video from compressed preview when ready; fallback to original or “Processing…”), **download original**, delete media, delete album, set/change delete date, scheduled job to delete expired albums. Client-generated thumbnails for images. **Videos:** store original + compressed preview (async job in same codebase, e.g. ffmpeg); thumbnail = one frame from same job.
- **Defer:** Content-hash duplicate, optional compressed preview for large images, email reminders.
