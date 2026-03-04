import { GoogleGenerativeAI } from '@google/generative-ai'
import { db } from '../configs/db-config'
import { chunks, clauses } from '../db/schema'
import { CLAUSE_PROMPT } from '../llm/prompts/clause-prompt'
import { eq } from 'drizzle-orm'
import { v4 as uuidv4 } from 'uuid'

export async function runClauseAgent(documentId: string) {
  // 1. Load all chunks for this document
  const allChunks = await db.select().from(chunks).where(eq(chunks.documentId, documentId))

  // 2. Spread-sample: pick evenly spaced chunks across the document
  const SAMPLE_COUNT = Math.min(10, allChunks.length)
  const step = Math.max(1, Math.floor(allChunks.length / SAMPLE_COUNT))
  const sampledChunks = Array.from({ length: SAMPLE_COUNT }, (_, i) => allChunks[Math.min(i * step, allChunks.length - 1)])

  const contextText = sampledChunks.map((c) => `[page: ${c.pageNumber}]\n${c.content}`).join('\n\n---\n\n')

  // 3. Call Gemini 2.5 Flash
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '')
  const model = genAI.getGenerativeModel({
    model: 'gemini-2.5-flash',
    generationConfig: {
      temperature: 0.2,
      maxOutputTokens: 4096,
      responseMimeType: 'application/json',
    },
  })

  const prompt = `${CLAUSE_PROMPT}\n\nDocument excerpts:\n${contextText}`
  let text = ''
  try {
    const result = await model.generateContent(prompt)
    text = result.response.text()
  } catch (err) {
    return { document_id: documentId, clauses: [] }
  }

  let parsedClauses: Array<{ type: string; title: string; excerpt: string; page: number }> = []
  try {
    const json = JSON.parse(text)
    parsedClauses = json.clauses || []
  } catch {
    return { document_id: documentId, clauses: [] }
  }

  // 4. Store each clause in DB
  for (const clause of parsedClauses) {
    await db.insert(clauses).values({
      id: uuidv4(),
      documentId,
      type: clause.type,
      title: clause.title,
      excerpt: clause.excerpt,
      pageNumber: clause.page || 1,
    })
  }

  return { document_id: documentId, clauses: parsedClauses }
}
