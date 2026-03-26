import type {
  CreateAlbumRequest,
  CreateAlbumResponse,
  FinalizeUploadRequest,
  FinalizeUploadResponse,
  GetAlbumResponse,
  ListMediaResponse,
  MediaListItem,
  MediaSignedUrlResponse,
  MediaUrlType,
  OpenAlbumResponse,
  PrepareUploadFile,
  PrepareUploadResponse,
} from 'shared'

export type { CreateAlbumResponse, GetAlbumResponse, ListMediaResponse, MediaListItem, MediaUrlType }

/**
 * API base URL. Set VITE_API_URL in env; empty = same origin (dev proxy).
 */
export const API_BASE = (import.meta.env.VITE_API_URL as string | undefined) ?? ''

export function apiUrl(path: string): string {
  const base = API_BASE.replace(/\/$/, '')
  const p = path.startsWith('/') ? path : `/${path}`
  return `${base}${p}`
}

const ALBUM_STORAGE_PREFIX = 'album_'

export function albumTokenStorageKey(albumId: string): string {
  return `${ALBUM_STORAGE_PREFIX}${albumId}`
}

/** Read JWT from localStorage `album_${albumId}` (JSON `{ token, albumId }`). */
export function getStoredAlbumToken(albumId: string): string | null {
  try {
    const raw = localStorage.getItem(albumTokenStorageKey(albumId))
    if (!raw) return null
    const stored = JSON.parse(raw) as { token?: string }
    return typeof stored?.token === 'string' ? stored.token : null
  } catch {
    return null
  }
}

async function albumApiFetch(albumId: string, path: string, init: RequestInit = {}): Promise<Response> {
  const token = getStoredAlbumToken(albumId)
  const headers = new Headers(init.headers)
  if (token) {
    headers.set('Authorization', `Bearer ${token}`)
  }
  return fetch(apiUrl(path), { ...init, headers })
}

export async function createAlbum(
  request: CreateAlbumRequest
): Promise<CreateAlbumResponse> {
  const res = await fetch(apiUrl('/api/albums'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(request),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }))
    throw new Error((err as { error?: string }).error ?? 'Create album failed')
  }
  return res.json() as Promise<CreateAlbumResponse>
}

/** Decode JWT payload without verification (server already validated). */
function decodeJwtPayload(token: string): { albumId?: string; exp?: number } | null {
  try {
    const payload = token.split('.')[1]
    if (!payload) return null
    return JSON.parse(
      atob(payload.replace(/-/g, '+').replace(/_/g, '/'))
    ) as { albumId?: string; exp?: number }
  } catch {
    return null
  }
}

function decodeAlbumIdFromToken(token: string): string | null {
  const decoded = decodeJwtPayload(token)
  return decoded && typeof decoded.albumId === 'string' ? decoded.albumId : null
}

/** True if token is missing, invalid, or exp is in the past (with 60s buffer). */
export function isTokenExpired(token: string | null | undefined): boolean {
  if (!token) return true
  const payload = decodeJwtPayload(token)
  if (!payload || typeof payload.exp !== 'number') return true
  return payload.exp < Math.floor(Date.now() / 1000) + 60
}

export async function getAlbum(albumId: string): Promise<GetAlbumResponse> {
  const res = await albumApiFetch(albumId, `/api/albums/${albumId}`)
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }))
    throw new Error((err as { error?: string }).error ?? 'Failed to load album')
  }
  return res.json() as Promise<GetAlbumResponse>
}

