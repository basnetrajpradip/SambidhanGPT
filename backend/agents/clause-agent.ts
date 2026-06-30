import { GoogleGenerativeAI } from '@google/generative-ai'
import { db } from '../configs/db-config'
import { chunks, clauses } from '../db/schema'
import { CLAUSE_PROMPT } from '../llm/prompts/clause-prompt'
import { eq } from 'drizzle-orm'
import crypto from 'crypto'

const CLAUSE_KEYWORDS: Record<string, string[]> = {
  indemnity: ['indemnify', 'indemnity', 'hold harmless'],
  termination: ['terminate', 'termination', 'expires', 'cancel'],
  liability: ['liability', 'liable', 'damages', 'responsibility'],
  payment_terms: ['payment', 'fees', 'charges', 'invoice', 'refund'],
  jurisdiction: ['jurisdiction', 'governing law', 'court', 'dispute'],
  amendment: ['amend', 'modification', 'changes to', 'update'],
  definitions: ['means', 'defined as', 'definition', 'refers to'],
  penalties: ['penalty', 'fine', 'sanction', 'breach'],
}

function parseClauses(text: string): Array<{ type: string; title: string; excerpt: string; page: number }> {
  const cleaned = text
    .trim()
    .replace(/^```(?:json)?/i, '')
    .replace(/```$/i, '')
    .trim()
  const parsed = JSON.parse(cleaned)
  return Array.isArray(parsed.clauses) ? parsed.clauses : []
}

function fallbackClauses(sampledChunks: Array<{ content: string; pageNumber: number }>) {
  const found: Array<{ type: string; title: string; excerpt: string; page: number }> = []

  for (const chunk of sampledChunks) {
    const sentences = chunk.content
      .split(/[.!?\n]+/)
      .map((sentence) => sentence.replace(/\s+/g, ' ').trim())
      .filter((sentence) => sentence.length > 40)

    for (const sentence of sentences) {
      const lower = sentence.toLowerCase()
      const match = Object.entries(CLAUSE_KEYWORDS).find(([, keywords]) => keywords.some((keyword) => lower.includes(keyword)))
      if (!match) continue

      const [type] = match
      if (found.some((clause) => clause.type === type && clause.excerpt === sentence)) continue

      found.push({
        type,
        title: type.replace(/_/g, ' '),
        excerpt: sentence.slice(0, 500),
        page: chunk.pageNumber,
      })

      if (found.length >= 10) return found
    }
  }

  return found
}

export async function runClauseAgent(documentId: string) {
  // 1. Load all chunks for this document
  const allChunks = await db.select().from(chunks).where(eq(chunks.documentId, documentId))

  // 2. Spread-sample: pick evenly spaced chunks across the document
  const SAMPLE_COUNT = Math.min(10, allChunks.length)
  const step = Math.max(1, Math.floor(allChunks.length / SAMPLE_COUNT))
  const sampledChunks = Array.from({ length: SAMPLE_COUNT }, (_, i) => allChunks[Math.min(i * step, allChunks.length - 1)])

  const contextText = sampledChunks.map((c) => `[page: ${c.pageNumber}]\n${c.content}`).join('\n\n---\n\n')
  if (!contextText.trim()) {
    return { document_id: documentId, clauses: [] }
  }

  // 3. Call Gemini 2.5 Flash
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '')
  const model = genAI.getGenerativeModel({
    model: 'gemini-2.5-flash',
    generationConfig: {
      temperature: 0.2,
      maxOutputTokens: 800,
      responseMimeType: 'application/json',
    },
  })

  const prompt = `${CLAUSE_PROMPT}\n\nDocument excerpts:\n${contextText}`
  let text = ''
  try {
    const result = await model.generateContent(prompt)
    text = result.response.text()
  } catch (err) {
    console.error('[ClauseAgent] Gemini call failed:', err)
    text = ''
  }

  let parsedClauses: Array<{ type: string; title: string; excerpt: string; page: number }> = []
  try {
    parsedClauses = text ? parseClauses(text) : []
  } catch (err) {
    console.error('[ClauseAgent] Failed to parse Gemini response:', err, text)
  }

  if (parsedClauses.length === 0) {
    parsedClauses = fallbackClauses(sampledChunks)
  }

  // 4. Store each clause in DB
  await db.delete(clauses).where(eq(clauses.documentId, documentId))
  for (const clause of parsedClauses) {
    await db.insert(clauses).values({
      id: crypto.randomUUID(),
      documentId,
      type: clause.type,
      title: clause.title,
      excerpt: clause.excerpt,
      pageNumber: clause.page || 1,
    })
  }

  return { document_id: documentId, clauses: parsedClauses }
}
