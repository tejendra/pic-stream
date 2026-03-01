# Pic Stream – Implementation Work Items

Tasks derived from the technical design (Solution A). Each Feature is broken into User Stories that can be implemented and verified independently.

---

## Feature 1: Project setup and scaffolding (Must have)

Scaffolding, tooling, and shared configuration so frontend and backend can run and talk to Firebase.

### User Stories

#### [DONE] 1.1 Initialize repo

**Description**: Initialize a single repo with top-level directories `frontend/` and `backend/`. Add root `package.json` with npm workspaces: `["frontend", "backend"]`.

**Acceptance Criteria**:

- [x] Repo root contains exactly `frontend/` and `backend/` directories
- [x] Root `package.json` exists with `"workspaces": ["frontend", "backend"]`

#### 1.2 Scaffold frontend [DONE]

**Description**: Scaffold frontend with Vite, React, and TypeScript. Install React Router. In `vite.config.ts` set proxy: `/api` → `http://localhost:3001`. Add minimal `App` and a single route `/` that renders a placeholder.

**Acceptance Criteria**:

- [x] Running `npm run dev` from `frontend/` starts the dev server
- [x] Requests from the browser to `/api/*` are proxied to `http://localhost:3001`
- [x] Visiting `/` renders without error

#### 1.3 Scaffold backend

**Description**: Scaffold backend with Node, Express, and TypeScript. Build with `tsc`; run with `node dist/index.js`. Create under `backend/src/`: `index.ts`, `routes/`, `services/`, `middleware/`, `lib/`, `config.ts`. Wire CORS (allow frontend origin) and `express.json()`.

**Acceptance Criteria**:

- [ ] Backend starts on port 3001
- [ ] CORS allows the frontend origin
- [ ] JSON request bodies are parsed
- [ ] The directories `index.ts`, `routes/`, `services/`, `middleware/`, `lib/`, `config.ts` exist under `backend/src/`

#### 1.4 Configure Firebase

**Description**: Create a Firebase project and enable Firestore and Storage. In the backend, use Firebase Admin SDK with default credentials (Cloud Run) or `GOOGLE_APPLICATION_CREDENTIALS` for local dev. Do not add Firebase SDK to the frontend; frontend uses a single env var `VITE_API_URL` for the API base URL.

**Acceptance Criteria**:

- [ ] Backend can read/write Firestore and generate signed Storage URLs
- [ ] Frontend has no Firebase SDK and only uses `VITE_API_URL`
- [ ] No runtime errors from missing Firebase config in backend

#### 1.5 Define environment variables

**Description**: Define backend env vars: `JWT_SECRET`, `CRON_SECRET`, `GOOGLE_CLOUD_PROJECT`, `FIREBASE_STORAGE_BUCKET`. Document them in `backend/.env.example` with placeholder values. No real secrets committed.

**Acceptance Criteria**:

- [ ] `backend/.env.example` lists those four variables
- [ ] No secrets appear in the repo

---

## Feature 2: Data layer and shared contracts (Must have)

Firestore schema, Storage path conventions, and shared types so both frontend and backend agree on data shape.

### User Stories

#### 2.1 Define Firestore collections and indexes

**Description**: Define Firestore collection `albums` (fields: id, name, seedHash, deleteOn, createdAt, createdBy). Define subcollection `albums/{albumId}/media` (fields: id, storagePath, previewPath, thumbnailPath, displayName, uploaderName, size, mimeType, duplicateKey, createdAt). Create composite index: albums by deleteOn ascending. Create composite index: media by albumId + createdAt ascending.

**Acceptance Criteria**:

- [ ] Collection `albums` exists with exactly those fields
- [ ] Subcollection `albums/{albumId}/media` exists with exactly those fields
- [ ] Composite index on albums by deleteOn is created and deployed
- [ ] Composite index on media by albumId + createdAt is created and deployed
- [ ] Queries by deleteOn and by albumId+createdAt run without error

#### 2.2 Document Storage path layout and path helper

**Description**: Document Storage path layout: `albums/{albumId}/originals/{uniqueId}_{sanitizedFilename}`, `albums/{albumId}/previews/{uniqueId}_{sanitizedFilename}`, `albums/{albumId}/thumbnails/{uniqueId}.jpg`. Implement a path helper that rejects any segment containing `..`, limits path length to 200 characters, and allows only `[a-zA-Z0-9._-]` in filenames.

