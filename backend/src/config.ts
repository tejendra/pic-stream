const DEFAULT_PROJECT_ID = 'pic-stream-34ace'

export const config = {
  port: Number(process.env.PORT) || 3001,
  corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:5173',
  firebase: {
    projectId: process.env.GOOGLE_CLOUD_PROJECT ?? DEFAULT_PROJECT_ID,
    storageBucket: process.env.FIREBASE_STORAGE_BUCKET ?? `${DEFAULT_PROJECT_ID}.appspot.com`,
  },
}

export const isFirebaseConfigured =
  Boolean(config.firebase.projectId && config.firebase.storageBucket)
