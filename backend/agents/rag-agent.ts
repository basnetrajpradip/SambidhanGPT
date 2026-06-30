// RAGAgent: Q&A pipeline for SambidhanGPT
import { db } from '../configs/db-config'
import { chunks, conversations } from '../db/schema'
import { GEMINI_CONFIG } from '../llm/config'
import { QA_SYSTEM_PROMPT } from '../llm/prompts/qa-prompt'
import { and, eq, asc, desc, cosineDistance } from 'drizzle-orm'
import { compressChunksForQuestion } from '../llm/utils/helper'

type ChunkRow = typeof chunks.$inferSelect

interface Citation {
  chunk_id: string
  page: number
  char_offset_start: number
  char_offset_end: number
  excerpt: string
}

function normalizeCitation(raw: any, chunkMap: Map<string, ChunkRow>): Citation | null {
  const chunkId = typeof raw?.chunk_id === 'string' ? raw.chunk_id : typeof raw?.chunkId === 'string' ? raw.chunkId : ''
  const chunk = chunkMap.get(chunkId)
  if (!chunk) return null

  const rawExcerpt = typeof raw?.excerpt === 'string' ? raw.excerpt.trim() : ''
  const excerpt = rawExcerpt && chunk.content.includes(rawExcerpt) ? rawExcerpt : chunk.content.slice(0, 300)
  const relativeStart = chunk.content.indexOf(excerpt)
  const start = relativeStart >= 0 ? chunk.charOffsetStart + relativeStart : chunk.charOffsetStart

  return {
    chunk_id: chunk.id,
    page: chunk.pageNumber,
    char_offset_start: start,
    char_offset_end: start + excerpt.length,
    excerpt,
  }
}

export async function answerQuestion({
  documentId,
  question,
  userId,
}: {
  documentId: string
  question: string
  userId: string
}): Promise<{ answer: string; citations: Citation[] }> {
  // 1. Embed user query
  const { GoogleGenerativeAIEmbeddings } = await import('@langchain/google-genai')
  const embedder = new GoogleGenerativeAIEmbeddings({
    model: 'gemini-embedding-001',
    apiKey: process.env.GEMINI_API_KEY,
    outputDimensionality: Number(process.env.EMBEDDING_DIMENSIONS || 3072),
  } as any)
  const queryEmbedding = await embedder.embedQuery(question)

  // 2. Cosine similarity search — asc = most similar first (distance 0 = identical)
  const TOP_K = parseInt(process.env.TOP_K || '5', 10)
  const chunkResults = await db
    .select()
    .from(chunks)
    .where(eq(chunks.documentId, documentId))
    .orderBy(asc(cosineDistance(chunks.embedding, queryEmbedding)))
    .limit(TOP_K)

  if (chunkResults.length === 0) {
    return {
      answer: 'This information is not found in the uploaded document.',
      citations: [],
    }
  }

  // 3. Contextual compression — include chunk IDs and page numbers so Gemini can cite
  const compressedChunks = compressChunksForQuestion(chunkResults, question)
  const compressedContext = compressedChunks
    .map((chunk) => `[chunk_id: ${chunk.id} | page: ${chunk.pageNumber}]\n${chunk.compressedContent}`)
    .join('\n\n---\n\n')

  const maxTurns = Number(process.env.MAX_CONVERSATION_TURNS || 10)
  const recentTurns = await db
    .select()
    .from(conversations)
    .where(and(eq(conversations.documentId, documentId), eq(conversations.userId, userId)))
    .orderBy(desc(conversations.turn))
    .limit(maxTurns)

  const historyText = recentTurns
    .reverse()
    .filter((turn) => turn.userId === userId)
    .map((turn) => `User: ${turn.question}\nAssistant: ${turn.answer}`)
    .join('\n\n')

  // 4. Assemble prompt
  const prompt = `${QA_SYSTEM_PROMPT}\n\nDocument context (cite chunk_id and page in your citations):\n${compressedContext}\n\nRecent conversation:\n${
    historyText || 'No previous turns.'
  }\n\nUser question: ${question}`

  // 5. Call Gemini 2.5 Flash
  const { GoogleGenerativeAI } = await import('@google/generative-ai')
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '')
  const model = genAI.getGenerativeModel({
    model: GEMINI_CONFIG.model,
    generationConfig: {
      temperature: GEMINI_CONFIG.temperature,
      maxOutputTokens: GEMINI_CONFIG.maxOutputTokens,
      responseMimeType: GEMINI_CONFIG.responseMimeType,
    },
  })
  const result = await model.generateContent(prompt)
  const response = result.response
  let answer = ''
  let rawCitations: any[] = []
  try {
    const json = JSON.parse(response.text())
    answer = typeof json.answer === 'string' ? json.answer : ''
    rawCitations = Array.isArray(json.citations) ? json.citations : []
  } catch {
    answer = response.text()
    rawCitations = []
  }

  const chunkMap = new Map(chunkResults.map((chunk) => [chunk.id, chunk]))
  let citations = rawCitations.map((citation) => normalizeCitation(citation, chunkMap)).filter((citation): citation is Citation => Boolean(citation))

  if (answer && !answer.includes('This information is not found in the uploaded document.') && citations.length === 0) {
    const [topChunk] = chunkResults
    citations = [
      {
        chunk_id: topChunk.id,
        page: topChunk.pageNumber,
        char_offset_start: topChunk.charOffsetStart,
        char_offset_end: Math.min(topChunk.charOffsetEnd, topChunk.charOffsetStart + Math.min(topChunk.content.length, 300)),
        excerpt: topChunk.content.slice(0, 300),
      },
    ]
  }

  // 6. Store conversation turn
  const [lastTurn] = await db
    .select({ turn: conversations.turn })
    .from(conversations)
    .where(and(eq(conversations.documentId, documentId), eq(conversations.userId, userId)))
    .orderBy(desc(conversations.turn))
    .limit(1)
  const turn = (lastTurn?.turn ?? 0) + 1

  await db.insert(conversations).values({
    documentId,
    userId,
    turn,
    question,
    answer,
    citations,
  })

  // 7. Return answer and citations
  return { answer, citations }
}
