/**
 * Storage path helper. All paths are under albums/{albumId}/.
 * Rejects segments containing '..', enforces length ≤ 200, allows only [a-zA-Z0-9._-].
 */

export const MAX_STORAGE_PATH_LENGTH = 200

const SAFE_SEGMENT_REGEX = /^[a-zA-Z0-9._-]+$/

function isSegmentSafe(segment: string): boolean {
  if (segment === '..' || segment.includes('..')) return false
  return SAFE_SEGMENT_REGEX.test(segment)
}

/**
 * Sanitizes a filename for use in a storage path: basename only.
 * Replaces spaces and other disallowed chars with underscore so paths stay safe; only [a-zA-Z0-9._-] allowed.
 * Returns null if invalid (contains '..', or empty after basename/sanitization).
 */
export function sanitizeFilename(filename: string): string | null {
  if (filename.includes('..')) return null
  const basename = filename.replace(/^.*[/\\]/, '')
  if (basename === '' || basename === '..') return null
  const sanitized = basename.replace(/[^a-zA-Z0-9._-]+/g, '_').replace(/^_+|_+$/g, '') || null
  if (sanitized === null || sanitized === '' || sanitized === '..') return null
  return sanitized
}

export type StoragePathType = 'originals' | 'previews' | 'thumbnails'

/**
 * Builds a storage path under albums/{albumId}/.
 * Returns null if any segment is invalid or total path length would exceed MAX_STORAGE_PATH_LENGTH.
 */
export function buildStoragePath(
  albumId: string,
  type: StoragePathType,
  uniqueId: string,
  filename?: string
): string | null {
  if (!isSegmentSafe(albumId) || !isSegmentSafe(uniqueId)) return null

  if (type === 'thumbnails') {
    const path = `albums/${albumId}/thumbnails/${uniqueId}.jpg`
    return path.length <= MAX_STORAGE_PATH_LENGTH ? path : null
  }

  if (filename === undefined || filename === '' || filename.includes('..')) return null
  const sanitized = sanitizeFilename(filename)
  if (sanitized === null) return null

  const path = `albums/${albumId}/${type}/${uniqueId}_${sanitized}`
  return path.length <= MAX_STORAGE_PATH_LENGTH ? path : null
}

/** 6.4 Path safety: path must be under albums/{albumId}/, no '..', no absolute. */
export function isPathUnderAlbum(albumId: string, path: string): boolean {
  if (!path || path.includes('..')) return false
  const normalized = path.replace(/\\/g, '/').trim()
  if (normalized.startsWith('/')) return false
  const prefix = `albums/${albumId}/`
  if (!normalized.startsWith(prefix)) return false
  const rest = normalized.slice(prefix.length)
  if (rest === '' || rest.includes('/..') || rest.startsWith('..')) return false
  return rest.split('/').every((seg) => isSegmentSafe(seg))
}
