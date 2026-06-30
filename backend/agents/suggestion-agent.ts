import { GoogleGenerativeAI } from '@google/generative-ai'
import { db } from '../configs/db-config'
import { chunks, suggestions } from '../db/schema'
import { SUGGESTION_PROMPT } from '../llm/prompts/suggestion-prompt'
import { eq } from 'drizzle-orm'
import crypto from 'crypto'

function parseSuggestions(text: string): string[] {
  const cleaned = text
    .trim()
    .replace(/^```(?:json)?/i, '')
    .replace(/```$/i, '')
    .trim()

  const parsed = JSON.parse(cleaned)
  if (Array.isArray(parsed)) return parsed.filter((item) => typeof item === 'string')
  if (Array.isArray(parsed.questions)) return parsed.questions.filter((item: unknown) => typeof item === 'string')
  if (Array.isArray(parsed.suggestions)) return parsed.suggestions.filter((item: unknown) => typeof item === 'string')
  return []
}

function fallbackSuggestions(contextText: string) {
  const sentences = contextText
    .split(/[.!?\n]+/)
    .map((sentence) => sentence.replace(/\s+/g, ' ').trim())
    .filter((sentence) => sentence.length > 40)
    .slice(0, 7)

  if (sentences.length === 0) {
    return ['What are the main obligations in this document?', 'Which parties are mentioned in this document?', 'What important dates or terms are stated?']
  }

  return sentences.slice(0, 7).map((sentence) => {
    const excerpt = sentence.length > 90 ? `${sentence.slice(0, 87)}...` : sentence
    return `What does the document say about "${excerpt}"?`
  })
}

export async function runSuggestionAgent(documentId: string) {
  // 1. Load all chunks for this document
  const allChunks = await db.select().from(chunks).where(eq(chunks.documentId, documentId))

  // 2. Spread-sample: pick exactly 5 chunks evenly spaced across the document
  const SAMPLE_COUNT = Math.min(5, allChunks.length)
  const step = Math.max(1, Math.floor(allChunks.length / SAMPLE_COUNT))
  const sampledChunks = Array.from({ length: SAMPLE_COUNT }, (_, i) => allChunks[Math.min(i * step, allChunks.length - 1)])

  const contextText = sampledChunks.map((c) => c.content).join('\n\n---\n\n')
  if (!contextText.trim()) {
    return { document_id: documentId, suggestions: [] }
  }

  // 3. Call Gemini 2.5 Flash
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '')
  const model = genAI.getGenerativeModel({
    model: 'gemini-2.5-flash',
    generationConfig: {
      temperature: 0.2,
      maxOutputTokens: 300,
      responseMimeType: 'application/json',
    },
  })

  const prompt = `${SUGGESTION_PROMPT}\n\nDocument excerpts:\n${contextText}`
  let text = ''
  try {
    const result = await model.generateContent(prompt)
    text = result.response.text()
  } catch (err) {
    console.error('[SuggestionAgent] Gemini call failed:', err)
    text = ''
  }

  let questions: string[] = []
  try {
    questions = text ? parseSuggestions(text) : []
  } catch (err) {
    console.error('[SuggestionAgent] Failed to parse Gemini response:', err, text)
  }

  if (questions.length === 0) {
    questions = fallbackSuggestions(contextText)
  }

  // 4. Store each question as a row in suggestions table
  await db.delete(suggestions).where(eq(suggestions.documentId, documentId))
  for (const question of questions.slice(0, 7)) {
    await db.insert(suggestions).values({
      id: crypto.randomUUID(),
      documentId,
      question,
    })
  }

  return { document_id: documentId, suggestions: questions }
}
