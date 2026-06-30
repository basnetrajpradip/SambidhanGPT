import crypto from 'crypto'
import { Request, Response } from 'express'
import { eq } from 'drizzle-orm'
import { db } from '../../configs/db-config'
import { users } from '../../db/schema'
import { createAuthToken, hashPassword, verifyPassword } from '../../utils/auth'
import { AuthenticatedRequest } from '../middleware/auth-middleware'

const MIN_PASSWORD_LENGTH = 8

function sanitizeUser(user: { id: string; email: string; name: string | null; createdAt: Date }) {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    createdAt: user.createdAt,
  }
}

function normalizeEmail(email: unknown) {
  return typeof email === 'string' ? email.trim().toLowerCase() : ''
}

export async function register(req: Request, res: Response) {
  try {
    const email = normalizeEmail(req.body.email)
    const password = typeof req.body.password === 'string' ? req.body.password : ''
    const name = typeof req.body.name === 'string' && req.body.name.trim() ? req.body.name.trim() : null

    if (!email || !email.includes('@')) {
      return res.status(400).json({ error: 'A valid email is required.' })
    }
    if (password.length < MIN_PASSWORD_LENGTH) {
      return res.status(400).json({ error: `Password must be at least ${MIN_PASSWORD_LENGTH} characters.` })
    }

    const [existing] = await db.select({ id: users.id }).from(users).where(eq(users.email, email)).limit(1)
    if (existing) {
      return res.status(409).json({ error: 'An account with this email already exists.' })
    }

    const [created] = await db
      .insert(users)
      .values({
        id: crypto.randomUUID(),
        email,
        name,
        passwordHash: hashPassword(password),
      })
      .returning()

    const token = createAuthToken(created)
    return res.status(201).json({ token, user: sanitizeUser(created) })
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Registration failed.' })
  }
}

export async function login(req: Request, res: Response) {
  try {
    const email = normalizeEmail(req.body.email)
    const password = typeof req.body.password === 'string' ? req.body.password : ''

    const [user] = await db.select().from(users).where(eq(users.email, email)).limit(1)
    if (!user || !verifyPassword(password, user.passwordHash)) {
      return res.status(401).json({ error: 'Invalid email or password.' })
    }

    const token = createAuthToken(user)
    return res.json({ token, user: sanitizeUser(user) })
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Login failed.' })
  }
}

export async function me(req: Request, res: Response) {
  try {
    const authReq = req as AuthenticatedRequest
    const [user] = await db.select().from(users).where(eq(users.id, authReq.user.id)).limit(1)
    if (!user) {
      return res.status(404).json({ error: 'User not found.' })
    }

    return res.json({ user: sanitizeUser(user) })
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Failed to load user.' })
  }
}
