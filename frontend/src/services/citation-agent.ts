import type { PDFDocumentProxy } from 'pdfjs-dist'

export interface Citation {
  chunk_id: string
  page: number
  char_offset_start: number
  char_offset_end: number
  excerpt: string
}

export interface HighlightRegion {
  page: number
  rects: Array<{ x: number; y: number; width: number; height: number }>
  excerpt: string
  chunk_id: string
}

// pdfjs TextItem shape (v5 internals)
interface RawTextItem {
  str: string
  transform: [number, number, number, number, number, number]
  width: number
  height: number
  hasEOL: boolean
}

/** Collapse runs of whitespace + trim — makes matching robust against
 *  pdf-parse vs pdfjs whitespace differences. */
function normalise(s: string): string {
  return s.replace(/\s+/g, ' ').trim()
}

/**
 * mapCitationsToHighlights
 *
 * For each citation:
 *  1. Load the pdfjs page + text content.
 *  2. Build a normalised page-text string with per-item char ranges.
 *  3. Search for the best-length prefix of the normalised excerpt.
 *  4. For each overlapping item compute a precise viewport rect:
 *       - x: offset into the item when the match starts mid-item
 *       - width: derived from convertToViewportPoint(tx + w, ty) - vx
 *         so it survives any transform matrix (rotation, skew)
 *       - y / height: baseline minus scaled font height
 */
export async function mapCitationsToHighlights(citations: Citation[], pdfDocument: PDFDocumentProxy, scale = 1.5): Promise<HighlightRegion[]> {
  const results: HighlightRegion[] = []

  for (const citation of citations) {
    let page
    try {
      page = await pdfDocument.getPage(citation.page)
    } catch {
      continue
    }

    const viewport = page.getViewport({ scale })
    const textContent = await page.getTextContent()

    let rawText = ''
    const rawItems: Array<{
      rawStart: number
      rawEnd: number
      transform: [number, number, number, number, number, number]
      width: number
      fontHeight: number
    }> = []

    for (const raw of textContent.items) {
      const item = raw as unknown as RawTextItem
      if (typeof item.str !== 'string') continue

      const rawStart = rawText.length
      rawText += item.str
      if (item.hasEOL) rawText += ' '

      const fontHeight = Math.abs(item.transform[3]) || Math.abs(item.transform[0]) || 12
      rawItems.push({
        rawStart,
        rawEnd: rawStart + item.str.length,
        transform: item.transform,
        width: item.width,
        fontHeight,
      })
    }

    const normPageText = normalise(rawText)

    // Walk both strings in parallel to map normalised indices back to raw indices
    const normToRaw: number[] = new Array(normPageText.length)
    let ni = 0
    let ri = 0
    const rawNorm = rawText.replace(/\s+/g, ' ')
    while (ni < normPageText.length && ri < rawNorm.length) {
      normToRaw[ni] = ri
      ni++
      ri++
    }

    const normNeedle = normalise(citation.excerpt)

    let matchStart = -1
    let matchEnd = -1
    const minLen = Math.max(30, Math.floor(normNeedle.length / 2))

    for (let len = normNeedle.length; len >= minLen; len = Math.floor(len * 0.8)) {
      const prefix = normNeedle.slice(0, len)
      const idx = normPageText.indexOf(prefix)
      if (idx >= 0) {
        matchStart = idx
        matchEnd = idx + normNeedle.length
        if (matchEnd > normPageText.length) matchEnd = normPageText.length
        break
      }
    }

    if (matchStart < 0) continue

    // Map normalised match offsets back to raw offsets (approximate)
    // A character at norm[i] corresponds to raw[normToRaw[i]]
    const rawMatchStart = normToRaw[matchStart] ?? matchStart
    const rawMatchEnd = normToRaw[Math.min(matchEnd - 1, normToRaw.length - 1)] ?? matchEnd

    // ── Convert overlapping items to viewport rects ─────────────────────
    const rects: Array<{ x: number; y: number; width: number; height: number }> = []

    for (const meta of rawItems) {
      if (meta.rawEnd <= rawMatchStart || meta.rawStart >= rawMatchEnd) continue

      const [, , , , tx, ty] = meta.transform

      // Convert baseline position to viewport space
      const [vx, vy] = viewport.convertToViewportPoint(tx, ty)

      // Width: convert (tx + item.width, ty) → take the x difference
      // This correctly handles any rotation/scale in the transform matrix
      const [vxRight] = viewport.convertToViewportPoint(tx + meta.width, ty)
      const fullWidthVP = Math.abs(vxRight - vx)

      // Proportional width + x-offset for partial overlaps
      const itemCharLen = meta.rawEnd - meta.rawStart
      const overlapStart = Math.max(meta.rawStart, rawMatchStart)
      const overlapEnd = Math.min(meta.rawEnd, rawMatchEnd)
      const startRatio = itemCharLen > 0 ? (overlapStart - meta.rawStart) / itemCharLen : 0
      const overlapRatio = itemCharLen > 0 ? (overlapEnd - overlapStart) / itemCharLen : 1

      const xOffset = fullWidthVP * startRatio
      const widthVP = fullWidthVP * overlapRatio
      // 20% padding above + a bit below the baseline
      const heightVP = meta.fontHeight * scale * 1.3

      rects.push({
        x: vx + xOffset,
        y: vy - heightVP * 0.85, // baseline − ~85% of height so glyph sits inside
        width: widthVP,
        height: heightVP,
      })
    }

    if (rects.length > 0) {
      results.push({
        page: citation.page,
        rects,
        excerpt: citation.excerpt,
        chunk_id: citation.chunk_id,
      })
    }
  }

  return results
}
