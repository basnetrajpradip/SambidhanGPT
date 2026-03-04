// RAGAgent: Q&A pipeline for SambidhanGPT
import { db } from '../configs/db-config'
import { chunks, conversations } from '../db/schema'
import { GEMINI_CONFIG } from '../llm/config'
import { QA_SYSTEM_PROMPT } from '../llm/prompts/qa-prompt'
import { eq, asc, desc, cosineDistance } from 'drizzle-orm'

// TODO: Implement full pipeline
export async function answerQuestion({
  documentId,
  question,
  history = [],
}: {
  documentId: string
  question: string
  history?: Array<{ role: string; content: string }>
}): Promise<{ answer: string; citations: any[] }> {
  // 1. Embed user query
  const { GoogleGenerativeAIEmbeddings } = await import('@langchain/google-genai')
  const embedder = new GoogleGenerativeAIEmbeddings({
    model: 'gemini-embedding-001',
    apiKey: process.env.GEMINI_API_KEY,
  })
  const queryEmbedding = await embedder.embedQuery(question)

  // 2. Cosine similarity search — asc = most similar first (distance 0 = identical)
  const TOP_K = parseInt(process.env.TOP_K || '8', 10)
  const chunkResults = await db
    .select()
    .from(chunks)
    .where(eq(chunks.documentId, documentId))
    .orderBy(asc(cosineDistance(chunks.embedding, queryEmbedding)))
    .limit(TOP_K)

  // 3. Contextual compression — include chunk IDs and page numbers so Gemini can cite
  const compressedContext = chunkResults.map((chunk) => `[chunk_id: ${chunk.id} | page: ${chunk.pageNumber}]\n${chunk.content}`).join('\n\n---\n\n')

  // 4. Assemble prompt
  const prompt = `${QA_SYSTEM_PROMPT}\n\nDocument context (cite chunk_id and page in your citations):\n${compressedContext}\n\nUser question: ${question}`

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
  let citations: any[] = []
  try {
    const json = JSON.parse(response.text())
    answer = json.answer
    citations = json.citations || []
  } catch {
    answer = response.text()
    citations = []
  }

  // 6. Store conversation turn
  const turn = history.length + 1
  const userId = 'anonymous'
  await db.insert(conversations).values({
    documentId,
    userId,
    turn,
    question,
    answer,
  })

  // 7. Return answer and citations
  return { answer, citations }
}