**Acceptance Criteria**:

- [ ] All Storage paths follow the documented layout
- [ ] Path helper exists and rejects invalid input
- [ ] Valid input produces paths under `albums/{albumId}/` only

#### 2.3 Add shared TypeScript types

**Description**: Add TypeScript interfaces in `backend/src/types.ts` for Album, Media, and upload request/response shapes. Add matching interfaces in `frontend/src/types.ts` (same field names and types). Backend and frontend use their local types for all API payloads.

**Acceptance Criteria**:

- [ ] Backend code imports from `backend/src/types.ts`
- [ ] Frontend code imports from `frontend/src/types.ts`
- [ ] Types match so request/response shapes are consistent

---

## Feature 3: Album access – create and open with seed (Must have)

End-to-end flow for creating an album and opening an album with the 5-word seed; no login.

### User Stories

#### 3.1 Implement seed generation

**Description**: Implement a BIP-39 word list (subset of 2048 words) and secure random selection of 5 words. Expose a function `generateSeed(): string` that returns the space-separated seed. Call it only from the album-creation handler.

**Acceptance Criteria**:

- [ ] Seed is exactly 5 words from the BIP-39 list
- [ ] Selection uses `crypto.randomBytes`
- [ ] The function is only invoked in the POST `/api/albums` handler

#### 3.2 Implement album creation API

**Description**: Implement POST `/api/albums` with body `{ name, deleteOn, createdBy }`. Generate seed via `generateSeed()`, compute `bcrypt.hash(seed, 10)`, create Firestore album doc with id, name, seedHash, deleteOn, createdAt, createdBy. Return 201 with `{ albumId, seed, token }` where token is a JWT (payload: albumId, exp 24h from now, creator: true). Never log the seed.

**Acceptance Criteria**:

- [ ] POST returns 201 and the three fields (albumId, seed, token)
- [ ] Album doc has seedHash, not plain seed
- [ ] Seed does not appear in any log

#### 3.3 Implement open album API

**Description**: Implement POST `/api/albums/open` with body `{ seed: string }`. Query albums and find the one where `bcrypt.compare(seed, album.seedHash)` is true. If found, return 200 with `{ token }` where token is a JWT (payload: albumId, exp 24h, creator: false). If not found, return 401.

**Acceptance Criteria**:

- [ ] Correct seed returns 200 and a JWT with albumId and exp
- [ ] Wrong seed returns 401
- [ ] Token from open has creator: false

#### 3.4 Implement JWT middleware

**Description**: Implement JWT middleware: verify `Authorization: Bearer <token>`, decode with `JWT_SECRET`, ensure `token.albumId` matches route param `:id` or `:albumId`. Attach decoded payload to `req.albumToken`. Reject with 401 if missing, invalid, or mismatch.

**Acceptance Criteria**:

- [ ] Valid token with matching albumId sets `req.albumToken`
- [ ] Any other case (missing, invalid, mismatch) returns 401

#### 3.5 Create album form (frontend)

**Description**: Frontend: Create album page with form fields name, delete-on date (date input), creator name. On submit POST `/api/albums`, receive seed and token. Show "Save this seed" with a "Copy" button that copies the seed to clipboard and a "Download" button that downloads a text file containing the seed. Store token and albumId in localStorage under key `album_${albumId}`. Redirect to `/album/${albumId}`.

**Acceptance Criteria**:

- [ ] User can submit the form
- [ ] Seed is shown once with Copy and Download buttons
- [ ] Token and albumId are stored in localStorage under `album_${albumId}`
- [ ] User is redirected to the album page

---

## Feature 4: Open album and recent albums – frontend (Must have)

User can open an existing album by entering the seed or by choosing a recent album from local storage.

### User Stories

#### 4.1 Open album flow (frontend)

**Description**: Frontend: "Open album" page with a single text input for the 5-word seed. On submit POST `/api/albums/open` with body `{ seed: inputValue }`. On 200 store token in localStorage under `album_${albumId}` and redirect to `/album/${albumId}`. On 401 show error message "Invalid seed".

