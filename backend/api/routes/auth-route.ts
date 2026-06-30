import { Router } from 'express'
import { login, me, register } from '../controllers/auth-controller'
import { requireAuth } from '../middleware/auth-middleware'

const router = Router()

router.post('/auth/register', register)
router.post('/auth/login', login)
router.get('/auth/me', requireAuth, me)

export default router
