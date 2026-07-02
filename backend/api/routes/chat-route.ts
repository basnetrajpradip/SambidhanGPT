import { Router } from 'express'
import { clearConversation, getConversation, handleChat } from '../controllers/chat-controller'
import { requireAuth } from '../middleware/auth-middleware'

const router = Router()

router.post('/chat', requireAuth, handleChat)
router.get('/conversations/:docId', requireAuth, getConversation)
router.delete('/conversations/:docId', requireAuth, clearConversation)

export default router
