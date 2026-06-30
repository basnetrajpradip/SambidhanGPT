import crypto from 'crypto'
import { GoogleGenerativeAI } from '@google/generative-ai'
import { eq } from 'drizzle-orm'
import { db } from '../configs/db-config'
import { chunks, documentAnalysis, ObligationItem, RiskFlag } from '../db/schema'

interface AnalysisResult {
  document_id: string
  summary: string
  key_points: string[]
  risks: RiskFlag[]
  obligations: ObligationItem[]
}

function cleanJson(text: string) {
  return text
    .trim()
    .replace(/^```(?:json)?/i, '')
    .replace(/```$/i, '')
    .trim()
}

function parseAnalysis(text: string): Omit<AnalysisResult, 'document_id'> {
  const parsed = JSON.parse(cleanJson(text))
  return {
    summary: typeof parsed.summary === 'string' ? parsed.summary : '',
    key_points: Array.isArray(parsed.key_points) ? parsed.key_points.filter((item: unknown) => typeof item === 'string') : [],
    risks: Array.isArray(parsed.risks) ? parsed.risks : [],
    obligations: Array.isArray(parsed.obligations) ? parsed.obligations : [],
  }
}

function splitSentences(input: string) {
  return input
    .split(/[.!?\n]+/)
    .map((sentence) => sentence.replace(/\s+/g, ' ').trim())
    .filter((sentence) => sentence.length > 40)
}

function fallbackAnalysis(documentId: string, sampledChunks: Array<{ content: string; pageNumber: number }>): AnalysisResult {
  const allText = sampledChunks.map((chunk) => chunk.content).join(' ')
  const sentences = splitSentences(allText)
  const keyPoints = sentences.slice(0, 5).map((sentence) => (sentence.length > 160 ? `${sentence.slice(0, 157)}...` : sentence))

  const riskKeywords: Array<{ severity: RiskFlag['severity']; title: string; terms: string[] }> = [
    { severity: 'high', title: 'Liability or damages language', terms: ['liable', 'liability', 'damages', 'penalty', 'breach'] },
    { severity: 'medium', title: 'Termination or suspension language', terms: ['terminate', 'termination', 'suspend', 'cancel'] },
    { severity: 'medium', title: 'Payment or fee language', terms: ['payment', 'fees', 'charges', 'refund', 'invoice'] },
    { severity: 'low', title: 'Change or amendment language', terms: ['amend', 'change', 'modify', 'update'] },
  ]

  const risks: RiskFlag[] = []
  for (const chunk of sampledChunks) {
    const sentence = splitSentences(chunk.content).find((item) => riskKeywords.some((risk) => risk.terms.some((term) => item.toLowerCase().includes(term))))
    if (!sentence) continue
    const match = riskKeywords.find((risk) => risk.terms.some((term) => sentence.toLowerCase().includes(term)))
    if (!match || risks.some((risk) => risk.title === match.title)) continue
    risks.push({
      title: match.title,
      severity: match.severity,
      explanation: 'This topic may require review because it affects user obligations, financial exposure, or legal remedies.',
      excerpt: sentence.slice(0, 300),
      page: chunk.pageNumber,
    })
    if (risks.length >= 5) break
  }

  const obligations = sampledChunks
    .flatMap((chunk) =>
      splitSentences(chunk.content)
        .filter((sentence) => /\b(must|shall|required|agree|responsible|obligation|will)\b/i.test(sentence))
        .slice(0, 2)
        .map((sentence) => ({
          actor: 'Relevant party',
          obligation: sentence.slice(0, 260),
          excerpt: sentence.slice(0, 300),
          page: chunk.pageNumber,
        })),
    )
    .slice(0, 8)

  return {
    document_id: documentId,
    summary: keyPoints.length > 0 ? keyPoints.slice(0, 3).join(' ') : 'A structured summary could not be generated from the extracted text.',
    key_points: keyPoints,
    risks,
    obligations,
  }
}

export async function runAnalysisAgent(documentId: string): Promise<AnalysisResult> {
  const allChunks = await db.select().from(chunks).where(eq(chunks.documentId, documentId))
  const sampleCount = Math.min(8, allChunks.length)
  const step = Math.max(1, Math.floor(allChunks.length / Math.max(sampleCount, 1)))
  const sampledChunks = Array.from({ length: sampleCount }, (_, i) => allChunks[Math.min(i * step, allChunks.length - 1)]).filter(Boolean)
  const contextText = sampledChunks.map((chunk) => `[page: ${chunk.pageNumber}]\n${chunk.content}`).join('\n\n---\n\n')

  let analysis: AnalysisResult
  if (!contextText.trim()) {
    analysis = fallbackAnalysis(documentId, [])
  } else {
    const prompt = `You are SambidhanGPT's legal document analyzer. Analyze only the provided document excerpts.
Return strict JSON:
{
  "summary": "concise document summary",
  "key_points": ["point 1", "point 2"],
  "risks": [{"title":"...", "severity":"low|medium|high", "explanation":"...", "excerpt":"...", "page": 1}],
  "obligations": [{"actor":"...", "obligation":"...", "deadline":"optional", "excerpt":"...", "page": 1}]
}
Do not use outside knowledge. If a field is not found, return an empty array.

Document excerpts:
${contextText}`

    try {
      const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '')
      const model = genAI.getGenerativeModel({
        model: 'gemini-2.5-flash',
        generationConfig: {
          temperature: 0.2,
          maxOutputTokens: 1200,
          responseMimeType: 'application/json',
        },
      })
      const result = await model.generateContent(prompt)
      const parsed = parseAnalysis(result.response.text())
      analysis = {
        document_id: documentId,
        summary: parsed.summary,
        key_points: parsed.key_points,
        risks: parsed.risks,
        obligations: parsed.obligations,
      }
    } catch (err) {
      console.error('[AnalysisAgent] Gemini analysis failed:', err)
      analysis = fallbackAnalysis(documentId, sampledChunks)
    }
  }

  if (!analysis.summary.trim()) {
    analysis = fallbackAnalysis(documentId, sampledChunks)
  }

  await db.delete(documentAnalysis).where(eq(documentAnalysis.documentId, documentId))
  await db.insert(documentAnalysis).values({
    id: crypto.randomUUID(),
    documentId,
    summary: analysis.summary,
    keyPoints: analysis.key_points,
    risks: analysis.risks,
    obligations: analysis.obligations,
  })

  return analysis
}
