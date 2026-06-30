import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf.js'
import { GoogleGenerativeAIEmbeddings } from '@langchain/google-genai'
import { db } from '../configs/db-config'
import { documents, chunks } from '../db/schema'
import crypto from 'crypto'
import fs from 'fs'
import { runClauseAgent } from './clause-agent'
import { runSuggestionAgent } from './suggestion-agent'
import { runAnalysisAgent } from './analysis-agent'
import { chunkTextWithMetadata, ExtractedPage } from '../utils/chunkHelper'

interface IngestionParams {
  filePath: string
  originalName: string
  ownerId: string
}

export const runIngestionAgent = async ({ filePath, originalName, ownerId }: IngestionParams) => {
  let chunkCount = 0
  let skippedChunks = 0
  let documentId = crypto.randomUUID()
  try {
    // 1. Parse PDF
    const data = new Uint8Array(fs.readFileSync(filePath))
    const pdf = await pdfjsLib.getDocument({ data }).promise
    let fullText = ''
    const pages: ExtractedPage[] = []
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i)
      const content = await page.getTextContent()
      const pageText = content.items.map((item: any) => item.str).join(' ')
      const startOffset = fullText.length
      fullText += pageText + '\n'
      pages.push({
        pageNumber: i,
        text: pageText,
        startOffset,
        endOffset: fullText.length,
      })
    }

    // 2. Chunk text
    const chunksArr = await chunkTextWithMetadata(fullText, pages)

    // 3. Embed each chunk
    const embedder = new GoogleGenerativeAIEmbeddings({
      apiKey: process.env.GEMINI_API_KEY,
      model: 'gemini-embedding-001',
      outputDimensionality: Number(process.env.EMBEDDING_DIMENSIONS || 3072),
    } as any)

    // 4. Store document row
    await db.insert(documents).values({
      id: documentId,
      name: originalName,
      filePath,
      ownerId,
    })

    // 5. Store chunks
    for (let idx = 0; idx < chunksArr.length; idx++) {
      const chunk = chunksArr[idx]
      // Embed
      let embedding: number[] = []
      try {
        embedding = await embedder.embedQuery(chunk.content)
      } catch (err) {
        skippedChunks++
        continue
      }

      await db.insert(chunks).values({
        id: crypto.randomUUID(),
        documentId,
        content: chunk.content,
        pageNumber: chunk.pageNumber,
        charOffsetStart: chunk.charOffsetStart,
        charOffsetEnd: chunk.charOffsetEnd,
        embedding: embedding,
      })
      chunkCount++
    }

    // 6. Trigger ClauseAgent and SuggestionAgent
    await runClauseAgent(documentId)
    await runSuggestionAgent(documentId)
    await runAnalysisAgent(documentId)

    return { document_id: documentId, chunk_count: chunkCount, skipped_chunks: skippedChunks, status: skippedChunks > 0 ? 'partial' : 'complete' }
  } catch (err: any) {
    console.error('Cause:', err)
    return { document_id: documentId, chunk_count: chunkCount, skipped_chunks: skippedChunks, status: 'failed', error: err.message }
  }
}
