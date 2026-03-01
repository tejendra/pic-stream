const STORAGE_KEY = 'recentAlbums'
const MAX_RECENT = 20

export interface RecentAlbum {
  albumId: string
  name: string
}

export function getRecentAlbums(): RecentAlbum[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as unknown
    if (!Array.isArray(parsed)) return []
    return parsed.filter(
      (item): item is RecentAlbum =>
        typeof item === 'object' &&
        item !== null &&
        typeof (item as RecentAlbum).albumId === 'string' &&
        typeof (item as RecentAlbum).name === 'string'
    )
  } catch {
    return []
  }
}

export function addToRecentAlbums(albumId: string, name: string): void {
  const list = getRecentAlbums()
  const filtered = list.filter((a) => a.albumId !== albumId)
  const updated: RecentAlbum[] = [{ albumId, name }, ...filtered].slice(0, MAX_RECENT)
  localStorage.setItem(STORAGE_KEY, JSON.stringify(updated))
}
