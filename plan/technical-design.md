# Pic Stream – Technical Design (Solution A)

Single codebase: React SPA + Express API. Firebase for persistence (Firestore) and files (Storage). All business logic and security in Express.

---

## 1. Stack summary

| Layer | Technology |
|-------|------------|
| **Frontend** | React (latest), TypeScript, Vite |
| **Backend** | Node.js, Express, TypeScript |
| **Database** | Firebase Firestore |
| **File storage** | Firebase Storage |
| **Hosting** | Firebase Hosting (SPA) + Cloud Run (Express), or Express on same host behind a proxy |
| **Video processing** | ffmpeg (same codebase: background job or worker process) |
| **Scheduled delete** | Cloud Scheduler → HTTP to Express, or cron |

---

## 2. Frontend

### 2.1 Tooling and libraries

- **Build:** Vite, TypeScript.
- **Routing:** React Router.
- **API client:** `fetch` or axios; all API calls go to `/api/*` (proxied to Express in dev, same-origin in prod via Hosting rewrites).
- **State:** React state + context for album token and “recent albums” (or a lightweight store like Zustand). Persist album IDs + tokens in `localStorage` so returning users can open albums without re-entering the seed.
- **Upload:** Resumable upload to Firebase Storage using signed URL; use Firebase JS SDK `uploadBytesResumable` with the signed URL, or XHR/fetch with Range for resume. Show progress and “already in album” feedback from API.
- **Thumbnails (images):** Generate in browser (Canvas API: draw image scaled to ~400px, export as JPEG blob), upload in same batch as original or via second “finalize” step.

### 2.2 Pages and flows

- **Landing:** “Create album” or “Open album” (enter 5-word seed or pick from recent).
- **Create album:** Form: name, delete-on date (default 30 days). POST → get seed once, show “save this seed” (copy + download as image), then redirect to album page with token in memory and stored in localStorage.
- **Album page:** List/grid of media (thumbnail + uploader name). Actions: upload (multi-file, ≤25), view (open in modal or page: image full-size or video from `previewPath`), download original. Creator-only: edit delete date, delete album. Any user: delete any media. Show “Processing…” for video until `previewPath` is set.

### 2.3 Responsive and UX

- Mobile-first; touch-friendly upload (file input or drag-drop). Support large files and interruptions via resumable upload; show per-file progress and skip/retry for failures. Duplicate warning from API (409) → show message and optionally gray out or skip that file.

---

## 3. Backend (Express)

### 3.1 Structure (single codebase)

Suggested layout (monorepo or single repo):

```
backend/
  src/
    index.ts           # Express app, CORS, routes
    routes/
      albums.ts        # create, open (verify seed), get, update deleteOn, delete
      media.ts         # prepareUpload, finalizeUpload, list, delete, getDownloadUrl
      cron.ts          # deleteExpiredAlbums (protected)
    services/
      album.ts         # CRUD, seed hash verify
      media.ts         # duplicate check, Firestore media docs, Storage paths
      storage.ts       # signed URLs (upload/download), delete objects
      videoJob.ts      # enqueue / run video processing (ffmpeg)
    middleware/
      auth.ts          # validate album token (JWT or opaque)
    lib/
      firestore.ts
      storage.ts       # Firebase Admin SDK usage
    config.ts
  package.json
frontend/
  ... (Vite + React)
```

- **Vendor agnosticism:** Wrap Firestore and Storage in small service modules (`album`, `media`, `storage`) so swapping to another DB/blob store later only touches those modules.

