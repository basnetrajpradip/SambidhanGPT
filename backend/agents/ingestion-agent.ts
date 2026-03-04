import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf.js'
import { RecursiveCharacterTextSplitter } from '@langchain/textsplitters'
import { GoogleGenerativeAIEmbeddings } from '@langchain/google-genai'
import { db } from '../configs/db-config'
import { documents, chunks } from '../db/schema'
import { v4 as uuidv4 } from 'uuid'

// Stub ClauseAgent and SuggestionAgent
const triggerClauseAgent = async (documentId: string) => {
  // TODO: Implement actual clause extraction
  return { status: 'triggered' }
}
const triggerSuggestionAgent = async (documentId: string) => {
  // TODO: Implement actual suggestion generation
  return { status: 'triggered' }
}

interface IngestionParams {
  filePath: string
  originalName: string
  ownerId: string
}

export const runIngestionAgent = async ({ filePath, originalName, ownerId }: IngestionParams) => {
  let chunkCount = 0
  let documentId = uuidv4()
  try {
    // 1. Parse PDF
    const data = new Uint8Array(require('fs').readFileSync(filePath))
    const pdf = await pdfjsLib.getDocument({ data }).promise
    let fullText = ''
    const pageOffsets: number[] = []
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i)
      const content = await page.getTextContent()
      const pageText = content.items.map((item: any) => item.str).join(' ')
      pageOffsets.push(fullText.length)
      fullText += pageText + '\n'
    }

    // 2. Chunk text
    const splitter = new RecursiveCharacterTextSplitter({
      chunkSize: 500,
      chunkOverlap: 50,
      separators: ['\n\n', '\n', '. ', ' ', ''],
    })
    const chunksArr = await splitter.splitText(fullText)

    // 3. Embed each chunk
    const embedder = new GoogleGenerativeAIEmbeddings({
      apiKey: process.env.GEMINI_API_KEY,
      model: 'gemini-embedding-001',
    })

    // 4. Store document row
    await db.insert(documents).values({
      id: documentId,
      name: originalName,
      ownerId,
    })

    // 5. Store chunks
    for (let idx = 0; idx < chunksArr.length; idx++) {
      const chunkText = chunksArr[idx]
      // Find page number and offsets
      let pageNumber = 1
      let charOffsetStart = fullText.indexOf(chunkText)
      let charOffsetEnd = charOffsetStart + chunkText.length
      for (let p = 0; p < pageOffsets.length; p++) {
        if (charOffsetStart >= pageOffsets[p]) pageNumber = p + 1
      }
      // Embed
      let embedding: number[] = []
      try {
        embedding = await embedder.embedQuery(chunkText)
      } catch (err) {
        // Log and skip failed chunk
        continue
      }

      await db.insert(chunks).values({
        id: uuidv4(),
        documentId,
        content: chunkText,
        pageNumber,
        charOffsetStart,
        charOffsetEnd,
        embedding: embedding,
      })
      chunkCount++
    }

    // 6. Trigger ClauseAgent and SuggestionAgent
    await triggerClauseAgent(documentId)
    await triggerSuggestionAgent(documentId)

    return { document_id: documentId, chunk_count: chunkCount, status: 'complete' }
  } catch (err: any) {
    console.error('Cause:', err)
    return { document_id: documentId, chunk_count: chunkCount, status: 'failed', error: err.message }
  }
}
