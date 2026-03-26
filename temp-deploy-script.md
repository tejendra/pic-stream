```bash
gcloud builds submit . --config=cloudbuild.yaml
gcloud run deploy pic-stream-api \
  --image us-east1-docker.pkg.dev/pic-stream-34ace/pic-stream/pic-stream-api \
  --region us-east1 \
  --platform managed \
  --set-env-vars "JWT_SECRET=sPTwtsdlYnmG7FI5_zvtRk3Us4bv4WuP8fPxFvcUdi4,CORS_ORIGIN=https://pic-stream-34ace.web.app,GOOGLE_CLOUD_PROJECT=pic-stream-34ace,FIREBASE_STORAGE_BUCKET=pic-stream-34ace.firebasestorage.app" \
  --allow-unauthenticated

cd shared && npm run build && cd ..
cd frontend
VITE_API_URL=https://pic-stream-api-251580259283.us-east1.run.app npm run build

cd ..

firebase deploy
```
