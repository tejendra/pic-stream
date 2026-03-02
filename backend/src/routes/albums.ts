import { Router, Request, Response } from 'express'
import bcrypt from 'bcrypt'
import jwt from 'jsonwebtoken'
import { config } from '../config.js'
import { requireAlbumToken } from '../middleware/auth.js'
import {
  deleteDoc,
  deleteMediaDoc,
  getFirestore,
  listAlbums,
  listMedia,
  readDoc,
  updateDoc,
  writeDoc,
} from '../lib/firestore.js'
import { deleteFile } from '../lib/storage.js'
import { generateSeed } from '../lib/seed.js'
import type {
  CreateAlbumRequest,
  CreateAlbumResponse,
  OpenAlbumRequest,
  OpenAlbumResponse,
} from 'shared'

const router = Router()

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
        if (media.storagePath) await deleteFile(media.storagePath).catch(() => {})
        if (media.previewPath) await deleteFile(media.previewPath).catch(() => {})
        if (media.thumbnailPath) await deleteFile(media.thumbnailPath).catch(() => {})
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
