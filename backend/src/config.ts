import 'dotenv/config'

const DEFAULT_PROJECT_ID = 'pic-stream-34ace'

// GOOGLE_APPLICATION_CREDENTIALS (path to service account JSON) is read by Firebase Admin
// via credential.applicationDefault() — set it in .env for local dev; no need to add it here.

export const config = {
  port: Number(process.env.PORT) || 3001,
  corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:5173',
  jwtSecret: process.env.JWT_SECRET ?? '',
  firebase: {
    projectId: process.env.GOOGLE_CLOUD_PROJECT ?? DEFAULT_PROJECT_ID,
    storageBucket: process.env.FIREBASE_STORAGE_BUCKET ?? `${DEFAULT_PROJECT_ID}.appspot.com`,
  },
}

export const isFirebaseConfigured =
  Boolean(config.firebase.projectId && config.firebase.storageBucket)
