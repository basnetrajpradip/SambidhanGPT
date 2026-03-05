import { Router } from 'express'
import { upload } from '../../configs/multer'
import { handleUpload, getClauses, getSuggestions, serveFile } from '../controllers/document-controller'

const router = Router()

router.post('/upload', upload.single('pdf'), handleUpload)
router.get('/documents/:id/clauses', getClauses)
router.get('/documents/:id/suggestions', getSuggestions)
router.get('/documents/:id/file', serveFile)

export default router
