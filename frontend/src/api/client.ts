import type {
  CreateAlbumRequest,
  CreateAlbumResponse,
  GetAlbumResponse,
  MediaListItem,
  OpenAlbumResponse,
} from 'shared'

export type { CreateAlbumResponse, GetAlbumResponse, MediaListItem }

/**
 * API base URL. Set VITE_API_URL in env; empty = same origin (dev proxy).
 */
export const API_BASE = (import.meta.env.VITE_API_URL as string | undefined) ?? ''

export function apiUrl(path: string): string {
  const base = API_BASE.replace(/\/$/, '')
  const p = path.startsWith('/') ? path : `/${path}`
  return `${base}${p}`
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

/** Decode JWT payload without verification (server already validated). Returns albumId for storage/redirect. */
function decodeAlbumIdFromToken(token: string): string | null {
  try {
    const payload = token.split('.')[1]
    if (!payload) return null
    const decoded = JSON.parse(
      atob(payload.replace(/-/g, '+').replace(/_/g, '/'))
    ) as { albumId?: string }
    return typeof decoded.albumId === 'string' ? decoded.albumId : null
  } catch {
    return null
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