### 3.2 API endpoints (REST)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/api/albums` | — | Create album (name, deleteOn, createdBy). Return albumId + seed (once) + album token. |
| POST | `/api/albums/open` | — | Body: seed (5 words). Verify → return album token + album summary. |
| GET | `/api/albums/:id` | Album token | Album details (name, deleteOn, createdBy). |
| PATCH | `/api/albums/:id` | Album token (creator only) | Update deleteOn or delete album. Creator = first creator stored in `albums.createdBy` or a creator flag. |
| DELETE | `/api/albums/:id` | Album token (creator only) | Delete album and all media (Storage + Firestore). |
| POST | `/api/albums/:albumId/upload/prepare` | Album token | Body: list of { filename, size, mimeType }. Validate count ≤25, size limits, duplicate (filename+size). Return list of { uploadId, signedUploadUrl } per file. |
| POST | `/api/albums/:albumId/upload/finalize` | Album token | Body: list of { uploadId, storagePath, displayName?, uploaderName }. Create media docs; for video, enqueue video processing job. Return media IDs. |
| GET | `/api/albums/:albumId/media` | Album token | List media (id, thumbnailPath, previewPath, storagePath, displayName, uploaderName, size, mimeType, createdAt). Include `previewPath === null` for “Processing…”. |
| GET | `/api/albums/:albumId/media/:mediaId/url` | Album token | Query param `type=original|preview|thumbnail`. Return signed download URL. |
| DELETE | `/api/albums/:albumId/media/:mediaId` | Album token | Delete media doc and all Storage objects (original, preview, thumbnail). |
| POST | `/api/cron/delete-expired` | Secret header or Cloud Run auth | Query Firestore for albums where deleteOn ≤ today; delete Storage objects and Firestore docs. |

### 3.3 Album token (auth)

- **Issue:** On create album or open album (seed verified). Payload: `{ albumId, exp }` (expiry e.g. 24h). Sign with a server secret (JWT) or store in a short-lived cache and return opaque token.
- **Validation:** Middleware on all `/api/albums/:id/*` and `/api/albums/:albumId/*`: verify token, ensure `albumId` matches route, optionally check “creator” for PATCH/DELETE album.
- **No session storage:** Stateless; client sends token in `Authorization: Bearer <token>` or a cookie.

---

## 4. Data layer

### 4.1 Firestore

- **Collection `albums`:**  
  `id`, `name`, `seedHash` (bcrypt of the 5-word seed string), `deleteOn` (date, e.g. ISO string), `createdAt`, `createdBy` (display name). Optionally `isCreator` stored per album for the creating client (or derive creator by “first createdBy” / separate creatorId if you prefer).

- **Collection `media`** (or subcollection `albums/{id}/media`):  
  `id`, `albumId`, `storagePath` (original), `previewPath` (nullable; compressed video or optional image preview), `thumbnailPath`, `displayName`, `uploaderName`, `size`, `mimeType`, `duplicateKey` (e.g. `filename|size`), `createdAt`. For video, `previewPath` null until processing completes.

- **Indexes:** Album list by `deleteOn` for cron; media list by `albumId` + `createdAt`.

### 4.2 Firebase Storage layout

- `albums/{albumId}/originals/{uniqueId}_{sanitizedFilename}` — original file.
- `albums/{albumId}/previews/{uniqueId}_{sanitizedFilename}.mp4` (or same extension) — compressed video (and optional preview image later).
- `albums/{albumId}/thumbnails/{uniqueId}.jpg` — thumbnail image (client-uploaded for photos; server-generated for video).

Sanitize filenames (strip path, limit length, allow only safe chars) to avoid path traversal and broken URLs.

---

## 5. Auth and secrets

- **Seed:** Generate 5 words from BIP-39 list (crypto-random). Store only `bcrypt(seedString)` in Firestore. Return plain seed only in the create-album response once; never log it.
- **Album token:** JWT signed with `process.env.JWT_SECRET` or equivalent; short expiry (e.g. 24h). Claim: `albumId`, `exp`, optional `creator: true` for create flow.
- **Signed URLs:** Use Firebase Admin SDK to generate signed upload/download URLs; short expiry (e.g. 15 min upload, 1h download). Path restricted to the album’s folder.
- **Cron:** Require `Authorization: Bearer <CRON_SECRET>` or use Cloud Scheduler’s OIDC token so only the scheduler can call the delete-expired endpoint.

---

## 6. Upload flow (detailed)

