import admin from 'firebase-admin'
import { config, isFirebaseConfigured } from '../config.js'

let initialized = false

function initFirebase(): void {
  if (initialized || !isFirebaseConfigured) return
  admin.initializeApp({
    credential: admin.credential.applicationDefault(),
    projectId: config.firebase.projectId,
  })
  initialized = true
}

export function ensureFirebase(): void {
  if (isFirebaseConfigured) initFirebase()
}
