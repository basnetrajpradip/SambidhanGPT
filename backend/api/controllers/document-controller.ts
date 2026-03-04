import { Request, Response } from 'express'
import { runIngestionAgent } from '../../agents/ingestion-agent'
import { db } from '../../configs/db-config'
import { clauses, suggestions } from '../../db/schema'
import { eq } from 'drizzle-orm'

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

export const getClauses = async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string
    const result = await db.select().from(clauses).where(eq(clauses.documentId, id))
    res.json(result)
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to fetch clauses.' })
  }
}

export const getSuggestions = async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string
    const result = await db.select().from(suggestions).where(eq(suggestions.documentId, id))
    res.json(result.map((s) => s.question))
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to fetch suggestions.' })
  }
}
