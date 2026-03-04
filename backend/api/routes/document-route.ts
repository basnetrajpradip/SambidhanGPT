import { Router } from 'express'
import { upload } from '../../configs/multer'
import { handleUpload } from '../controllers/document-controller'

const router = Router()

router.post('/upload', upload.single('pdf'), handleUpload)

export default router
