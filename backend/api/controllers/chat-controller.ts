import { Request, Response } from 'express'
import { answerQuestion } from '../../agents/rag-agent'
import { db } from '../../configs/db-config'
import { chunks, conversations, documents } from '../../db/schema'
import { and, asc, cosineDistance, eq } from 'drizzle-orm'
import { AuthenticatedRequest } from '../middleware/auth-middleware'
import { getOwnedDocument } from '../services/document-access'

async function embedQuestion(question: string) {
  const { GoogleGenerativeAIEmbeddings } = await import('@langchain/google-genai')
  const embedderConfig = {
    model: 'gemini-embedding-001',
    apiKey: process.env.GEMINI_API_KEY,
    outputDimensionality: Number(process.env.EMBEDDING_DIMENSIONS || 3072),
  }
  const embedder = new GoogleGenerativeAIEmbeddings(embedderConfig)
  return embedder.embedQuery(question)
}

export async function handleChat(req: Request, res: Response) {
  try {
    const authReq = req as AuthenticatedRequest
    const { documentId, question } = req.body
    if (typeof documentId !== 'string' || typeof question !== 'string' || !question.trim()) {
      return res.status(400).json({ error: 'documentId and question are required.' })
    }

    const doc = await getOwnedDocument(documentId, authReq.user.id)
    if (!doc) {
      return res.status(404).json({ error: 'Document not found.' })
    }

    const result = await answerQuestion({ documentId, question: question.trim(), userId: authReq.user.id })
    res.json(result)
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to answer question', details: err.message || String(err) })
  }
}

export async function resolveChatDocument(req: Request, res: Response) {
  try {
    const authReq = req as AuthenticatedRequest
    const question = typeof req.body.question === 'string' ? req.body.question.trim() : ''
    if (!question) {
      return res.status(400).json({ error: 'question is required.' })
    }

    const queryEmbedding = await embedQuestion(question)
    const [match] = await db
      .select({ documentId: documents.id })
      .from(chunks)
      .innerJoin(documents, eq(chunks.documentId, documents.id))
      .where(eq(documents.ownerId, authReq.user.id))
      .orderBy(asc(cosineDistance(chunks.embedding, queryEmbedding)))
      .limit(1)

    if (!match) {
      return res.status(404).json({ error: 'No searchable documents found.' })
    }

    res.json({ documentId: match.documentId })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to resolve chat document.'
    res.status(500).json({ error: message })
  }
}

export async function getConversation(req: Request, res: Response) {
  try {
    const authReq = req as AuthenticatedRequest
    const documentId = String(req.params.docId)
    const doc = await getOwnedDocument(documentId, authReq.user.id)
    if (!doc) {
      return res.status(404).json({ error: 'Document not found.' })
    }

    const result = await db
      .select()
      .from(conversations)
      .where(and(eq(conversations.documentId, documentId), eq(conversations.userId, authReq.user.id)))
      .orderBy(asc(conversations.turn), asc(conversations.createdAt))

    res.json(result)
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to fetch conversation.' })
  }
}

export async function clearConversation(req: Request, res: Response) {
  try {
    const authReq = req as AuthenticatedRequest
    const documentId = String(req.params.docId)
    const doc = await getOwnedDocument(documentId, authReq.user.id)
    if (!doc) {
      return res.status(404).json({ error: 'Document not found.' })
    }

    await db
      .delete(conversations)
      .where(and(eq(conversations.documentId, documentId), eq(conversations.userId, authReq.user.id)))

    res.json({ success: true })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to clear conversation.'
    res.status(500).json({ error: message })
  }
}