**Acceptance Criteria**:

- [ ] User can paste or type the seed and submit
- [ ] Success stores token and redirects to album page
- [ ] Invalid seed shows "Invalid seed"

#### 4.2 Recent albums list (frontend)

**Description**: Frontend: Store recent albums in localStorage under key `recentAlbums` as JSON array of `{ albumId, name }`. On landing page load, read `recentAlbums` and display a list. On item click: read token from `album_${albumId}`; if missing or JWT exp in the past, show "Re-enter seed" and link to open flow; else navigate to `/album/${albumId}`.

**Acceptance Criteria**:

- [ ] Recent albums appear on landing
- [ ] Click with valid token navigates to album page
- [ ] Expired or missing token shows re-enter seed

---

## Feature 5: Album management – view, update delete date, delete album (Must have)

Creator can view album details, change delete date, and delete the entire album. All users with token can view album details.

### User Stories

#### 5.1 Get album details API

**Description**: Backend: GET `/api/albums/:id` (auth: album token). Return 200 with `{ name, deleteOn, createdBy, isCreator }` where isCreator is `req.albumToken.creator === true`. Return 403 if token.albumId does not match id.

**Acceptance Criteria**:

- [ ] Authenticated request with matching albumId returns 200 and the four fields
- [ ] Mismatch returns 403

#### 5.2 Update album API

**Description**: Backend: PATCH `/api/albums/:id` (auth: album token, require `req.albumToken.creator === true`). Body: `{ deleteOn?: string, name?: string }`. Update Firestore album doc. Return 200 with updated album. Return 403 if not creator.

**Acceptance Criteria**:

- [ ] Creator can PATCH and get 200 with updated album
- [ ] Non-creator gets 403
- [ ] Firestore doc is updated

#### 5.3 Delete album API

**Description**: Backend: DELETE `/api/albums/:id` (auth: album token, require creator). List all media in subcollection; delete each object from Storage (storagePath, previewPath, thumbnailPath); delete each media doc; delete album doc. Return 204. Return 403 if not creator.

**Acceptance Criteria**:

- [ ] Creator gets 204 and album + media are removed from Firestore and Storage
- [ ] Non-creator gets 403

#### 5.4 Album management UI (frontend)

**Description**: Frontend: Album page loads GET `/api/albums/:id`. If `response.isCreator` is true, show "Edit delete date" and "Delete album". Edit: modal with date input, on save PATCH with `{ deleteOn }`. Delete: confirm "Delete entire album? This cannot be undone.", on confirm DELETE then redirect to `/` and remove this albumId from localStorage `recentAlbums` and `album_${albumId}`.

**Acceptance Criteria**:

- [ ] Creator sees both controls (Edit delete date, Delete album)
- [ ] Edit updates date via PATCH
- [ ] Delete shows confirmation and then redirects and clears localStorage for this album

---

## Feature 6: Upload validation and security (Must have)

Validate all uploads: type, size, count, duplicate, and path safety. No execution of user content.

### User Stories

#### 6.1 MIME allowlist

**Description**: Backend: MIME allowlist is exactly image/jpeg, image/png, image/webp, image/gif, video/mp4, video/webm. Reject any other MIME with 400 and body `{ error: "File type not allowed" }`.

**Acceptance Criteria**:

- [ ] Only those six MIME types are accepted
- [ ] Any other returns 400 with that message

#### 6.2 Magic-byte check

**Description**: Backend: Implement magic-byte check for the six types (JPEG, PNG, WebP, GIF, MP4, WebM). Reject with 400 and body `{ error: "Invalid file signature" }` if the file header does not match the declared MIME.

**Acceptance Criteria**:

- [ ] Files with correct magic bytes for their MIME pass
- [ ] Mismatch returns 400 with that message

#### 6.3 File size and count limits

**Description**: Backend: Enforce max file size 500MB per file and max 25 files per prepare request. Return 400 with body `{ error: "File too large" }` or `{ error: "Too many files" }` when exceeded.

**Acceptance Criteria**:

- [ ] Over 500MB per file returns 400 "File too large"
- [ ] Over 25 files returns 400 "Too many files"

#### 6.4 Path safety and signed URL scope

