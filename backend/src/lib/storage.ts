import admin from 'firebase-admin'
import { config, isFirebaseConfigured } from '../config.js'
import { ensureFirebase } from './firebase.js'

const DEFAULT_EXPIRY_MS = 15 * 60 * 1000 // 15 minutes

export function getBucket(): ReturnType<admin.storage.Storage['bucket']> | null {
  if (!admin.apps.length) ensureFirebase()
  if (!admin.apps.length || !config.firebase.storageBucket) return null
  return admin.storage().bucket(config.firebase.storageBucket)
}

export async function getSignedUploadUrl(
  path: string,
  expiresInMs: number = DEFAULT_EXPIRY_MS
): Promise<string | null> {
  const bucket = getBucket()
  if (!bucket) return null
  const [url] = await bucket.file(path).getSignedUrl({
    version: 'v4',
    action: 'write',
    expires: Date.now() + expiresInMs,
  })
  return url
}

export async function getSignedDownloadUrl(
  path: string,
  expiresInMs: number = DEFAULT_EXPIRY_MS
): Promise<string | null> {
  const bucket = getBucket()
  if (!bucket) return null
  const [url] = await bucket.file(path).getSignedUrl({
    version: 'v4',
    action: 'read',
    expires: Date.now() + expiresInMs,
  })
  return url
}