1. **Prepare:** Client POSTs list of files (filename, size, mimeType). Express: validate album token; enforce ≤25 files; max file size (e.g. 500MB); MIME allowlist (image/*, video/*); magic-byte check (see Security); duplicate check (filename+size in Firestore). For each file, generate a unique Storage path and signed resumable upload URL; return `uploadId` + URL per file.
2. **Upload:** Client uploads each file directly to Storage via the signed URL (resumable). On progress/failure, update UI; on success, call finalize.
3. **Finalize:** Client POSTs list of { uploadId, storagePath, uploaderName, displayName }. Express creates media doc(s) (thumbnailPath from client upload if image; for video, thumbnailPath/previewPath initially null). Enqueue video processing job for each video (same process or a worker in same repo that reads from queue or Firestore “pending” list).
4. **Video job:** Worker/job downloads original from Storage, runs ffmpeg (compressed preview + one-frame thumbnail), uploads results to Storage, updates media doc with `previewPath` and `thumbnailPath`. On failure, leave previewPath null; UI can keep showing “Processing…” or fall back to original.

---

## 7. Security

- **Upload validation (Express):**  
  - MIME allowlist: `image/*`, `video/*` only.  
  - Magic-byte check for allowed types (e.g. JPEG, PNG, WebP, GIF, MP4, WebM) to avoid disguised executables or zip bombs.  
  - Max file size per file (e.g. 500MB) and per batch (e.g. 25 files).  
  - Reject archives (zip, etc.) and unknown extensions.  
  - Duplicate: (filename, size) already in album → 409.

- **Path safety:** Sanitize all filenames and paths; no `..` or absolute paths; restrict signed URLs to the album’s bucket path.

- **No execution:** Never execute or interpret user-uploaded content as code. Video processing: only ffmpeg on the file bytes; no shell injection (fixed args or strict escaping).

- **Rate limiting:** Optional: rate limit by IP or album token on prepare/finalize to reduce abuse (e.g. express-rate-limit).

---

## 8. Deployment

- **Frontend:** Build with Vite (`npm run build`); deploy `dist` to Firebase Hosting. Configure rewrites so `/api/*` goes to Cloud Run (or your Express URL).
- **Backend:** Build Express (tsc or esbuild); run on Cloud Run with Docker (Node image; include ffmpeg in image if processing runs in same container). Set env: `JWT_SECRET`, `CRON_SECRET`, Firebase Admin credentials (or default credentials in GCP).
- **Cron:** Cloud Scheduler job: HTTP GET/POST to `https://your-api.run.app/api/cron/delete-expired` with `Authorization: Bearer <CRON_SECRET>` (or use Cloud Scheduler’s OIDC). Schedule daily.

Alternative: run Express on a single VPS or Railway; cron on the same machine calling `curl` to the delete-expired endpoint. Same design; only hosting changes.

---

## 9. Video processing (same codebase)

- **Trigger:** After finalize for a video, push a job (e.g. add to a Firestore `jobs` collection with status `pending`, or use a in-memory queue if single instance). A worker loop in the same Node process (or a separate process in the same repo) picks up jobs.
- **Worker:** For each video job: download original from Storage to temp file; run ffmpeg to (1) produce compressed preview (e.g. 720p, H.264, reasonable bitrate), (2) extract one frame as JPEG thumbnail; upload both to Storage; update media doc with `previewPath` and `thumbnailPath`; delete temp file; mark job done.
- **ffmpeg:** Install in Docker image or on host. Example (adjust codec/bitrate as needed):  
  - Preview: `ffmpeg -i input.mp4 -vf scale=-2:720 -c:v libx264 -crf 23 -preset fast -an -movflags +faststart output.mp4`  
  - Thumbnail: `ffmpeg -i input.mp4 -vframes 1 -q:v 2 thumb.jpg`
- **Failure handling:** On error, mark job failed; leave `previewPath` null so UI can show “Processing…” or “Preview unavailable” and offer “Download original.”

---

## 10. Summary

- **Frontend:** React + Vite + TypeScript; resumable upload to Storage via signed URLs; thumbnail view and in-app playback from compressed preview when available.
- **Backend:** Express; all auth (seed hash, album token), validation, and orchestration in one place; Firestore + Storage behind service modules for portability.
- **Videos:** Original stored as-is; compressed preview + one-frame thumbnail generated by an async job (ffmpeg) in the same codebase; in-app view uses preview, download uses original.
- **Security:** Magic-byte + MIME + size + count limits; no execution of user content; signed URLs and short-lived tokens.
- **Deployment:** Firebase Hosting (SPA) + Cloud Run (Express + ffmpeg); Cloud Scheduler for daily delete of expired albums.

This design keeps Solution A’s single-codebase, vendor-agnostic approach and adds explicit support for compressed video and thumbnail view as agreed.
