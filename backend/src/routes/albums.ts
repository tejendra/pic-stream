import { Router, Request, Response } from 'express'
import bcrypt from 'bcrypt'
import jwt from 'jsonwebtoken'
import rateLimit, { ipKeyGenerator } from 'express-rate-limit'
import { randomUUID } from 'crypto'
import { config } from '../config.js'
import { requireAlbumToken } from '../middleware/auth.js'
import {
  deleteDoc,
  deleteMediaDoc,
  getExistingDuplicateKeys,
  getFirestore,
  listAlbums,
  listMedia,
  listMediaByCreatedAt,
  readDoc,
  updateDoc,
  writeDoc,
  writeMediaDoc,
} from '../lib/firestore.js'
import { deleteFile, downloadFileHead, getSignedUploadUrl } from '../lib/storage.js'
import { buildStoragePath } from '../lib/paths.js'
import {
  checkMagicBytes,
  isAllowedMimeType,
  MAX_FILE_SIZE_BYTES,
  MAX_FILES_PER_PREPARE,
} from '../lib/upload-validation.js'
import { getUploadSession, setUploadSession } from '../lib/upload-session.js'
import { generateSeed } from '../lib/seed.js'
import type {
  CreateAlbumRequest,
  CreateAlbumResponse,
  OpenAlbumRequest,
  OpenAlbumResponse,
  PrepareUploadDuplicate,
  PrepareUploadRequest,
  PrepareUploadResponse,
  PrepareUploadFile,
  FinalizeUploadRequest,
  FinalizeUploadResponse,
  ListMediaResponse,
} from 'shared'
import { isPathUnderAlbum } from '../lib/paths.js'

const router = Router()

/** 6.5 Rate limit: 30 requests per 15 minutes per album token (keyed by Authorization). */
const uploadRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  message: { error: 'Too many requests' },
  standardHeaders: true,
  keyGenerator: (req) =>
    req.headers.authorization ?? (req.ip ? ipKeyGenerator(req.ip) : 'unknown'),
})

const TOKEN_EXPIRY_HOURS = 24

function isValidCreateBody(body: unknown): body is CreateAlbumRequest {
  return (
    typeof body === 'object' &&
    body !== null &&
    'name' in body &&
    'deleteOn' in body &&
    'createdBy' in body &&
    typeof (body as CreateAlbumRequest).name === 'string' &&
    typeof (body as CreateAlbumRequest).deleteOn === 'string' &&
    typeof (body as CreateAlbumRequest).createdBy === 'string'
  )
}

/**
 * POST /api/albums – create album. Body: { name, deleteOn, createdBy }.
 * Returns 201 { albumId, seed, token }. Seed is never logged.
 */
router.post('/', async (req: Request, res: Response): Promise<void> => {
  console.log('[POST /api/albums] request received')

  if (!config.jwtSecret) {
    res.status(503).json({ error: 'Server not configured (JWT_SECRET)' })
    return
  }

  const db = getFirestore()
  if (!db) {
    res.status(503).json({ error: 'Database unavailable' })
    return
  }

  if (!isValidCreateBody(req.body)) {
    res.status(400).json({ error: 'Invalid body: need name, deleteOn, createdBy (strings)' })
    return
  }

  const { name, deleteOn, createdBy } = req.body

  try {
    const seed = generateSeed()

    const seedHash = await bcrypt.hash(seed, 10)

    const id = db.collection('albums').doc().id
    const createdAt = new Date().toISOString()

    await writeDoc('albums', id, {
      id,
      name,
      seedHash,
      deleteOn,
      createdAt,
      createdBy,
    })

    const exp = Math.floor(Date.now() / 1000) + TOKEN_EXPIRY_HOURS * 60 * 60
    const token = jwt.sign(
      { albumId: id, exp },
      config.jwtSecret
    )

    const response: CreateAlbumResponse = { albumId: id, seed, token }
    res.status(201).json(response)
  } catch (err) {
    console.error('[POST /api/albums] failed:', err instanceof Error ? err.message : err)
    if (err instanceof Error && err.stack) console.error('[POST /api/albums] stack:', err.stack)
    res.status(500).json({ error: 'Album creation failed' })
  }
})

function isValidOpenBody(body: unknown): body is OpenAlbumRequest {
  return (
    typeof body === 'object' &&
    body !== null &&
    'seed' in body &&
    typeof (body as OpenAlbumRequest).seed === 'string'
  )
}

