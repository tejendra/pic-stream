import type { JwtPayload } from 'jsonwebtoken'

declare global {
  namespace Express {
    interface Request {
      albumToken?: JwtPayload & { albumId: string; exp: number; creator?: boolean }
    }
  }
}

export {}
