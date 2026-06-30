interface CompressibleChunk {
  id: string
  pageNumber: number
  content: string
}

function words(input: string) {
  return input
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .split(/\s+/)
    .filter(Boolean)
}

function splitSentences(input: string) {
  const sentences = input.match(/[^.!?\n]+[.!?\n]*/g)
  return sentences?.map((sentence) => sentence.trim()).filter(Boolean) ?? [input]
}

export function compressChunksForQuestion<T extends CompressibleChunk>(chunks: T[], question: string) {
  const queryTerms = new Set(words(question))

  return chunks.map((chunk) => {
    const ranked = splitSentences(chunk.content)
      .map((sentence, index) => {
        const sentenceTerms = words(sentence)
        const score = sentenceTerms.reduce((total, term) => total + (queryTerms.has(term) ? 1 : 0), 0)
        return { sentence, index, score }
      })
      .sort((a, b) => b.score - a.score || a.index - b.index)
      .slice(0, 4)
      .sort((a, b) => a.index - b.index)

    const selected = ranked.some((item) => item.score > 0) ? ranked.map((item) => item.sentence).join(' ') : chunk.content.slice(0, 1200)

    return {
      ...chunk,
      compressedContent: selected,
    }
  })
}
