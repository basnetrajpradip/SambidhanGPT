import { useEffect, useState } from 'react'
import type { CSSProperties, MouseEvent as ReactMouseEvent } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, LogOut, FileText, MessageSquare, PanelLeftClose, PanelLeftOpen, PanelRightOpen, ScrollText, Sparkles } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'

import { ClauseSidebar } from '@/components/ClauseSidebar'
import { PDFViewer } from '@/components/PDFViewer'
import { ChatInterface } from '@/components/ChatInterface'
import { AnalysisPanel } from '@/components/AnalysisPanel'

import { getAnalysis, getClauses, getDocument, getSuggestions, type Clause, type DocumentAnalysis, type DocumentSummary } from '@/services/document-service'
import type { Citation } from '@/services/chat-service'
import type { User } from '@/services/auth-service'

type MobilePanel = 'chat' | 'pdf' | 'info'
type InfoPanel = 'analysis' | 'clauses'

function ClauseSidebarSkeleton() {
  return (
    <div className="flex flex-col gap-3 p-4">
      <Skeleton className="h-4 w-24" />
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="flex flex-col gap-1.5">
          <Skeleton className="h-3 w-16" />
          <Skeleton className="h-8 w-full" />
        </div>
      ))}
    </div>
  )
}

function ChatSkeleton() {
  return (
    <div className="flex flex-col gap-4 p-4">
      <Skeleton className="h-4 w-32" />
      <div className="flex flex-col gap-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className={`h-10 ${i % 2 === 0 ? 'w-3/4' : 'w-1/2 self-end'}`} />
        ))}
      </div>
      <Skeleton className="mt-auto h-10 w-full rounded-lg" />
    </div>
  )
}

function PDFSkeleton() {
  return (
    <div className="flex flex-col gap-2 p-4 h-full">
      <Skeleton className="h-full w-full rounded-lg" />
    </div>
  )
}

interface DocumentPageProps {
  user: User
  onLogout: () => void
}

