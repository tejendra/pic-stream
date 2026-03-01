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

export async function getAlbum(
  albumId: string,
  token: string
): Promise<GetAlbumResponse> {
  const res = await fetch(apiUrl(`/api/albums/${albumId}`), {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }))
    throw new Error((err as { error?: string }).error ?? 'Failed to load album')
  }
  return res.json() as Promise<GetAlbumResponse>
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