**Description**: Backend: All Storage paths are under `albums/{albumId}/`. Path helper sanitizes filenames (no `..`, max 200 chars, only `[a-zA-Z0-9._-]`). Signed URLs are generated only for paths under the requesting album's folder. Reject any path containing `..` or absolute segments with 400.

**Acceptance Criteria**:

- [ ] No path leaves the album folder
- [ ] Signed URLs only reference that album's paths
- [ ] Invalid path returns 400

#### 6.5 Rate limiting (Could have)

**Description**: Backend: Add express-rate-limit on POST `/api/albums/:albumId/upload/prepare` and POST `.../upload/finalize`: 30 requests per 15 minutes per album token. Return 429 when exceeded.

**Acceptance Criteria**:

- [ ] When implemented: more than 30 requests in 15 minutes from the same token returns 429

---

## Feature 7: Upload flow – prepare, upload, finalize (Must have)

Backend issues signed upload URLs; client uploads to Storage; backend creates media docs and enqueues video jobs.

### User Stories

#### 7.1 Prepare upload API

**Description**: Backend: POST `/api/albums/:albumId/upload/prepare` (auth: album token). Body: `{ files: [{ filename, size, mimeType }] }`. Validate MIME allowlist, size ≤500MB per file, count ≤25. For each file check duplicate by (filename + size) in album media; build list of duplicates. For each non-duplicate generate unique storage path and signed resumable upload URL (expiry 15 min). Return 200 with `{ uploads: [{ uploadId, signedUploadUrl, storagePath }], duplicates: [{ filename, size }] }`.

**Acceptance Criteria**:

- [ ] Valid request returns 200 with uploads and duplicates arrays
- [ ] Duplicates are not in uploads array
- [ ] URLs expire in 15 minutes

#### 7.2 Finalize upload API

**Description**: Backend: POST `/api/albums/:albumId/upload/finalize` (auth: album token). Body: `{ uploads: [{ uploadId, storagePath, uploaderName, displayName? }] }`. For each item: read first 512 bytes from Storage at storagePath, run magic-byte check; if fail return 400. Create media doc in `albums/{albumId}/media` with storagePath, uploaderName, displayName, size, mimeType, duplicateKey; set thumbnailPath and previewPath to null for all (v1: no client thumbnail upload). For video mimeType create a doc in Firestore collection `jobs` with albumId, mediaId, status "pending", createdAt, updatedAt. Return 200 with `{ mediaIds: string[] }`.

**Acceptance Criteria**:

- [ ] Each upload becomes a media doc with thumbnailPath and previewPath null
- [ ] Video creates a job doc with status pending
- [ ] Magic-byte failure returns 400
- [ ] Response lists created media IDs

#### 7.3 Upload UI (frontend)

**Description**: Frontend: Upload UI: file input (multiple, accept images and video), max 25 files. Call prepare with `{ files: [{ filename, size, mimeType }] }`. For each item in response.uploads upload the file to signedUploadUrl using fetch (PUT, body = file blob). Show per-file progress using XMLHttpRequest. When all uploads complete call finalize with `{ uploads: [{ uploadId, storagePath, uploaderName, displayName }] }` (no thumbnail in v1). If response.duplicates length > 0 show "Already in album" for those filenames and do not upload them.

**Acceptance Criteria**:

- [ ] User selects up to 25 files
- [ ] Progress is shown per file
- [ ] prepare → upload to URL → finalize runs successfully
- [ ] Duplicate filenames are not uploaded and user sees "Already in album"

#### 7.4 Handle duplicate response in frontend

**Description**: Frontend: When prepare returns duplicates, display the list of duplicate filenames and do not include them in the upload or finalize payload. Finalize is called with only the non-duplicate uploads.

**Acceptance Criteria**:

- [ ] Duplicate files are omitted from upload and from finalize body
- [ ] UI shows which files were skipped

---

## Feature 8: Media listing, viewing, and download (Must have)

List media in an album; view thumbnails and full/preview content; download original.

### User Stories

#### 8.1 List media API

**Description**: Backend: GET `/api/albums/:albumId/media` (auth: album token). Query subcollection `albums/{albumId}/media` orderBy createdAt ascending. Return 200 with `{ media: [{ id, thumbnailPath, previewPath, storagePath, displayName, uploaderName, size, mimeType, createdAt }] }`. Include items where previewPath is null.

