/**
 * In-memory store for prepare→finalize: uploadId → { mimeType, storagePath }.
 * Entries expire after 15 minutes (same as signed URL).
 */

const UPLOAD_SESSION_TTL_MS = 15 * 60 * 1000

interface SessionEntry {
  mimeType: string
  storagePath: string
  size: number
  duplicateKey: string
  expiresAt: number
}

const store = new Map<string, SessionEntry>()

function prune(): void {
  const now = Date.now()
  for (const [id, entry] of store.entries()) {
    if (entry.expiresAt <= now) store.delete(id)
  }
}

export function setUploadSession(
  uploadId: string,
  mimeType: string,
  storagePath: string,
  size: number,
  duplicateKey: string
): void {
  prune()
  store.set(uploadId, {
    mimeType,
    storagePath,
    size,
    duplicateKey,
    expiresAt: Date.now() + UPLOAD_SESSION_TTL_MS,
  })
}

export function getUploadSession(uploadId: string): {
  mimeType: string
  storagePath: string
  size: number
  duplicateKey: string
} | null {
  const entry = store.get(uploadId)
  if (!entry || entry.expiresAt <= Date.now()) {
    store.delete(uploadId)
    return null
  }
  return {
    mimeType: entry.mimeType,
    storagePath: entry.storagePath,
    size: entry.size,
    duplicateKey: entry.duplicateKey,
  }
}

export function deleteUploadSession(uploadId: string): void {
  store.delete(uploadId)
}