/**
 * POST /api/albums/open – open album with seed. Body: { seed }.
 * Returns 200 { token } (JWT) or 401 if seed does not match any album.
 */
router.post('/open', async (req: Request, res: Response): Promise<void> => {
  if (!config.jwtSecret) {
    res.status(503).json({ error: 'Server not configured (JWT_SECRET)' })
    return
  }

  const db = getFirestore()
  if (!db) {
    res.status(503).json({ error: 'Database unavailable' })
    return
  }

  if (!isValidOpenBody(req.body)) {
    res.status(400).json({ error: 'Invalid body: need seed (string)' })
    return
  }

  const { seed } = req.body

  try {
    // TODO: does not scale — lists all albums and compares bcrypt in a loop. Consider indexing by
    // a derived key (e.g. hash of seed or first word + length) or a dedicated lookup table.
    const albums = await listAlbums()
    for (const album of albums) {
      const seedHash = album.seedHash as string | undefined
      if (typeof seedHash === 'string' && (await bcrypt.compare(seed, seedHash))) {
        const exp = Math.floor(Date.now() / 1000) + TOKEN_EXPIRY_HOURS * 60 * 60
        const token = jwt.sign(
          { albumId: album.id, exp },
          config.jwtSecret
        )
        const response: OpenAlbumResponse = { token }
        res.status(200).json(response)
        return
      }
    }
    res.status(401).json({ error: 'Invalid seed' })
  } catch (err) {
    console.error('[POST /api/albums/open] failed:', err instanceof Error ? err.message : err)
    res.status(500).json({ error: 'Open album failed' })
  }
})

function isValidPrepareBody(body: unknown): body is PrepareUploadRequest {
  if (typeof body !== 'object' || body === null || !('files' in body)) return false
  const files = (body as PrepareUploadRequest).files
  if (!Array.isArray(files)) return false
  return files.every(
    (f) =>
      typeof f === 'object' &&
      f !== null &&
      typeof (f as PrepareUploadFile).filename === 'string' &&
      typeof (f as PrepareUploadFile).size === 'number' &&
      typeof (f as PrepareUploadFile).mimeType === 'string'
  )
}

/**
 * POST /api/albums/:albumId/upload/prepare
 *
 * Step 1 of the upload flow: client sends a list of files (filename, size, mimeType). Server
 * validates MIME allowlist, size (≤500MB), count (≤25), path safety; checks duplicates by
 * filename|size; builds storage paths and signed upload URLs; stores session (uploadId → mimeType,
 * path, size, duplicateKey) for finalize. Client then uploads each file directly to the signed
 * URL (see docs/upload-flow.md).
 */
router.post(
  '/:albumId/upload/prepare',
  requireAlbumToken,
  uploadRateLimiter,
  async (req: Request, res: Response): Promise<void> => {
    const albumId = req.params.albumId
    if (!albumId) {
      res.status(400).json({ error: 'Invalid album' })
      return
    }

    if (!isValidPrepareBody(req.body)) {
      res.status(400).json({ error: 'Invalid body: need files (array of { filename, size, mimeType })' })
      return
    }

    const { files } = req.body

    if (files.length > MAX_FILES_PER_PREPARE) {
      res.status(400).json({ error: 'Too many files' })
      return
    }

    for (const file of files) {
      if (file.size > MAX_FILE_SIZE_BYTES) {
        res.status(400).json({ error: 'File too large' })
        return
      }
      if (!isAllowedMimeType(file.mimeType)) {
        res.status(400).json({ error: 'File type not allowed' })
        return
      }
    }

    const db = getFirestore()
    if (!db) {
      res.status(503).json({ error: 'Database unavailable' })
      return
    }

    const album = await readDoc('albums', albumId)
    if (!album) {
      res.status(404).json({ error: 'Album not found' })
      return
    }

    const existingKeys = await getExistingDuplicateKeys(albumId)
    const uploads: PrepareUploadResponse['uploads'] = []
    const duplicates: PrepareUploadDuplicate[] = []

    for (const file of files) {
      const duplicateKey = `${file.filename}|${file.size}`
      if (existingKeys.has(duplicateKey)) {
        duplicates.push({ filename: file.filename, size: file.size })
        continue
      }

      const uniqueId = randomUUID()
      const storagePath = buildStoragePath(albumId, 'originals', uniqueId, file.filename)
      if (!storagePath) {
        res.status(400).json({ error: 'Invalid path' })
        return
      }
      console.log('mimeType used to get signed url', file.mimeType)
      const signedUrl = await getSignedUploadUrl(storagePath, file.mimeType)
      if (!signedUrl) {
        res.status(503).json({ error: 'Storage unavailable' })
        return
      }

      const uploadId = randomUUID()
      setUploadSession(uploadId, file.mimeType, storagePath, file.size, duplicateKey)
      uploads.push({
        uploadId,
        signedUploadUrl: signedUrl,
        storagePath,
        mimeType: file.mimeType,
      })
    }

    res.status(200).json({ uploads, duplicates } satisfies PrepareUploadResponse)
  }
)

