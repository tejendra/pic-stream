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
  mimeType: string,
  expiresInMs: number = DEFAULT_EXPIRY_MS
): Promise<string | null> {
  const bucket = getBucket()
  if (!bucket) return null
  const [url] = await bucket.file(path).getSignedUrl({
    version: 'v4',
    action: 'write',
    expires: Date.now() + expiresInMs,
    contentType: mimeType,
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

/**
 * Download the first maxBytes of a file from Storage (for magic-byte check).
 * Returns empty buffer if file not found or read fails.
 */
export async function downloadFileHead(
  path: string,
  maxBytes: number = 512
): Promise<Buffer> {
  const bucket = getBucket()
  if (!bucket) return Buffer.alloc(0)
  const file = bucket.file(path)
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = []
    let length = 0
    const stream = file.createReadStream({ start: 0, end: maxBytes - 1 })
    stream.on('data', (chunk: Buffer) => {
      if (length + chunk.length <= maxBytes) {
        chunks.push(chunk)
        length += chunk.length
      } else {
        chunks.push(chunk.subarray(0, maxBytes - length))
        length = maxBytes
        stream.destroy()
      }
    })
    stream.on('end', () => resolve(Buffer.concat(chunks)))
    stream.on('error', reject)
  })
}

export async function deleteFile(path: string): Promise<void> {
  const bucket = getBucket()
  if (!bucket) return
  const file = bucket.file(path)
  try {
    await file.delete()
  } catch (err: unknown) {
    if (typeof err === 'object' && err !== null && 'code' in err && (err as { code: number }).code === 404) {
      return
    }
    throw err
  }
}

/** Download full object to a local path (for worker transcoding). */
export async function downloadFileToPath(storagePath: string, destination: string): Promise<void> {
  const bucket = getBucket()
  if (!bucket) throw new Error('Storage unavailable')
  await bucket.file(storagePath).download({ destination })
}

/** Upload a local file to Storage with the given content type. */
export async function uploadLocalFile(
  localPath: string,
  destination: string,
  contentType: string
): Promise<void> {
  const bucket = getBucket()
  if (!bucket) throw new Error('Storage unavailable')
  await bucket.upload(localPath, {
    destination,
    metadata: { contentType },
  })
}
