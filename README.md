# Pic Stream

Just got back from an amazing vacation with hundreds of stunning photos? Don't let WhatsApp compress your memories into pixelated mush! This is your go-to app for sharing those crystal-clear vacation pics and videos in their full, glorious original quality with friends and family.

## How to start the app

The app has a **shared** package (types and optional utils) used by both backend and frontend. Build shared first, then backend/frontend.

1. **Shared** (from repo root):

   ```bash
   cd shared && npm install && npm run build && cd ..
   ```

2. **Backend** – Install, copy env example, build, and start:

   ```bash
   cd backend && npm install
   cp .env-local-example .env
   npm run build && npm run start
   ```

   Backend runs at <http://localhost:3001>.

3. **Frontend** – In another terminal, install and start the dev server:

   ```bash
   cd frontend && npm install && npm run dev
   ```

   Open <http://localhost:5173> in your browser.

## Environment variables

Backend reads config from `backend/.env`. For the full list with placeholders, see **`backend/.env.example`**. For local dev you can copy `backend/.env-local-example` to `backend/.env` (add any vars from `.env.example` as needed). Do not commit `.env`.

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `3001` | Port the backend server listens on. |
| `CORS_ORIGIN` | `http://localhost:5173` | Allowed origin for CORS (frontend dev server URL). |
| `JWT_SECRET` | — | Secret for signing album tokens (min 32 chars). Required for auth. |
| `CRON_SECRET` | — | Secret for securing `/api/cron/delete-expired` (Authorization: Bearer). |
| `GOOGLE_CLOUD_PROJECT` | `pic-stream-34ace` | Firebase / Google Cloud project ID. Override for another project. |
| `FIREBASE_STORAGE_BUCKET` | `pic-stream-34ace.firebasestorage.app` | Firebase Storage bucket. Override for another project. |
| `GOOGLE_APPLICATION_CREDENTIALS` | — | Path to service account JSON (local dev). Omit on Cloud Run. |

**Frontend** (optional): set `VITE_API_URL` for API base URL (e.g. `http://localhost:3001`). Empty = same origin (use dev proxy).

## Deploy backend to Cloud Run

The backend image is built from the **repo root** (so the Dockerfile can include the `shared` package). Use **Cloud Build** (recommended; runs on amd64), then deploy. From repo root (replace `YOUR_PROJECT_ID`):

```bash
gcloud services enable cloudbuild.googleapis.com
gcloud builds submit . --config=cloudbuild.yaml
gcloud run deploy pic-stream-api \
  --image us-east1-docker.pkg.dev/YOUR_PROJECT_ID/pic-stream/pic-stream-api \
  --region us-east1 \
  --platform managed \
  --set-env-vars "JWT_SECRET=your-secret-min-32-chars,CORS_ORIGIN=https://YOUR_PROJECT_ID.web.app,GOOGLE_CLOUD_PROJECT=YOUR_PROJECT_ID,FIREBASE_STORAGE_BUCKET=YOUR_PROJECT_ID.firebasestorage.app" \
  --allow-unauthenticated
```

Full setup (Artifact Registry repo, env vars, IAM) is in [docs/cloud-run.md](docs/cloud-run.md).

## Deploy to Firebase

Deploys the frontend (Hosting), Firestore rules, and Storage rules.

1. **Build shared and frontend** (shared must be built before frontend):

   ```bash
   cd shared && npm run build && cd ..
   cd frontend
   VITE_API_URL=https://YOUR_CLOUD_RUN_URL npm run build
   ```

2. **Deploy** (from repo root):

   ```bash
   firebase deploy
   ```

   This updates Hosting (from `frontend/dist`), Firestore rules, and Storage rules.

   To deploy only one service:

   ```bash
   firebase deploy --only hosting      # frontend only
   firebase deploy --only firestore   # Firestore rules + indexes only
   firebase deploy --only storage     # Storage rules only
   ```

   Ensure you're logged in (`firebase login`) and the project is set (see `.firebaserc`). For more on how Firebase is used, see [docs/firebase.md](docs/firebase.md).

## Project structure

| Path | Description |
|------|--------------|
| `shared/` | Shared TypeScript types (and optional utils) for backend and frontend. Build with `npm run build` before building backend or frontend. |
| `backend/` | Express API (Node.js). Depends on `shared` via `file:../shared`. |
| `frontend/` | React SPA (Vite). Depends on `shared` via `file:../shared`. |
| `docs/` | Firebase, Cloud Run, and schema docs. |
| `plan/` | Work items and implementation plans. |

## Technical Requirements

- **Firebase:** Hosting, database, and storage (self-hosted on free tier).
  - Store thumbnail + original for each item; support images and video.
- **Frontend:** Latest React, TypeScript, Vite.
- **Backend:** Node/Express.
- **Security & validation:** Harden against malicious uploads (zip bombs, executables/hidden payloads in images, etc.). Validate and sanitize all uploads; enforce file type, size, and count limits.
- **Upload:** Multi-file from mobile and desktop.
  - v1: Up to 25 files per batch (images + videos).
  - Large files: chunked/resumable or similar so large videos don’t fail or block the UI.
  - Duplicate detection: detect when the user is uploading a file that already exists in the album (e.g. by hash or name+size) and warn or prevent duplicate.

## Google Commands

- Check CORS config on storage
  - `gcloud storage buckets describe gs://pic-stream-34ace.firebasestorage.app --format="default(cors_config)"`
- Update/Apply CORS config on storage
  - `gcloud storage buckets update gs://pic-stream-34ace.firebasestorage.app --cors-file=storage-cors.json`
