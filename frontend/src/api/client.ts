import type {
  CreateAlbumRequest,
  CreateAlbumResponse,
  GetAlbumResponse,
  MediaListItem,
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
