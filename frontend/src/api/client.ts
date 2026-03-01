/**
 * API base URL. Set VITE_API_URL in env; empty = same origin (dev proxy).
 */
export const API_BASE = (import.meta.env.VITE_API_URL as string | undefined) ?? ''

export function apiUrl(path: string): string {
  const base = API_BASE.replace(/\/$/, '')
  const p = path.startsWith('/') ? path : `/${path}`
  return `${base}${p}`
}
