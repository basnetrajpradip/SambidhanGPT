import { useCallback, useEffect, useRef, useState } from 'react'
import { Document, Page, pdfjs } from 'react-pdf'
import type { ComponentProps } from 'react'
import type { PDFDocumentProxy } from 'pdfjs-dist'
import 'react-pdf/dist/Page/AnnotationLayer.css'
import 'react-pdf/dist/Page/TextLayer.css'

import { ChevronLeft, ChevronRight, ZoomIn, ZoomOut, RotateCcw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { mapCitationsToHighlights, type Citation, type HighlightRegion } from '@/services/citation-agent'

// pdfjs.version ensures the CDN worker version matches the bundled API version,
// avoiding the "API version does not match Worker version" runtime error.
pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`

const DEFAULT_SCALE = 1.5
const MIN_SCALE = 0.6
const MAX_SCALE = 3.0
const ZOOM_STEP = 0.25

// react-pdf ships an augmented PDFDocumentProxy superset; the cast to pdfjs-dist's
// type is safe because citation-agent only calls .getPage().
type DocLoadCallback = NonNullable<ComponentProps<typeof Document>['onLoadSuccess']>
type ReactPDFProxy = Parameters<DocLoadCallback>[0]

export interface PDFViewerProps {
  documentId: string
  highlights?: Citation[]
  targetPage?: number
}

interface PageOverlayProps {
  regions: HighlightRegion[]
  page: number
}

function PageOverlay({ regions, page }: PageOverlayProps) {
  const pageRegions = regions.filter((r) => r.page === page)
  if (pageRegions.length === 0) return null

  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 z-10">
      {pageRegions.flatMap((region) =>
        region.rects.map((rect, i) => (
          <div
            key={`${region.chunk_id}-${i}`}
            style={{
              position: 'absolute',
              left: rect.x,
              top: rect.y,
              width: rect.width,
              height: rect.height,
              background: 'rgba(255, 213, 0, 0.38)',
              borderRadius: 2,
              mixBlendMode: 'multiply',
            }}
          />
        )),
      )}
    </div>
  )
}

export function PDFViewer({ documentId, highlights = [], targetPage }: PDFViewerProps) {
  const pdfUrl = `${import.meta.env.VITE_API_BASE_URL}/documents/${documentId}/file`

  const [numPages, setNumPages] = useState<number>(0)
  const [currentPage, setCurrentPage] = useState<number>(1)
  const [scale, setScale] = useState<number>(DEFAULT_SCALE)
  const [pdfDoc, setPdfDoc] = useState<PDFDocumentProxy | null>(null)
  const [regions, setRegions] = useState<HighlightRegion[]>([])
  const [loadError, setLoadError] = useState<string | null>(null)
  const scrollContainerRef = useRef<HTMLDivElement>(null)

  const handleDocumentLoad = useCallback((proxy: ReactPDFProxy) => {
    setNumPages(proxy.numPages)
    setCurrentPage(1)
    setPdfDoc(proxy as unknown as PDFDocumentProxy)
    setLoadError(null)
  }, [])

  useEffect(() => {
    if (!pdfDoc || highlights.length === 0) {
      queueMicrotask(() => setRegions([]))
      return
    }

    let cancelled = false
    mapCitationsToHighlights(highlights, pdfDoc, scale)
      .then((computed) => {
        if (!cancelled) setRegions(computed)
      })
      .catch((err) => {
        if (!cancelled) console.warn('[PDFViewer] citation mapping failed', err)
      })

    return () => {
      cancelled = true
    }
  }, [highlights, pdfDoc, scale])

  useEffect(() => {
    if (highlights.length === 0) return
    const firstPage = highlights[0].page
    if (firstPage >= 1 && firstPage <= numPages) {
      queueMicrotask(() => {
        setCurrentPage(firstPage)
      })
    }
  }, [highlights, numPages])

  useEffect(() => {
    if (!targetPage) return
    if (targetPage >= 1 && targetPage <= numPages) {
      queueMicrotask(() => setCurrentPage(targetPage))
    }
  }, [targetPage, numPages])

  useEffect(() => {
    if (regions.length === 0) return
    const firstRect = regions[0].rects[0]
    if (!firstRect) return

    // rAF defers until after react-pdf has painted the new page canvas
    const raf = requestAnimationFrame(() => {
      const container = scrollContainerRef.current
      if (!container) return
      // page is flex-centered — offsetTop accounts for the surrounding padding
      const pageEl = container.querySelector('.react-pdf__Page') as HTMLElement | null
      if (!pageEl) return
      const pageTop = pageEl.offsetTop
      const rectCenter = firstRect.y + firstRect.height / 2
      const targetScrollTop = pageTop + rectCenter - container.clientHeight / 2
      container.scrollTo({ top: targetScrollTop, behavior: 'smooth' })
    })
    return () => cancelAnimationFrame(raf)
  }, [regions])

  const goToPrev = () => setCurrentPage((p) => Math.max(1, p - 1))
  const goToNext = () => setCurrentPage((p) => Math.min(numPages, p + 1))

  const zoomIn = () => setScale((s) => Math.min(MAX_SCALE, +(s + ZOOM_STEP).toFixed(2)))
  const zoomOut = () => setScale((s) => Math.max(MIN_SCALE, +(s - ZOOM_STEP).toFixed(2)))
  const zoomReset = () => setScale(DEFAULT_SCALE)

  return (
    <div className="flex flex-col h-full overflow-hidden bg-muted/30">
      <div className="flex items-center justify-between border-b px-4 py-2 bg-background shrink-0">
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" onClick={goToPrev} disabled={currentPage <= 1} aria-label="Previous page" className="h-7 w-7">
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-xs text-muted-foreground font-medium tabular-nums w-24 text-center">
            {numPages > 0 ? `${currentPage} / ${numPages}` : '—'}
          </span>
          <Button variant="ghost" size="icon" onClick={goToNext} disabled={currentPage >= numPages} aria-label="Next page" className="h-7 w-7">
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" onClick={zoomOut} disabled={scale <= MIN_SCALE} aria-label="Zoom out" className="h-7 w-7">
            <ZoomOut className="h-4 w-4" />
          </Button>
          <span className="text-xs tabular-nums w-12 text-center text-muted-foreground select-none">{Math.round(scale * 100)}%</span>
          <Button variant="ghost" size="icon" onClick={zoomReset} aria-label="Reset zoom" className="h-7 w-7">
            <RotateCcw className="h-3.5 w-3.5" />
          </Button>
          <Button variant="ghost" size="icon" onClick={zoomIn} disabled={scale >= MAX_SCALE} aria-label="Zoom in" className="h-7 w-7">
            <ZoomIn className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div ref={scrollContainerRef} className="flex-1 overflow-y-auto flex justify-center py-4 px-2">
        {loadError ? (
          <div className="flex items-center justify-center h-full">
            <p className="text-sm text-destructive">{loadError}</p>
          </div>
        ) : (
          <Document
            file={pdfUrl}
            onLoadSuccess={handleDocumentLoad}
            onLoadError={(err) => setLoadError(`Failed to load PDF: ${err.message}`)}
            loading={
              <div className="flex items-center justify-center h-40">
                <p className="text-sm text-muted-foreground animate-pulse">Loading PDF…</p>
              </div>
            }
          >
            {/* key on both page + scale forces canvas redraw at the new resolution */}
            <div key={`${currentPage}-${scale}`} className="relative inline-block">
              <Page pageNumber={currentPage} scale={scale} renderTextLayer renderAnnotationLayer={false} />
              <PageOverlay regions={regions} page={currentPage} />
            </div>
          </Document>
        )}
      </div>
    </div>
  )
}
