import { Router } from 'express'
import { upload } from '../../configs/multer'
import { handleUpload, getClauses, getSuggestions, serveFile, listDocuments, getDocument, getAnalysis, deleteDocument } from '../controllers/document-controller'
import { requireAuth } from '../middleware/auth-middleware'

const router = Router()

router.get('/documents', requireAuth, listDocuments)
router.post('/documents/upload', requireAuth, upload.single('pdf'), handleUpload)
router.post('/upload', requireAuth, upload.single('pdf'), handleUpload)
router.get('/documents/:id', requireAuth, getDocument)
router.get('/documents/:id/analysis', requireAuth, getAnalysis)
router.get('/documents/:id/clauses', requireAuth, getClauses)
router.get('/documents/:id/suggestions', requireAuth, getSuggestions)
router.get('/documents/:id/file', requireAuth, serveFile)
router.delete('/documents/:id', requireAuth, deleteDocument)

export default router
