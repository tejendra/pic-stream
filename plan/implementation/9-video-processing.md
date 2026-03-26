# Feature 9 — Video processing (preview + thumbnail)

## Summary

Firestore-backed jobs (already created on finalize for video) are processed by a separate Node worker that downloads the original, runs ffmpeg for 720p H.264 preview and a JPEG thumbnail, uploads to Storage, and commits media paths + job status in one Firestore batch.

## Approach

- **Backend**: `worker.ts` polls `jobs` (`status == pending`, `orderBy createdAt`, `limit 1`), claims a job in a transaction (`processing`), downloads the original to a temp dir, transcodes with `spawn('ffmpeg', args)` (no shell), uploads under `albums/{albumId}/previews/` and `thumbnails/`, then batch-updates media + job `done`. On failure: delete any uploaded preview/thumbnail objects, remove temp dir, set job `failed`; media paths stay unset.
- **Security**: ffmpeg only receives app-built temp paths and fixed flags; no shell interpolation.
- **Container**: Alpine run image installs ffmpeg via `apk add` (equivalent to the plan’s “install ffmpeg in image” requirement).

## Files to add or change

- `backend/src/worker.ts` — worker loop and processing pipeline
- `backend/src/lib/ffmpeg.ts` — `spawn` wrapper, preview + thumbnail argument arrays
- `backend/src/lib/storage.ts` — `downloadFileToPath`, `uploadLocalFile`
- `backend/package.json` — `npm run worker` → `node dist/worker.js`
- `backend/Dockerfile` — `ffmpeg` in run stage
- `firestore.indexes.json` — composite index on `jobs`: `status` + `createdAt`

## Operations

- Deploy the Firestore index (`firebase deploy --only firestore:indexes`) before relying on the worker query in production.
- Run the worker with the same Firebase credentials and env as the API (`GOOGLE_CLOUD_PROJECT`, `FIREBASE_STORAGE_BUCKET`, `GOOGLE_APPLICATION_CREDENTIALS` or default credentials). For Cloud Run, use a second service (or Cloud Run Job) with `CMD ["node","dist/worker.js"]` and the same image as the API.

## Acceptance criteria

- [x] **9.1** Job doc with status `pending` for each video on finalize; fields match (`id`, `albumId`, `mediaId`, `status`, `createdAt`, `updatedAt`)
- [x] **9.2** Pending jobs processed; media gets `previewPath`/`thumbnailPath` and job `done`, or job `failed` with paths null; temp files removed
- [x] **9.3** ffmpeg via `spawn` + array args; ffmpeg installed in container image
- [ ] **9.4** In-memory queue (optional alternative) — not implemented; Firestore worker is the chosen path
