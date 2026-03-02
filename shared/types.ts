/**
 * Shared API and Firestore types. Single source of truth for backend and frontend.
 */

/** Album document (Firestore). */
export interface Album {
  id: string
  name: string
  seedHash: string
  deleteOn: string
  createdAt: string
  createdBy: string
}

/** Media document (Firestore subcollection albums/{albumId}/media). */
export interface Media {
  id: string
  albumId: string
  storagePath: string
  previewPath: string | null
  thumbnailPath: string
  displayName: string
  uploaderName: string
  size: number
  mimeType: string
  duplicateKey: string
  createdAt: string
}

/** POST /api/albums */
export interface CreateAlbumRequest {
  name: string
  deleteOn: string
  createdBy: string
}

export interface CreateAlbumResponse {
  albumId: string
  seed: string
  token: string
}

/** POST /api/albums/open */
export interface OpenAlbumRequest {
  seed: string
}

export interface OpenAlbumResponse {
  token: string
}

/** Value stored in localStorage under key `album_${albumId}`. When reading, fields may be missing. */
export interface StoredAlbumToken {
  token?: string
  albumId?: string
}

/** GET /api/albums/:id */
export interface GetAlbumResponse {
  id: string
  name: string
  deleteOn: string
  createdBy: string
}

/** PATCH /api/albums/:id */
export interface UpdateAlbumRequest {
  deleteOn?: string
  name?: string
}

export type UpdateAlbumResponse = GetAlbumResponse

/** POST /api/albums/:albumId/upload/prepare */
export interface PrepareUploadFile {
  filename: string
  size: number
  mimeType: string
}

export interface PrepareUploadRequest {
  files: PrepareUploadFile[]
}

export interface PrepareUploadItem {
  uploadId: string
  signedUploadUrl: string
  storagePath: string
}

export interface PrepareUploadResponse {
  uploads: PrepareUploadItem[]
  duplicates: string[]
}

/** POST /api/albums/:albumId/upload/finalize */
export interface FinalizeUploadItem {
  uploadId: string
  storagePath: string
  uploaderName: string
  displayName?: string
}

export interface FinalizeUploadRequest {
  uploads: FinalizeUploadItem[]
}

export interface FinalizeUploadResponse {
  mediaIds: string[]
}

/** GET /api/albums/:albumId/media – list item (same shape as Media for list). */
export type MediaListItem = Pick<
  Media,
  | 'id'
  | 'thumbnailPath'
  | 'previewPath'
  | 'storagePath'
  | 'displayName'
  | 'uploaderName'
  | 'size'
  | 'mimeType'
  | 'createdAt'
>