**Acceptance Criteria**:

- [ ] Response is an array of media with those fields in createdAt order
- [ ] Items with null previewPath are included

#### 8.2 Get signed URL API

**Description**: Backend: GET `/api/albums/:albumId/media/:mediaId/url?type=original|preview|thumbnail` (auth: album token). Resolve path from media doc (storagePath, previewPath, or thumbnailPath by type). Generate signed download URL (expiry 1 hour). Return 200 with `{ url }`. Invalid type returns 400. Unknown mediaId returns 404.

**Acceptance Criteria**:

- [ ] Valid type returns 200 with url
- [ ] Invalid type returns 400
- [ ] Missing media returns 404
- [ ] URL expires in 1 hour

#### 8.3 Delete media API

**Description**: Backend: DELETE `/api/albums/:albumId/media/:mediaId` (auth: album token). Delete the media doc. Delete Storage objects at storagePath, previewPath (if set), thumbnailPath (if set). Return 204.

**Acceptance Criteria**:

- [ ] Media doc is deleted
- [ ] All three Storage paths are deleted when present
- [ ] Response is 204

#### 8.4 Media grid and viewer (frontend)

**Description**: Frontend: Album page displays media in a grid. Each cell: for image mimeType use url type=original and display in a 200px box (object-fit: cover); for video use url type=thumbnail when thumbnailPath is set else show placeholder "Processing…". Show uploader name and display name. Click: open modal; image uses url type=original; video uses url type=preview (or type=original if previewPath null). "Download original" button: fetch url type=original, response.blob(), create object URL, create `<a download>`, trigger click. "Delete" button: confirm "Remove this item?", then DELETE, then refetch media list and update grid.

**Acceptance Criteria**:

- [ ] Grid shows image (original scaled) or video thumbnail/placeholder and names
- [ ] Click opens modal with full image or video
- [ ] Download triggers file download of the original
- [ ] Delete shows confirmation and then removes item from grid

#### 8.5 Video processing state (frontend)

**Description**: Frontend: For media where mimeType is video and previewPath is null, show "Processing…" in the grid cell. Poll GET `/api/albums/:albumId/media` every 10 seconds; when the media item has previewPath set, show the thumbnail and enable play. Playback uses the URL with type=preview.

**Acceptance Criteria**:

- [ ] Videos without preview show "Processing…"
- [ ] After previewPath is set (within 10s poll), thumbnail and play use preview URL

---

## Feature 9: Video processing – compressed preview + thumbnail (Must have)

Async job in same codebase: for each uploaded video, produce compressed preview and one-frame thumbnail; update media doc.

### User Stories

#### 9.1 Define jobs collection and create job on finalize

**Description**: Firestore collection `jobs`: fields id, albumId, mediaId, status (string: "pending" | "processing" | "done" | "failed"), createdAt, updatedAt. When finalize creates a media doc for a video, create a job doc with status "pending".

**Acceptance Criteria**:

- [ ] Job doc is created with status "pending" for each video in finalize
- [ ] Collection and field names match

#### 9.2 Implement video processing worker

**Description**: Worker: separate Node process (`node dist/worker.js`). Loop: query Firestore `jobs` where status == "pending", limit 1, order by createdAt. For each: set status "processing"; load media doc; download original from Storage to temp file; run ffmpeg to produce (1) compressed preview 720p H.264 faststart to temp file, (2) one-frame thumbnail JPEG to temp file; upload preview to `albums/{albumId}/previews/`, thumbnail to `albums/{albumId}/thumbnails/`; update media doc with previewPath and thumbnailPath; set job status "done"; delete temp files. On error set job status "failed" and do not set previewPath/thumbnailPath.

**Acceptance Criteria**:

- [ ] Pending jobs are processed
- [ ] Media doc gets previewPath and thumbnailPath and job is "done", or job is "failed" and paths stay null
- [ ] Temp files are removed

#### 9.3 Secure ffmpeg invocation

**Description**: Worker runs ffmpeg via child_process.spawn with an array of arguments (no shell). Only the temp file path (generated by the app) is passed as input. Dockerfile installs ffmpeg (apt-get install -y ffmpeg).

