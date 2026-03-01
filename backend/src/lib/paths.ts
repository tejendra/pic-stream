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
 * Sanitizes a filename for use in a storage path: basename only, allowed chars [a-zA-Z0-9._-].
 * Returns null if invalid (contains '..', empty after basename, or disallowed chars).
 */
export function sanitizeFilename(filename: string): string | null {
  if (filename.includes('..')) return null
  const basename = filename.replace(/^.*[/\\]/, '')
  if (basename === '' || basename === '..') return null
  if (!SAFE_SEGMENT_REGEX.test(basename)) return null
  return basename
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
