import { Router } from 'express'
import { getConversation, handleChat } from '../controllers/chat-controller'
import { requireAuth } from '../middleware/auth-middleware'

const router = Router()

router.post('/chat', requireAuth, handleChat)
router.get('/conversations/:docId', requireAuth, getConversation)

export default router
