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
