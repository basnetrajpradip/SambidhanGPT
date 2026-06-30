import { NextFunction, Request, Response } from 'express'
import { verifyAuthToken } from '../../utils/auth'

export interface AuthenticatedUser {
  id: string
  email: string
}

export interface AuthenticatedRequest extends Request {
  user: AuthenticatedUser
}

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice('Bearer '.length) : null

  if (!token) {
    return res.status(401).json({ error: 'Authentication required.' })
  }

  const payload = verifyAuthToken(token)
  if (!payload) {
    return res.status(401).json({ error: 'Invalid or expired session.' })
  }

  ;(req as AuthenticatedRequest).user = {
    id: payload.sub,
    email: payload.email,
  }

  next()
}
