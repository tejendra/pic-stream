# Configuring and deploying the backend to Cloud Run

The Express API in `backend/` is designed to run on **Google Cloud Run**. Cloud Run sets `PORT` (usually 8080) automatically; the app reads it from the environment. You do **not** set `GOOGLE_APPLICATION_CREDENTIALS` on Cloud Run—the service uses the default service account.

## Prerequisites

- [Google Cloud SDK (gcloud)](https://cloud.google.com/sdk/docs/install) installed and logged in.
- A Google Cloud project (same as your Firebase project). Set it:

  ```bash
  gcloud config set project YOUR_PROJECT_ID
  ```

- APIs enabled: **Cloud Run** and **Artifact Registry** (for storing the container image). Run:

  ```bash
  gcloud services enable run.googleapis.com
  gcloud services enable artifactregistry.googleapis.com
  ```

  (You can use Container Registry instead—enable `containerregistry.googleapis.com`—but Artifact Registry is the recommended option.)

## 1. Create an Artifact Registry repository (once per project)

Pick a **region** (e.g. `us-east1` to match Cloud Run). Create a Docker repository:

```bash
gcloud artifacts repositories create pic-stream \
  --repository-format=docker \
  --location=us-east1 \
  --description="Pic Stream container images"
```

Use the same `--location` as your Cloud Run service.

## 2. Build and push the container image

Cloud Run needs a **linux/amd64** image. On Apple Silicon, local `docker build --platform linux/amd64` can still produce the wrong architecture. The reliable approach is to **build in the cloud** with Cloud Build (runs on amd64 and pushes to Artifact Registry in one step).

**Option A: Build with Cloud Build (recommended on Apple Silicon)**

From the **repo root**. Enable the Cloud Build API if you haven’t:

```bash
gcloud services enable cloudbuild.googleapis.com
```

Then build and push in one command (replace `YOUR_PROJECT_ID`):

```bash
gcloud builds submit --tag us-east1-docker.pkg.dev/YOUR_PROJECT_ID/pic-stream/pic-stream-api ./backend
```

Cloud Build runs the build on amd64, pushes the image to Artifact Registry, and you skip step 3.

**Option B: Build locally (Intel/AMD or if you’ve verified amd64)**

From the **repo root**:

```bash
docker build --platform linux/amd64 -t us-east1-docker.pkg.dev/YOUR_PROJECT_ID/pic-stream/pic-stream-api ./backend
```

Confirm the image is amd64: `docker inspect us-east1-docker.pkg.dev/YOUR_PROJECT_ID/pic-stream/pic-stream-api --format '{{.Architecture}}'` (should print `amd64`). Then push (step 3).

Replace `YOUR_PROJECT_ID`. If you used a different region or repository name, use `REGION-docker.pkg.dev/YOUR_PROJECT_ID/REPO_NAME/pic-stream-api`.

## 3. Push the image (only if you built locally in Option B)

Configure Docker for Artifact Registry, then push:

```bash
gcloud auth configure-docker us-east1-docker.pkg.dev
docker push us-east1-docker.pkg.dev/YOUR_PROJECT_ID/pic-stream/pic-stream-api
```

If you used Cloud Build (Option A), the image is already in Artifact Registry; skip to step 4.

**Use a project-local Docker config (optional)**  
To keep the registry config in the project instead of `~/.docker/config.json`, set `DOCKER_CONFIG` to the project’s `.docker` directory before running the configure and push commands:

```bash
export DOCKER_CONFIG="$(pwd)/.docker"
mkdir -p .docker
gcloud auth configure-docker us-east1-docker.pkg.dev
docker push us-east1-docker.pkg.dev/YOUR_PROJECT_ID/pic-stream/pic-stream-api
```

Use the same `export` in any shell where you run `docker build`/`docker push` for this project. The `.docker/` directory is in `.gitignore`.

## 4. Deploy to Cloud Run

```bash
gcloud run deploy pic-stream-api \
  --image us-east1-docker.pkg.dev/YOUR_PROJECT_ID/pic-stream/pic-stream-api \
  --region us-east1 \
  --platform managed \
  --allow-unauthenticated
```

Use `--allow-unauthenticated` if the API is public (e.g. called from the SPA). For a private API, omit it and use IAM or a load balancer in front.

## 5. Set environment variables

Cloud Run needs the same env vars as local, except credentials (handled by the default service account).

| Variable | Example / note |
|----------|----------------|
| `PORT` | Set automatically by Cloud Run (e.g. 8080). Do not override unless needed. |
| `CORS_ORIGIN` | Your frontend origin, e.g. `https://YOUR_PROJECT_ID.web.app` (Firebase Hosting). |
| `GOOGLE_CLOUD_PROJECT` | Your Firebase/Google Cloud project ID. |
| `FIREBASE_STORAGE_BUCKET` | Your Storage bucket, e.g. `YOUR_PROJECT_ID.appspot.com`. |

Set them at deploy time:

```bash
gcloud run deploy pic-stream-api \
  --image us-east1-docker.pkg.dev/YOUR_PROJECT_ID/pic-stream/pic-stream-api \
  --region us-east1 \
  --platform managed \
  --set-env-vars "CORS_ORIGIN=https://YOUR_PROJECT_ID.web.app,GOOGLE_CLOUD_PROJECT=YOUR_PROJECT_ID,FIREBASE_STORAGE_BUCKET=YOUR_PROJECT_ID.appspot.com" \
  --allow-unauthenticated
```

Or in the [Cloud Run console](https://console.cloud.google.com/run): select the service → Edit & deploy new revision → Variables & secrets.

## 6. Service account permissions

The Cloud Run service uses the **default compute service account** (`PROJECT_NUMBER-compute@developer.gserviceaccount.com`) unless you configure a different one. That account needs:

- **Firestore:** Cloud Datastore User (or a custom role with Firestore access).
- **Storage:** Storage Object Admin (or scoped to the bucket you use).

In the console: IAM & Admin → find the service account → add the roles above. Or with gcloud:

```bash
PROJECT_NUMBER=$(gcloud projects describe YOUR_PROJECT_ID --format='value(projectNumber)')
gcloud projects add-iam-policy-binding YOUR_PROJECT_ID \
  --member="serviceAccount:${PROJECT_NUMBER}-compute@developer.gserviceaccount.com" \
  --role="roles/datastore.user"
gcloud projects add-iam-policy-binding YOUR_PROJECT_ID \
  --member="serviceAccount:${PROJECT_NUMBER}-compute@developer.gserviceaccount.com" \
  --role="roles/storage.objectAdmin"
```

## 7. Point the frontend at the API

After deploy, Cloud Run gives you a URL like `https://pic-stream-api-xxxxx-ue.a.run.app`. For production:

1. Set **Firebase Hosting** (or your SPA host) so the app is served from your chosen domain.
2. Set the frontend build-time env so the app calls the Cloud Run URL, e.g.:

   ```bash
   VITE_API_URL=https://pic-stream-api-xxxxx-ue.a.run.app
   ```

   Then rebuild and redeploy the frontend (`npm run build` in `frontend/`, then `firebase deploy --only hosting`).

Optionally, put the API behind the same domain as the SPA using a [Firebase Hosting rewrite](https://firebase.google.com/docs/hosting/full-config#rewrites) to a Cloud Run service, so you don’t need a separate `VITE_API_URL` in production.

## One-command deploy (source-based)

You can also deploy from source without building Docker locally; Cloud Build will build the image and deploy:

```bash
gcloud run deploy pic-stream-api \
  --source ./backend \
  --region us-east1 \
  --platform managed \
  --set-env-vars "CORS_ORIGIN=https://YOUR_PROJECT_ID.web.app,GOOGLE_CLOUD_PROJECT=YOUR_PROJECT_ID,FIREBASE_STORAGE_BUCKET=YOUR_PROJECT_ID.appspot.com" \
  --allow-unauthenticated
```

This uses the same Dockerfile in `backend/` if present; otherwise Cloud Build may use buildpacks. Prefer committing the Dockerfile so the build is reproducible.