**Acceptance Criteria**:

- [ ] ffmpeg is invoked with array args; no user-controlled string in shell
- [ ] ffmpeg is present in container

#### 9.4 In-memory queue alternative (Could have)

**Description**: Use an in-memory queue in the API process instead of Firestore: array of `{ albumId, mediaId }`. Finalize pushes to the array. setInterval 5s: shift one item, run the same processing as 9.2 (download, ffmpeg, upload, update media doc). No job docs.

**Acceptance Criteria**:

- [ ] When implemented: videos are processed via the in-memory queue and media doc is updated; no Firestore jobs collection used

---

## Feature 10: Expired album deletion – cron (Must have)

Scheduled job deletes albums whose deleteOn date has passed.

### User Stories

#### 10.1 Delete expired albums API

**Description**: Backend: POST `/api/cron/delete-expired` (no album token; require header `Authorization: Bearer <CRON_SECRET>`). Query Firestore albums where deleteOn <= today (ISO date string). For each: delete all media in Storage and subcollection, then delete album doc. Return 200 with JSON body `{ deleted: number }`. Missing or wrong header returns 401.

**Acceptance Criteria**:

- [ ] Valid CRON_SECRET returns 200 and count of deleted albums
- [ ] Invalid auth returns 401
- [ ] All albums with deleteOn <= today are removed

#### 10.2 Document cron trigger

**Description**: Document in README: "Cron: Send POST to https://<cloud-run-url>/api/cron/delete-expired with header Authorization: Bearer $CRON_SECRET. Example schedule: daily at 02:00 UTC. To test: curl -X POST -H 'Authorization: Bearer $CRON_SECRET' https://<url>/api/cron/delete-expired"

**Acceptance Criteria**:

- [ ] README contains that sentence and curl example

---

## Feature 11: Landing and navigation (Must have)

Landing page and navigation so users can create or open an album and reach the album page.

### User Stories

#### 11.1 Landing page

**Description**: Frontend: Landing page shows two buttons "Create album" and "Open album". Below, a "Recent albums" list: read localStorage `recentAlbums` and render each item as a clickable row (show name or "Album" + albumId). Click navigates to album (same logic as 4.2).

**Acceptance Criteria**:

- [ ] Landing has both buttons and recent list
- [ ] Clicking recent navigates to album when token is valid

#### 11.2 Routes and API client

**Description**: Frontend: Routes: `/` (landing), `/create` (create form), `/album/:albumId` (album page). Store token in localStorage `album_${albumId}`. API client: for every request to `/api` attach header `Authorization: Bearer ${token}` where token is read from localStorage for the current albumId.

**Acceptance Criteria**:

- [ ] All three routes work
- [ ] Requests from album page include the correct Bearer token

#### 11.3 Expired token handling

**Description**: Frontend: On load of `/album/:albumId`, read token from `album_${albumId}`. If missing or JWT exp < now, redirect to `/` and set sessionStorage message "Session expired. Re-enter seed to open this album." Landing page shows that message when sessionStorage is set and clears it after display.

**Acceptance Criteria**:

- [ ] Expired or missing token redirects to landing with message
- [ ] User can use "Open album" to re-enter seed

---

## Feature 12: Album page UX and creator actions (Must have)

Full album page: upload area, media grid, view/download/delete, and creator-only actions.

### User Stories

#### 12.1 Album page layout

**Description**: Frontend: Album page layout: header with album name and "Share" button (copy to clipboard: `window.location.origin` plus newline plus "To open this album, go to the link above and use 'Open album' with your 5-word seed."). Section "Add photos/videos" with file input. Grid of media (thumbnail, uploader name, display name).

**Acceptance Criteria**:

- [ ] Header shows name and Share button
- [ ] Share copies that text to clipboard
- [ ] Upload section and grid are visible

#### 12.2 Upload progress and refresh

**Description**: Frontend: Multi-file input; show a progress bar per file (percentage). After finalize returns 200, call GET media and replace grid with new list. Use fetch for upload; report progress via XMLHttpRequest or by tracking bytes sent.

**Acceptance Criteria**:

- [ ] Per-file progress is shown
- [ ] After finalize the grid refreshes with the new media list

