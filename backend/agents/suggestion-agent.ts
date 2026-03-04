import { GoogleGenerativeAI } from '@google/generative-ai'
import { db } from '../configs/db-config'
import { chunks, suggestions } from '../db/schema'
import { SUGGESTION_PROMPT } from '../llm/prompts/suggestion-prompt'
import { eq } from 'drizzle-orm'
import { v4 as uuidv4 } from 'uuid'

export async function runSuggestionAgent(documentId: string) {
  // 1. Load all chunks for this document
  const allChunks = await db.select().from(chunks).where(eq(chunks.documentId, documentId))

  // 2. Spread-sample: pick exactly 5 chunks evenly spaced across the document
  const SAMPLE_COUNT = Math.min(5, allChunks.length)
  const step = Math.max(1, Math.floor(allChunks.length / SAMPLE_COUNT))
  const sampledChunks = Array.from({ length: SAMPLE_COUNT }, (_, i) => allChunks[Math.min(i * step, allChunks.length - 1)])

  const contextText = sampledChunks.map((c) => c.content).join('\n\n---\n\n')

  // 3. Call Gemini 2.5 Flash
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '')
  const model = genAI.getGenerativeModel({
    model: 'gemini-2.5-flash',
    generationConfig: {
      temperature: 0.2,
      maxOutputTokens: 1024,
      responseMimeType: 'application/json',
    },
  })

  const prompt = `${SUGGESTION_PROMPT}\n\nDocument excerpts:\n${contextText}`
  let text = ''
  try {
    const result = await model.generateContent(prompt)
    text = result.response.text()
  } catch (err) {
    return { document_id: documentId, suggestions: [] }
  }

  let questions: string[] = []
  try {
    questions = JSON.parse(text)
    if (!Array.isArray(questions)) questions = []
  } catch {
    return { document_id: documentId, suggestions: [] }
  }

  // 4. Store each question as a row in suggestions table
  for (const question of questions) {
    await db.insert(suggestions).values({
      id: uuidv4(),
      documentId,
      question,
    })
  }

  return { document_id: documentId, suggestions: questions }
}
