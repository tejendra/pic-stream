import { Request, Response, NextFunction } from 'express'
import jwt from 'jsonwebtoken'
import { config } from '../config.js'

/**
 * Verifies Authorization: Bearer <token>, decodes with JWT_SECRET, and ensures
 * token.albumId matches route param :id or :albumId. Sets req.albumToken on success.
 * Returns 401 if header missing, token invalid, or albumId mismatch.
 */
export function requireAlbumToken(req: Request, res: Response, next: NextFunction): void {
  const auth = req.headers.authorization
  if (!auth || !auth.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Missing or invalid Authorization header' })
    return
  }

  const token = auth.slice(7).trim()
  if (!token) {
    res.status(401).json({ error: 'Missing token' })
    return
  }

  if (!config.jwtSecret) {
    res.status(503).json({ error: 'Server not configured (JWT_SECRET)' })
    return
  }

  let decoded: jwt.JwtPayload & { albumId?: string }
  try {
    decoded = jwt.verify(token, config.jwtSecret) as jwt.JwtPayload & { albumId?: string }
  } catch {
    res.status(401).json({ error: 'Invalid or expired token' })
    return
  }

  const albumId = req.params.id ?? req.params.albumId
  if (!albumId || decoded.albumId !== albumId) {
    res.status(401).json({ error: 'Token does not match album' })
    return
  }

  req.albumToken = decoded as Request['albumToken']
  next()
}
