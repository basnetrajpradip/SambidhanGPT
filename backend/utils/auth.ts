import crypto from 'crypto'

const TOKEN_TTL_SECONDS = 60 * 60 * 24 * 7
const PASSWORD_ITERATIONS = 120_000
const KEY_LENGTH = 64
const DIGEST = 'sha512'

function authSecret() {
  const secret = process.env.AUTH_SECRET
  if (!secret) {
    throw new Error('AUTH_SECRET is required for authentication.')
  }
  return secret
}

function base64Url(input: Buffer | string) {
  return Buffer.from(input).toString('base64url')
}

function signPayload(payload: string) {
  return crypto.createHmac('sha256', authSecret()).update(payload).digest('base64url')
}

export function hashPassword(password: string) {
  const salt = crypto.randomBytes(16).toString('base64url')
  const hash = crypto.pbkdf2Sync(password, salt, PASSWORD_ITERATIONS, KEY_LENGTH, DIGEST).toString('base64url')
  return `${PASSWORD_ITERATIONS}:${salt}:${hash}`
}

export function verifyPassword(password: string, storedHash: string) {
  const [iterationsRaw, salt, expectedHash] = storedHash.split(':')
  const iterations = Number(iterationsRaw)
  if (!iterations || !salt || !expectedHash) return false

  const actualHash = crypto.pbkdf2Sync(password, salt, iterations, KEY_LENGTH, DIGEST).toString('base64url')
  if (actualHash.length !== expectedHash.length) return false
  return crypto.timingSafeEqual(Buffer.from(actualHash), Buffer.from(expectedHash))
}

export interface AuthTokenPayload {
  sub: string
  email: string
  exp: number
}

export function createAuthToken(user: { id: string; email: string }) {
  const payload: AuthTokenPayload = {
    sub: user.id,
    email: user.email,
    exp: Math.floor(Date.now() / 1000) + TOKEN_TTL_SECONDS,
  }
  const encodedPayload = base64Url(JSON.stringify(payload))
  const signature = signPayload(encodedPayload)
  return `${encodedPayload}.${signature}`
}

export function verifyAuthToken(token: string): AuthTokenPayload | null {
  const [encodedPayload, signature] = token.split('.')
  if (!encodedPayload || !signature) return null

  const expectedSignature = signPayload(encodedPayload)
  if (signature.length !== expectedSignature.length) return null
  if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature))) return null

  try {
    const payload = JSON.parse(Buffer.from(encodedPayload, 'base64url').toString('utf8')) as AuthTokenPayload
    if (!payload.sub || !payload.email || payload.exp < Math.floor(Date.now() / 1000)) return null
    return payload
  } catch {
    return null
  }
}