export async function patchAlbum(
  albumId: string,
  body: { deleteOn?: string; name?: string }
): Promise<GetAlbumResponse> {
  const res = await albumApiFetch(albumId, `/api/albums/${albumId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }))
    throw new Error((err as { error?: string }).error ?? 'Update album failed')
  }
  return res.json() as Promise<GetAlbumResponse>
}

export async function deleteAlbum(albumId: string): Promise<void> {
  const res = await albumApiFetch(albumId, `/api/albums/${albumId}`, {
    method: 'DELETE',
  })
  if (!res.ok && res.status !== 204) {
    const err = await res.json().catch(() => ({ error: res.statusText }))
    throw new Error((err as { error?: string }).error ?? 'Delete album failed')
  }
}

export async function openAlbum(seed: string): Promise<{
  token: string
  albumId: string
}> {
  const res = await fetch(apiUrl('/api/albums/open'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ seed: seed.trim() }),
  })
  if (res.status === 401) {
    throw new Error('Invalid seed')
  }
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }))
    throw new Error((err as { error?: string }).error ?? 'Open album failed')
  }
  const data = (await res.json()) as OpenAlbumResponse
  const albumId = decodeAlbumIdFromToken(data.token)
  if (!albumId) throw new Error('Invalid token response')
  return { token: data.token, albumId }
}

/** POST /api/albums/:albumId/upload/prepare – get signed URLs and duplicate list. */
export async function prepareUpload(
  albumId: string,
  files: PrepareUploadFile[]
): Promise<PrepareUploadResponse> {
  const res = await albumApiFetch(albumId, `/api/albums/${albumId}/upload/prepare`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ files }),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }))
    throw new Error((err as { error?: string }).error ?? 'Prepare upload failed')
  }
  return res.json() as Promise<PrepareUploadResponse>
}

/** GET /api/albums/:albumId/media – list media. */
export async function listMedia(albumId: string): Promise<ListMediaResponse> {
  const res = await albumApiFetch(albumId, `/api/albums/${albumId}/media`)
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }))
    throw new Error((err as { error?: string }).error ?? 'Failed to list media')
  }
  return res.json() as Promise<ListMediaResponse>
}

/** GET /api/albums/:albumId/media/:mediaId/url – signed download URL. */
export async function getMediaSignedUrl(
  albumId: string,
  mediaId: string,
  type: MediaUrlType
): Promise<MediaSignedUrlResponse> {
  const params = new URLSearchParams({ type })
  const res = await albumApiFetch(
    albumId,
    `/api/albums/${albumId}/media/${encodeURIComponent(mediaId)}/url?${params}`
  )
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }))
    throw new Error((err as { error?: string }).error ?? 'Failed to get media URL')
  }
  return res.json() as Promise<MediaSignedUrlResponse>
}

/** DELETE /api/albums/:albumId/media/:mediaId */
export async function deleteMedia(albumId: string, mediaId: string): Promise<void> {
  const res = await albumApiFetch(
    albumId,
    `/api/albums/${albumId}/media/${encodeURIComponent(mediaId)}`,
    { method: 'DELETE' }
  )
  if (!res.ok && res.status !== 204) {
    const err = await res.json().catch(() => ({ error: res.statusText }))
    throw new Error((err as { error?: string }).error ?? 'Delete media failed')
  }
}

/** POST /api/albums/:albumId/upload/finalize – create media docs after client uploads. */
export async function finalizeUpload(
  albumId: string,
  body: FinalizeUploadRequest
): Promise<FinalizeUploadResponse> {
  const res = await albumApiFetch(albumId, `/api/albums/${albumId}/upload/finalize`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }))
    throw new Error((err as { error?: string }).error ?? 'Finalize upload failed')
  }
  return res.json() as Promise<FinalizeUploadResponse>
}

/**
 * Upload a file to a signed URL via PUT. Reports progress via onProgress(loaded, total).
 */
export function uploadFileToSignedUrl(
  signedUrl: string,
  file: File,
  mimeType: string,
  onProgress?: (loaded: number, total: number) => void
): Promise<void> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest()
    const total = file.size

    xhr.upload.addEventListener('progress', (e) => {
      if (e.lengthComputable && onProgress) {
        onProgress(e.loaded, e.total)
      } else if (onProgress && total > 0) {
        onProgress(e.loaded, total)
      }
    })
    xhr.addEventListener('load', () => {
      if (xhr.status >= 200 && xhr.status < 300) resolve()
      else reject(new Error(`Upload failed: ${xhr.status}`))
    })
    xhr.addEventListener('error', () => reject(new Error('Upload failed')))
    xhr.addEventListener('abort', () => reject(new Error('Upload aborted')))

    xhr.open('PUT', signedUrl, true)
    // GCS signed URLs from prepare only sign `host`; use a single Content-Type so preflight stays predictable.
    xhr.setRequestHeader('Content-Type', mimeType)
    xhr.send(file)
  })
}