export default function DocumentPage({ user, onLogout }: DocumentPageProps) {
  const { id: documentId } = useParams<{ id: string }>()
  const navigate = useNavigate()

  const [document, setDocument] = useState<DocumentSummary | null>(null)
  const [analysis, setAnalysis] = useState<DocumentAnalysis | null>(null)
  const [clauses, setClauses] = useState<Clause[]>([])
  const [suggestions, setSuggestions] = useState<string[]>([])
  const [highlights, setHighlights] = useState<Citation[]>([])
  const [clausePage, setClausePage] = useState<number | undefined>(undefined)
  const [selectedPdfText, setSelectedPdfText] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeMobilePanel, setActiveMobilePanel] = useState<MobilePanel>('info')
  const [activeInfoPanel, setActiveInfoPanel] = useState<InfoPanel>('analysis')
  const [infoPanelWidth, setInfoPanelWidth] = useState(340)
  const [chatPanelWidth, setChatPanelWidth] = useState(380)
  const [isInfoCollapsed, setIsInfoCollapsed] = useState(false)
  const [isChatCollapsed, setIsChatCollapsed] = useState(false)
  const [isPdfFullscreen, setIsPdfFullscreen] = useState(false)

  useEffect(() => {
    if (!documentId) return
    Promise.all([getDocument(documentId), getAnalysis(documentId), getClauses(documentId), getSuggestions(documentId)])
      .then(([doc, analysisResult, cls, sgst]) => {
        setDocument(doc)
        setAnalysis(analysisResult)
        setClauses(cls)
        setSuggestions(sgst)
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : 'Failed to load document data.')
      })
      .finally(() => setLoading(false))
  }, [documentId])

  useEffect(() => {
    queueMicrotask(() => setSelectedPdfText(null))
  }, [documentId])

  if (!documentId) {
    return (
      <div className="flex h-screen items-center justify-center">
        <p className="text-muted-foreground">Document not found.</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex h-screen flex-col items-center justify-center gap-4">
        <p className="text-destructive">{error}</p>
        <Button variant="outline" onClick={() => navigate('/')}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Upload
        </Button>
      </div>
    )
  }

  const clausePanel = loading ? (
    <ClauseSidebarSkeleton />
  ) : (
    <ClauseSidebar
      clauses={clauses}
      onClauseClick={(clause) => {
        setHighlights([
          {
            chunk_id: clause.id,
            page: clause.pageNumber,
            char_offset_start: 0,
            char_offset_end: 0,
            excerpt: clause.excerpt,
          },
        ])
        setClausePage(clause.pageNumber)
        setActiveMobilePanel('pdf')
      }}
    />
  )

  const chatPanel = loading ? (
    <ChatSkeleton />
  ) : (
    <ChatInterface
      documentId={documentId}
      suggestions={suggestions}
      selectedText={selectedPdfText}
      onClearSelectedText={() => setSelectedPdfText(null)}
      onCollapse={() => setIsChatCollapsed(true)}
      onCitationClick={(c) => {
        setHighlights([c])
        setActiveMobilePanel('pdf')
      }}
    />
  )

  const pdfPanel = loading ? (
    <PDFSkeleton />
  ) : (
    <PDFViewer
      documentId={documentId}
      highlights={highlights}
      targetPage={clausePage}
      isFullscreen={isPdfFullscreen}
      onToggleFullscreen={() => {
        setIsPdfFullscreen((value) => !value)
        setActiveMobilePanel('pdf')
      }}
      onAskSelection={(text) => {
        setSelectedPdfText(text)
        setIsPdfFullscreen(false)
        setActiveMobilePanel('chat')
      }}
    />
  )
  const analysisPanel = <AnalysisPanel analysis={analysis} loading={loading} />
  const infoPanel = (
    <>
      <div className="border-b border-border/70 p-2">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={() => setIsInfoCollapsed(true)} aria-label="Collapse review panel" className="hidden h-9 w-9 shrink-0 rounded-xl text-muted-foreground hover:text-foreground xl:inline-flex">
            <PanelLeftClose className="h-4 w-4" />
          </Button>
          <div className="grid flex-1 grid-cols-2 gap-2 rounded-2xl bg-muted/60 p-1">
            {[
              { id: 'analysis' as const, label: 'Analysis', icon: Sparkles },
              { id: 'clauses' as const, label: 'Clauses', icon: ScrollText },
            ].map((tab) => {
              const Icon = tab.icon
              const active = activeInfoPanel === tab.id
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveInfoPanel(tab.id)}
                  className={[
                    'flex items-center justify-center gap-1.5 rounded-xl px-3 py-2 text-xs font-semibold transition',
                    active ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground',
                  ].join(' ')}
                >
                  <Icon className="h-3.5 w-3.5" />
                  {tab.label}
                </button>
              )
            })}
          </div>
        </div>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto">{activeInfoPanel === 'analysis' ? analysisPanel : clausePanel}</div>
    </>
  )

  const startResize =
    (target: 'info' | 'chat') =>
    (event: ReactMouseEvent<HTMLDivElement>) => {
      event.preventDefault()
      const startX = event.clientX
      const startWidth = target === 'info' ? infoPanelWidth : chatPanelWidth
      const viewportWidth = window.innerWidth
      const desktopPaddingAndGaps = 88
      const minPdfWidth = 420
      const minInfoWidth = 280
      const minChatWidth = 320
      const collapsedPanelWidth = 56
      const rightPanelWidth = isChatCollapsed ? collapsedPanelWidth : chatPanelWidth
      const leftPanelWidth = isInfoCollapsed ? collapsedPanelWidth : infoPanelWidth
      const maxInfoWidth = Math.max(minInfoWidth, viewportWidth - rightPanelWidth - minPdfWidth - desktopPaddingAndGaps)
      const maxChatWidth = Math.max(minChatWidth, viewportWidth - leftPanelWidth - minPdfWidth - desktopPaddingAndGaps)

      const onMove = (moveEvent: MouseEvent) => {
        const delta = moveEvent.clientX - startX
        if (target === 'info') {
          setInfoPanelWidth(Math.min(maxInfoWidth, Math.max(minInfoWidth, startWidth + delta)))
        } else {
          setChatPanelWidth(Math.min(maxChatWidth, Math.max(minChatWidth, startWidth - delta)))
        }
      }

      const onUp = () => {
        window.removeEventListener('mousemove', onMove)
        window.removeEventListener('mouseup', onUp)
        window.document.body.style.cursor = ''
        window.document.body.style.userSelect = ''
      }

      window.document.body.style.cursor = 'col-resize'
      window.document.body.style.userSelect = 'none'
      window.addEventListener('mousemove', onMove)
      window.addEventListener('mouseup', onUp)
    }

  const mobileTabs: Array<{ id: MobilePanel; label: string; icon: typeof MessageSquare }> = [
    { id: 'chat', label: 'Chat', icon: MessageSquare },
    { id: 'pdf', label: 'PDF', icon: FileText },
    { id: 'info', label: 'Review', icon: Sparkles },
  ]

  const mobileHeader = (
    <header className="flex xl:hidden items-center justify-between border-b border-white/50 px-3 py-2 shrink-0 bg-card/80 backdrop-blur-xl">
      <div className="flex min-w-0 items-center gap-2">
        <Button variant="ghost" size="icon" onClick={() => navigate('/')} aria-label="Back" className="h-9 w-9">
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold">{document?.name ?? 'SambidhanGPT'}</p>
          <p className="text-[11px] text-muted-foreground">{document ? `${document.chunkCount} chunks · ${clauses.length} clauses` : 'Document workspace'}</p>
        </div>
      </div>
      <Button variant="ghost" size="icon" onClick={onLogout} aria-label="Sign out" className="h-9 w-9">
        <LogOut className="h-4 w-4" />
      </Button>
    </header>
  )

  return (
    <div className="flex h-dvh flex-col overflow-hidden bg-[radial-gradient(circle_at_top_left,_oklch(0.9_0.07_255)_0,_transparent_30rem),linear-gradient(135deg,_oklch(0.99_0.015_250),_oklch(0.95_0.035_210))]">
      {mobileHeader}

      <header className="hidden xl:flex items-center justify-between border-b border-white/60 bg-card/75 px-5 py-3 backdrop-blur-xl shadow-sm">
        <div className="flex min-w-0 items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate('/')} aria-label="Back">
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="rounded-xl bg-primary/10 p-2 text-primary ring-1 ring-primary/10">
            <FileText className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold">{document?.name ?? 'Document workspace'}</p>
            <p className="text-xs text-muted-foreground">
              {document ? `${document.chunkCount} chunks · ${document.clauseCount ?? clauses.length} clauses · ${suggestions.length} suggestions` : user.email}
            </p>
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={onLogout}>
          <LogOut className="mr-2 h-4 w-4" />
          Sign out
        </Button>
      </header>

      <nav className="grid w-full grid-cols-3 gap-2 border-b border-white/50 bg-card/70 px-3 py-2 backdrop-blur-xl xl:hidden">
        {mobileTabs.map((tab) => {
          const Icon = tab.icon
          const active = activeMobilePanel === tab.id
          return (
            <button
              key={tab.id}
              onClick={() => {
                setActiveMobilePanel(tab.id)
                if (tab.id !== 'pdf') setIsPdfFullscreen(false)
              }}
              className={[
                'flex w-full items-center justify-center gap-1.5 rounded-full px-3 py-2 text-xs font-semibold transition',
                active ? 'bg-primary text-primary-foreground shadow-md shadow-primary/20' : 'bg-background/70 text-muted-foreground hover:text-foreground',
              ].join(' ')}
            >
              <Icon className="h-3.5 w-3.5" />
              {tab.label}
            </button>
          )
        })}
      </nav>

      <div className="flex min-h-0 flex-1 overflow-hidden xl:gap-2 xl:p-4">
        {!isPdfFullscreen && (
          <aside
            className={[
              activeMobilePanel === 'info' ? 'flex' : 'hidden',
              'min-h-0 w-full flex-col overflow-hidden bg-card/85 backdrop-blur-xl xl:flex xl:shrink-0 xl:rounded-2xl xl:border xl:border-white/60 xl:shadow-xl xl:shadow-slate-900/5',
              isInfoCollapsed ? 'xl:w-14 xl:basis-14' : 'xl:w-[var(--info-panel-width)] xl:basis-[var(--info-panel-width)]',
            ].join(' ')}
            style={{ '--info-panel-width': `${infoPanelWidth}px` } as CSSProperties}
          >
            {isInfoCollapsed ? (
              <>
                <div className="flex min-h-0 flex-1 flex-col xl:hidden">{infoPanel}</div>
                <div className="hidden h-full flex-col items-center gap-3 px-2 py-3 xl:flex">
                  <Button variant="ghost" size="icon" onClick={() => setIsInfoCollapsed(false)} aria-label="Expand review panel" className="h-9 w-9 rounded-xl text-muted-foreground hover:text-foreground">
                    <PanelLeftOpen className="h-4 w-4" />
                  </Button>
                  <div className="rounded-xl bg-primary/10 p-2 text-primary">
                    <Sparkles className="h-4 w-4" />
                  </div>
                </div>
              </>
            ) : (
              <div className="flex min-h-0 flex-1 flex-col">{infoPanel}</div>
            )}
          </aside>
        )}

        {!isPdfFullscreen && !isInfoCollapsed && (
          <div onMouseDown={startResize('info')} className="hidden w-3 shrink-0 cursor-col-resize items-center justify-center rounded-full hover:bg-primary/10 xl:flex" aria-hidden>
            <div className="h-12 w-1 rounded-full bg-border" />
          </div>
        )}

        <main
          className={[
            activeMobilePanel === 'pdf' || isPdfFullscreen ? 'flex' : 'hidden',
            'min-h-0 w-full flex-1 flex-col overflow-hidden bg-card/80 backdrop-blur-xl xl:flex xl:rounded-2xl xl:border xl:border-white/60 xl:shadow-xl xl:shadow-slate-900/5',
          ].join(' ')}
        >
          {pdfPanel}
        </main>

        {!isPdfFullscreen && !isChatCollapsed && (
          <div onMouseDown={startResize('chat')} className="hidden w-3 shrink-0 cursor-col-resize items-center justify-center rounded-full hover:bg-primary/10 xl:flex" aria-hidden>
            <div className="h-12 w-1 rounded-full bg-border" />
          </div>
        )}

        {!isPdfFullscreen && (
          <section
            className={[
              activeMobilePanel === 'chat' ? 'flex' : 'hidden',
              'min-h-0 w-full flex-col overflow-hidden bg-card/85 backdrop-blur-xl xl:flex xl:shrink-0 xl:rounded-2xl xl:border xl:border-white/60 xl:shadow-xl xl:shadow-slate-900/5',
              isChatCollapsed ? 'xl:w-14 xl:basis-14' : 'xl:w-[var(--chat-panel-width)] xl:basis-[var(--chat-panel-width)]',
            ].join(' ')}
            style={{ '--chat-panel-width': `${chatPanelWidth}px` } as CSSProperties}
          >
            {isChatCollapsed ? (
              <>
                <div className="flex h-full min-h-0 flex-col xl:hidden">{chatPanel}</div>
                <div className="hidden h-full flex-col items-center gap-3 px-2 py-3 xl:flex">
                  <Button variant="ghost" size="icon" onClick={() => setIsChatCollapsed(false)} aria-label="Expand chat" className="h-9 w-9 rounded-xl text-muted-foreground hover:text-foreground">
                    <PanelRightOpen className="h-4 w-4" />
                  </Button>
                  <div className="rounded-xl bg-primary/10 p-2 text-primary">
                    <MessageSquare className="h-4 w-4" />
                  </div>
                </div>
              </>
            ) : (
              <div className="flex h-full min-h-0 flex-col">{chatPanel}</div>
            )}
          </section>
        )}
      </div>
    </div>
  )
}
