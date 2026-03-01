import { Router, Request, Response } from 'express'
import bcrypt from 'bcrypt'
import jwt from 'jsonwebtoken'
import { config } from '../config.js'
import { getFirestore, writeDoc } from '../lib/firestore.js'
import { generateSeed } from '../lib/seed.js'
import type { CreateAlbumRequest, CreateAlbumResponse } from 'shared'

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
      { albumId: id, exp, creator: true },
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

export default router
