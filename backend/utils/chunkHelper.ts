import { RecursiveCharacterTextSplitter } from '@langchain/textsplitters'

export interface ExtractedPage {
  pageNumber: number
  text: string
  startOffset: number
  endOffset: number
}

export interface ChunkWithMetadata {
  content: string
  pageNumber: number
  charOffsetStart: number
  charOffsetEnd: number
}

export function getPageNumberForOffset(pages: ExtractedPage[], offset: number) {
  const page = pages.find((item) => offset >= item.startOffset && offset <= item.endOffset)
  if (page) return page.pageNumber

  for (let i = pages.length - 1; i >= 0; i--) {
    if (offset >= pages[i].startOffset) return pages[i].pageNumber
  }

  return 1
}

export async function chunkTextWithMetadata(fullText: string, pages: ExtractedPage[]): Promise<ChunkWithMetadata[]> {
  const splitter = new RecursiveCharacterTextSplitter({
    chunkSize: Number(process.env.CHUNK_SIZE || 500),
    chunkOverlap: Number(process.env.CHUNK_OVERLAP || 50),
    separators: ['\n\n', '\n', '. ', ' ', ''],
  })

  const rawChunks = await splitter.splitText(fullText)
  const chunks: ChunkWithMetadata[] = []
  let searchFrom = 0

  for (const content of rawChunks) {
    let start = fullText.indexOf(content, searchFrom)
    if (start < 0) {
      start = fullText.indexOf(content)
    }
    if (start < 0) {
      start = Math.min(searchFrom, Math.max(0, fullText.length - content.length))
    }

    const end = start + content.length
    chunks.push({
      content,
      pageNumber: getPageNumberForOffset(pages, start),
      charOffsetStart: start,
      charOffsetEnd: end,
    })

    searchFrom = Math.max(start + 1, end - Number(process.env.CHUNK_OVERLAP || 50))
  }

  return chunks
}
