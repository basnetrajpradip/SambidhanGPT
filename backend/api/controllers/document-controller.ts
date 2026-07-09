import { Request, Response } from 'express'
import { runIngestionAgent } from '../../agents/ingestion-agent'
import { db } from '../../configs/db-config'
import { clauses, suggestions, documents, chunks, conversations, documentAnalysis } from '../../db/schema'
import { and, count, desc, eq } from 'drizzle-orm'
import path from 'path'
import fs from 'fs'
import { AuthenticatedRequest } from '../middleware/auth-middleware'
import { getOwnedDocument } from '../services/document-access'
import { runClauseAgent } from '../../agents/clause-agent'
import { runSuggestionAgent } from '../../agents/suggestion-agent'
import { runAnalysisAgent } from '../../agents/analysis-agent'

export const handleUpload = async (req: Request, res: Response) => {
  try {
    const authReq = req as AuthenticatedRequest
    if (!req.file) {
      return res.status(400).json({ error: 'No PDF file uploaded.' })
    }
    const result = await runIngestionAgent({
      filePath: req.file.path,
      originalName: req.file.originalname,
      ownerId: authReq.user.id,
    })
    res.status(200).json(result)
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Ingestion failed.' })
  }
}

export const listDocuments = async (req: Request, res: Response) => {
  try {
    const authReq = req as AuthenticatedRequest
    const result = await db
      .select()
      .from(documents)
      .where(eq(documents.ownerId, authReq.user.id))
      .orderBy(desc(documents.uploadedAt))

    const enriched = await Promise.all(
      result.map(async (doc) => {
        const [{ value: chunkCount }] = await db.select({ value: count() }).from(chunks).where(eq(chunks.documentId, doc.id))
        const [{ value: conversationCount }] = await db
          .select({ value: count() })
          .from(conversations)
          .where(and(eq(conversations.documentId, doc.id), eq(conversations.userId, authReq.user.id)))

        return {
          id: doc.id,
          name: doc.name,
          uploadedAt: doc.uploadedAt,
          ownerId: doc.ownerId,
          chunkCount,
          conversationCount,
        }
      }),
    )

    res.json(enriched)
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to fetch documents.' })
  }
}

export const getDocument = async (req: Request, res: Response) => {
  try {
    const authReq = req as AuthenticatedRequest
    const id = req.params.id as string
    const doc = await getOwnedDocument(id, authReq.user.id)
    if (!doc) {
      return res.status(404).json({ error: 'Document not found.' })
    }

    const [{ value: chunkCount }] = await db.select({ value: count() }).from(chunks).where(eq(chunks.documentId, id))
    const [{ value: clauseCount }] = await db.select({ value: count() }).from(clauses).where(eq(clauses.documentId, id))
    const [{ value: suggestionCount }] = await db.select({ value: count() }).from(suggestions).where(eq(suggestions.documentId, id))

    res.json({
      id: doc.id,
      name: doc.name,
      uploadedAt: doc.uploadedAt,
      ownerId: doc.ownerId,
      chunkCount,
      clauseCount,
      suggestionCount,
    })
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to fetch document.' })
  }
}

const resolveDocumentFilePath = (filePath: string) => (path.isAbsolute(filePath) ? filePath : path.join(__dirname, '../../', filePath))

const getErrorMessage = (err: unknown, fallback: string) => (err instanceof Error && err.message ? err.message : fallback)

export const deleteDocument = async (req: Request, res: Response) => {
  try {
    const authReq = req as AuthenticatedRequest
    const id = req.params.id as string
    const doc = await getOwnedDocument(id, authReq.user.id)
    if (!doc) {
      return res.status(404).json({ error: 'Document not found.' })
    }

    await db.transaction(async (tx) => {
      await tx.delete(documentAnalysis).where(eq(documentAnalysis.documentId, id))
      await tx.delete(clauses).where(eq(clauses.documentId, id))
      await tx.delete(suggestions).where(eq(suggestions.documentId, id))
      await tx.delete(conversations).where(eq(conversations.documentId, id))
      await tx.delete(chunks).where(eq(chunks.documentId, id))
      await tx.delete(documents).where(and(eq(documents.id, id), eq(documents.ownerId, authReq.user.id)))
    })

    try {
      await fs.promises.rm(resolveDocumentFilePath(doc.filePath), { force: true })
    } catch (err: unknown) {
      console.error('[deleteDocument] Failed to remove PDF file:', getErrorMessage(err, 'Unknown file deletion error.'))
    }

    res.json({ success: true })
  } catch (err: unknown) {
    res.status(500).json({ error: getErrorMessage(err, 'Failed to delete document.') })
  }
}

export const getClauses = async (req: Request, res: Response) => {
  try {
    const authReq = req as AuthenticatedRequest
    const id = req.params.id as string
    const doc = await getOwnedDocument(id, authReq.user.id)
    if (!doc) {
      return res.status(404).json({ error: 'Document not found.' })
    }
    let result = await db.select().from(clauses).where(eq(clauses.documentId, id))
    if (result.length === 0) {
      await runClauseAgent(id)
      result = await db.select().from(clauses).where(eq(clauses.documentId, id))
    }
    res.json(result)
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to fetch clauses.' })
  }
}

export const getSuggestions = async (req: Request, res: Response) => {
  try {
    const authReq = req as AuthenticatedRequest
    const id = req.params.id as string
    const doc = await getOwnedDocument(id, authReq.user.id)
    if (!doc) {
      return res.status(404).json({ error: 'Document not found.' })
    }
    let result = await db.select().from(suggestions).where(eq(suggestions.documentId, id))
    if (result.length === 0) {
      await runSuggestionAgent(id)
      result = await db.select().from(suggestions).where(eq(suggestions.documentId, id))
    }
    res.json(result.map((s) => s.question))
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to fetch suggestions.' })
  }
}

export const getAnalysis = async (req: Request, res: Response) => {
  try {
    const authReq = req as AuthenticatedRequest
    const id = req.params.id as string
    const doc = await getOwnedDocument(id, authReq.user.id)
    if (!doc) {
      return res.status(404).json({ error: 'Document not found.' })
    }

    let [analysis] = await db.select().from(documentAnalysis).where(eq(documentAnalysis.documentId, id)).limit(1)
    if (!analysis) {
      await runAnalysisAgent(id)
      ;[analysis] = await db.select().from(documentAnalysis).where(eq(documentAnalysis.documentId, id)).limit(1)
    }

    res.json(analysis)
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to fetch document analysis.' })
  }
}

export const serveFile = async (req: Request, res: Response) => {
  try {
    const authReq = req as AuthenticatedRequest
    const id = req.params.id as string
    const doc = await getOwnedDocument(id, authReq.user.id)
    if (!doc) {
      return res.status(404).json({ error: 'Document not found.' })
    }
    const absPath = resolveDocumentFilePath(doc.filePath)
    if (!fs.existsSync(absPath)) {
      return res.status(404).json({ error: 'PDF file not found on disk.' })
    }
    res.setHeader('Content-Type', 'application/pdf')
    res.setHeader('Content-Disposition', `inline; filename="${doc.name}"`)
    fs.createReadStream(absPath).pipe(res)
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to serve file.' })
  }
}