function isValidFinalizeBody(body: unknown): body is FinalizeUploadRequest {
  if (typeof body !== 'object' || body === null || !('uploads' in body)) return false
  const uploads = (body as FinalizeUploadRequest).uploads
  if (!Array.isArray(uploads)) return false
  return uploads.every(
    (u) =>
      typeof u === 'object' &&
      u !== null &&
      typeof u.uploadId === 'string' &&
      typeof u.storagePath === 'string' &&
      typeof u.uploaderName === 'string'
  )
}

/**
 * POST /api/albums/:albumId/upload/finalize
 *
 * Step 3 of the upload flow: after the client has uploaded files to Storage via the signed URLs,
 * it sends uploadId, storagePath, uploaderName (and optional displayName) per file. Server
 * validates path scope, looks up session from prepare, downloads first 512 bytes and runs
 * magic-byte check, then creates media docs and (for video) a pending job. See docs/upload-flow.md.
 */
router.post(
  '/:albumId/upload/finalize',
  requireAlbumToken,
  uploadRateLimiter,
  async (req: Request, res: Response): Promise<void> => {
    const albumId = req.params.albumId
    if (!albumId) {
      res.status(400).json({ error: 'Invalid album' })
      return
    }

    if (!isValidFinalizeBody(req.body)) {
      res.status(400).json({
        error: 'Invalid body: need uploads (array of { uploadId, storagePath, uploaderName, displayName? })',
      })
      return
    }

    const db = getFirestore()
    if (!db) {
      res.status(503).json({ error: 'Database unavailable' })
      return
    }

    const album = await readDoc('albums', albumId)
    if (!album) {
      res.status(404).json({ error: 'Album not found' })
      return
    }

    const mediaIds: string[] = []

    for (const item of req.body.uploads) {
      if (!isPathUnderAlbum(albumId, item.storagePath)) {
        res.status(400).json({ error: 'Invalid path' })
        return
      }

      const session = getUploadSession(item.uploadId)
      if (!session) {
        res.status(400).json({ error: 'Invalid or expired upload session' })
        return
      }

      if (session.storagePath !== item.storagePath) {
        res.status(400).json({ error: 'Invalid path' })
        return
      }

      const head = await downloadFileHead(item.storagePath, 512)
      if (head.length < 12) {
        res.status(400).json({ error: 'Invalid file signature' })
        return
      }
      if (!checkMagicBytes(head, session.mimeType)) {
        res.status(400).json({ error: 'Invalid file signature' })
        return
      }

      const mediaId = db.collection('albums').doc(albumId).collection('media').doc().id
      const createdAt = new Date().toISOString()
      await writeMediaDoc(albumId, mediaId, {
        id: mediaId,
        albumId,
        storagePath: item.storagePath,
        previewPath: null,
        thumbnailPath: null,
        displayName: item.displayName ?? item.storagePath.replace(/^.*\//, ''),
        uploaderName: item.uploaderName,
        size: session.size,
        mimeType: session.mimeType,
        duplicateKey: session.duplicateKey,
        createdAt,
      })

      const isVideo =
        session.mimeType === 'video/mp4' || session.mimeType === 'video/webm'
      if (isVideo) {
        const jobId = db.collection('jobs').doc().id
        const now = new Date().toISOString()
        await writeDoc('jobs', jobId, {
          id: jobId,
          albumId,
          mediaId,
          status: 'pending',
          createdAt: now,
          updatedAt: now,
        })
      }

      mediaIds.push(mediaId)
    }

    res.status(200).json({ mediaIds } satisfies FinalizeUploadResponse)
  }
)

/**
 * GET /api/albums/:albumId/media – list media in createdAt order. Requires album token.
 * Includes items where previewPath (or thumbnailPath) is null.
 */
router.get(
  '/:albumId/media',
  requireAlbumToken,
  async (req: Request, res: Response): Promise<void> => {
    const albumId = req.params.albumId
    if (!albumId) {
      res.status(400).json({ error: 'Invalid album' })
      return
    }

    const db = getFirestore()
    if (!db) {
      res.status(503).json({ error: 'Database unavailable' })
      return
    }

    const album = await readDoc('albums', albumId)
    if (!album) {
      res.status(404).json({ error: 'Album not found' })
      return
    }

    const media = await listMediaByCreatedAt(albumId)
    res.status(200).json({ media } satisfies ListMediaResponse)
  }
)

/**
 * GET /api/albums/:id – album details. Requires Authorization: Bearer <token> and token.albumId === :id.
 */
router.get('/:id', requireAlbumToken, async (req: Request, res: Response): Promise<void> => {
  const db = getFirestore()
  if (!db) {
    res.status(503).json({ error: 'Database unavailable' })
    return
  }
  const album = await readDoc<{ name: string; deleteOn: string; createdBy: string }>(
    'albums',
    req.params.id
  )
  if (!album) {
    res.status(404).json({ error: 'Album not found' })
    return
  }
  res.status(200).json({
    id: req.params.id,
    name: album.name,
    deleteOn: album.deleteOn,
    createdBy: album.createdBy,
  })
})

function isValidUpdateBody(
  body: unknown
): body is { name?: string; deleteOn?: string } {
  if (typeof body !== 'object' || body === null) return false
  const b = body as Record<string, unknown>
  if ('name' in b && typeof b.name !== 'string') return false
  if ('deleteOn' in b && typeof b.deleteOn !== 'string') return false
  return 'name' in b || 'deleteOn' in b
}

/**
 * PATCH /api/albums/:id – update album. Body: { deleteOn?: string, name?: string }.
 * Any user with a valid album token can update.
 */
router.patch(
  '/:id',
  requireAlbumToken,
  async (req: Request, res: Response): Promise<void> => {
    if (!isValidUpdateBody(req.body)) {
      res.status(400).json({ error: 'Invalid body: need at least one of name, deleteOn (strings)' })
      return
    }
    const db = getFirestore()
    if (!db) {
      res.status(503).json({ error: 'Database unavailable' })
      return
    }
    const album = await readDoc<{ name: string; deleteOn: string; createdBy: string }>(
      'albums',
      req.params.id
    )
    if (!album) {
      res.status(404).json({ error: 'Album not found' })
      return
    }
    const updates: { name?: string; deleteOn?: string } = {}
    if (typeof req.body.name === 'string') updates.name = req.body.name
    if (typeof req.body.deleteOn === 'string') updates.deleteOn = req.body.deleteOn
    await updateDoc('albums', req.params.id, updates)
    const updated = { ...album, ...updates }
    res.status(200).json({
      id: req.params.id,
      name: updated.name,
      deleteOn: updated.deleteOn,
      createdBy: updated.createdBy,
    })
  }
)

/**
 * DELETE /api/albums/:id – delete album and all media.
 * Deletes each media's storage files (storagePath, previewPath, thumbnailPath), then media docs, then album doc.
 * Any user with a valid album token can delete.
 */
router.delete(
  '/:id',
  requireAlbumToken,
  async (req: Request, res: Response): Promise<void> => {
    const albumId = req.params.id
    const album = await readDoc('albums', albumId)
    if (!album) {
      res.status(404).json({ error: 'Album not found' })
      return
    }
    try {
      const mediaList = await listMedia(albumId)
      for (const media of mediaList) {
        if (media.storagePath) await deleteFile(media.storagePath).catch(() => { })
        if (media.previewPath) await deleteFile(media.previewPath).catch(() => { })
        if (media.thumbnailPath) await deleteFile(media.thumbnailPath).catch(() => { })
        await deleteMediaDoc(albumId, media.id)
      }
      await deleteDoc('albums', albumId)
      res.status(204).send()
    } catch (err) {
      console.error('[DELETE /api/albums/:id] failed:', err instanceof Error ? err.message : err)
      res.status(500).json({ error: 'Delete album failed' })
    }
  }
)

export default router