#### 12.3 View media modal

**Description**: Frontend: Click thumbnail opens a modal. Image: `<img src={signedUrl} />` with url type=original. Video: `<video src={signedUrl} />` with url type=preview (or type=original if previewPath null). When previewPath is null show text "Processing…" inside the modal.

**Acceptance Criteria**:

- [ ] Modal opens on click
- [ ] Image shows full-size
- [ ] Video plays from preview or original
- [ ] "Processing…" shown when preview null

#### 12.4 Download and delete per item

**Description**: Frontend: "Download original" fetches url type=original, then response.blob(), create objectURL, create `<a href={objectURL} download={filename}>`, programmatic click. "Delete" shows confirm "Remove this item?"; on confirm DELETE then refetch media and update grid.

**Acceptance Criteria**:

- [ ] Download triggers browser download of the original file
- [ ] Delete shows confirmation and then removes the item from the grid

#### 12.5 Creator-only edit and delete album

**Description**: Frontend: Creator-only: "Edit delete date" opens modal with date input; on save PATCH with `{ deleteOn }`. "Delete album" opens confirm "Delete entire album? This cannot be undone."; on confirm DELETE album then redirect to `/`, remove this albumId from localStorage `recentAlbums` and `album_${albumId}`.

**Acceptance Criteria**:

- [ ] Creator sees edit and delete album controls
- [ ] Edit saves new date via PATCH
- [ ] Delete confirms and then redirects and clears localStorage

---

## Feature 13: Deployment and hosting (Must have)

Deploy frontend to Firebase Hosting and backend to Cloud Run; wire cron.

### User Stories

#### 13.1 Deploy frontend

**Description**: Build frontend: `cd frontend && npm run build` produces `dist/`. Deploy to Firebase Hosting. In `firebase.json` set rewrites: `{ "source": "/api/**", "run": { "serviceId": "<cloud-run-service>", "region": "<region>" } }` so `/api/*` is served by Cloud Run.

**Acceptance Criteria**:

- [ ] Frontend build succeeds
- [ ] Deploy to Hosting succeeds
- [ ] Requests to /api/* hit the Cloud Run service

#### 13.2 Deploy backend

**Description**: Backend: Build with `tsc`. Dockerfile: FROM node:20-slim; install ffmpeg (apt-get); copy backend, npm ci, run node dist/index.js. Deploy to Cloud Run. Set env vars: JWT_SECRET, CRON_SECRET, GOOGLE_CLOUD_PROJECT. Use default credentials in Cloud Run for Firebase Admin.

**Acceptance Criteria**:

- [ ] Backend image builds and runs on Cloud Run
- [ ] ffmpeg is in the image
- [ ] Env vars are set
- [ ] Firebase Admin works with default credentials

#### 13.3 Configure Cloud Scheduler

**Description**: Create Cloud Scheduler job: HTTP POST to `https://<cloud-run-url>/api/cron/delete-expired`, header `Authorization: Bearer <CRON_SECRET>` (store secret in Secret Manager or env). Schedule: 0 2 ** * (daily 02:00 UTC). README documents manual test: curl -X POST -H "Authorization: Bearer $CRON_SECRET" https://<url>/api/cron/delete-expired.

**Acceptance Criteria**:

- [ ] Scheduler job exists with that URL and auth
- [ ] README includes the curl command for manual test

---

## Suggested implementation order

1. **Feature 1** – Setup and scaffolding  
2. **Feature 2** – Data layer and contracts  
3. **Feature 3** – Album access (create + open + JWT)  
4. **Feature 6** – Upload validation and security (needed before upload)  
5. **Feature 7** – Upload flow (prepare, finalize; client upload and finalize UI)  
6. **Feature 5** – Album management (GET/PATCH/DELETE album)  
7. **Feature 8** – Media list, URLs, delete  
8. **Feature 11** – Landing and navigation  
9. **Feature 4** – Open album and recent albums  
10. **Feature 12** – Album page UX and creator actions  
11. **Feature 9** – Video processing worker  
12. **Feature 10** – Cron delete-expired  
13. **Feature 13** – Deployment  

This order delivers "create album → upload → view/download" early, then "open album" and "recent albums," then video processing and cron, then deployment.
