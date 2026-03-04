import { Request, Response } from 'express'
import { runIngestionAgent } from '../../agents/ingestion-agent'

export const handleUpload = async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No PDF file uploaded.' })
    }
    // Call IngestionAgent with file path and original name
    const result = await runIngestionAgent({
      filePath: req.file.path,
      originalName: req.file.originalname,
      ownerId: req.body.ownerId || 'anonymous',
    })
    res.status(200).json(result)
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Ingestion failed.' })
  }
}
