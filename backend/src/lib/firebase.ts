import { readFileSync } from 'node:fs'
import { dirname, isAbsolute, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import admin from 'firebase-admin'
import { config, isFirebaseConfigured } from '../config.js'

let initialized = false

/** Backend root (folder containing package.json). Credentials path is resolved relative to this. */
const backendRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..')

function initFirebase(): void {
  if (initialized || !isFirebaseConfigured) return

  const credPath = process.env.GOOGLE_APPLICATION_CREDENTIALS
  const resolvedPath = credPath
    ? (isAbsolute(credPath) ? credPath : join(backendRoot, credPath))
    : ''

  if (resolvedPath) {
    try {
      const key = JSON.parse(readFileSync(resolvedPath, 'utf8'))
      admin.initializeApp({
        credential: admin.credential.cert(key),
        projectId: config.firebase.projectId,
      })
    } catch (err) {
      throw new Error(
        `Failed to load credentials from ${resolvedPath}: ${err instanceof Error ? err.message : err}`
      )
    }
  } else {
    admin.initializeApp({
      credential: admin.credential.applicationDefault(),
      projectId: config.firebase.projectId,
    })
  }
  initialized = true
}

export function ensureFirebase(): void {
  if (isFirebaseConfigured) initFirebase()
}
