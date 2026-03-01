# Pic Stream

Just got back from an amazing vacation with hundreds of stunning photos? Don't let WhatsApp compress your memories into pixelated mush! This is your go-to app for sharing those crystal-clear vacation pics and videos in their full, glorious original quality with friends and family.

## How to start the app

1. **Install dependencies** (from repo root):

   ```bash
   npm install
   ```

2. **Backend** – Copy the env example and start the API:

   ```bash
   cp backend/.env-local-example backend/.env
   cd backend && npm run build && npm run start
   ```

   Backend runs at <http://localhost:3001>.

3. **Frontend** – In another terminal, start the dev server:

   ```bash
   cd frontend && npm run dev
   ```

   Open <http://localhost:5173> in your browser.

## Environment variables

Backend reads config from `backend/.env`. Copy `backend/.env-local-example` to `backend/.env` and set values. Do not commit `.env`.

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `3001` | Port the backend server listens on. |
| `CORS_ORIGIN` | `http://localhost:5173` | Allowed origin for CORS (frontend dev server URL). |
| `GOOGLE_CLOUD_PROJECT` | `pic-stream-34ace` | Firebase / Google Cloud project ID. Override for another project. |
| `FIREBASE_STORAGE_BUCKET` | `pic-stream-34ace.appspot.com` | Firebase Storage bucket. Override for another project. |
| `GOOGLE_APPLICATION_CREDENTIALS` | — | Path to service account JSON (local dev). Omit on Cloud Run. |

**Frontend** (optional): set `VITE_API_URL` for API base URL (e.g. `http://localhost:3001`). Empty = same origin (use dev proxy).

## Deploy to Firebase

Deploys the frontend (Hosting), Firestore rules, and Storage rules.

1. **Build the frontend** (required before deploying hosting):

   ```bash
   cd frontend && npm run build
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

## Deploy backend to Cloud Run

Build the container with **Cloud Build** (recommended; runs on amd64), then deploy. From repo root (replace `YOUR_PROJECT_ID`):

```bash
gcloud services enable cloudbuild.googleapis.com
gcloud builds submit --tag us-east1-docker.pkg.dev/YOUR_PROJECT_ID/pic-stream/pic-stream-api ./backend
gcloud run deploy pic-stream-api \
  --image us-east1-docker.pkg.dev/YOUR_PROJECT_ID/pic-stream/pic-stream-api \
  --region us-east1 \
  --platform managed \
  --set-env-vars "CORS_ORIGIN=https://YOUR_PROJECT_ID.web.app,GOOGLE_CLOUD_PROJECT=YOUR_PROJECT_ID,FIREBASE_STORAGE_BUCKET=YOUR_PROJECT_ID.appspot.com" \
  --allow-unauthenticated
```

Full setup (Artifact Registry repo, env vars, IAM) is in [docs/cloud-run.md](docs/cloud-run.md).

## Deploy order for production

Deploy in this order so the frontend points at the live API:

1. **Deploy the backend** (Cloud Run) using the steps above. Note the service URL (e.g. `https://pic-stream-api-xxxxx-ue.a.run.app`).

2. **Build the frontend** with that URL so the app calls your API in production:
   ```bash
   cd frontend
   VITE_API_URL=https://YOUR_CLOUD_RUN_URL npm run build
   ```

3. **Deploy the frontend** (Firebase Hosting):
   ```bash
   firebase deploy --only hosting
   ```
   Or run `firebase deploy` from the repo root to update hosting plus Firestore/Storage rules.

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
