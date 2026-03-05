import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { PanelLeft, ArrowLeft } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet'

import { ClauseSidebar } from '@/components/ClauseSidebar'
import { PDFViewer } from '@/components/PDFViewer'
import { ChatInterface } from '@/components/ChatInterface'

import { getClauses, getSuggestions, type Clause } from '@/services/document-service'
import type { Citation } from '@/services/chat-service'

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

export default function DocumentPage() {
  const { id: documentId } = useParams<{ id: string }>()
  const navigate = useNavigate()

  const [clauses, setClauses] = useState<Clause[]>([])
  const [suggestions, setSuggestions] = useState<string[]>([])
  const [highlights, setHighlights] = useState<Citation[]>([])
  const [clausePage, setClausePage] = useState<number | undefined>(undefined)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!documentId) return
    Promise.all([getClauses(documentId), getSuggestions(documentId)])
      .then(([cls, sgst]) => {
        setClauses(cls)
        setSuggestions(sgst)
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : 'Failed to load document data.')
      })
      .finally(() => setLoading(false))
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
        setClausePage(undefined)
      }}
    />
  )

  const mobileHeader = (
    <header className="flex md:hidden items-center justify-between border-b px-4 py-2 shrink-0 bg-background">
      <Button variant="ghost" size="icon" onClick={() => navigate('/')} aria-label="Back">
        <ArrowLeft className="h-5 w-5" />
      </Button>
      <span className="text-sm font-semibold tracking-tight">SambidhanGPT</span>
      <Sheet>
        <SheetTrigger asChild>
          <Button variant="ghost" size="icon" aria-label="Open clauses panel">
            <PanelLeft className="h-5 w-5" />
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="w-72 p-0 overflow-y-auto">
          <SheetHeader className="px-4 pt-4 pb-2">
            <SheetTitle>Legal Clauses</SheetTitle>
          </SheetHeader>
          {clausePanel}
        </SheetContent>
      </Sheet>
    </header>
  )

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-background">
      {mobileHeader}

      <div className="flex flex-1 overflow-hidden">
        <aside className="hidden md:flex flex-col w-64 shrink-0 border-r overflow-y-auto bg-background">
          <div className="flex items-center justify-between px-4 py-3 border-b">
            <span className="text-sm font-semibold tracking-tight">Legal Clauses</span>
          </div>
          {clausePanel}
        </aside>

        <main className="flex flex-col flex-1 overflow-hidden order-last md:order-none">
          {loading ? <PDFSkeleton /> : <PDFViewer documentId={documentId} highlights={highlights} targetPage={clausePage} />}
        </main>

        <section className="flex flex-col w-full md:w-96 shrink-0 md:border-l overflow-hidden order-first md:order-none border-b md:border-b-0">
          {loading ? (
            <ChatSkeleton />
          ) : (
            <ChatInterface documentId={documentId} suggestions={suggestions} onCitationClick={(c) => setHighlights([c])} />
          )}
        </section>
      </div>
    </div>
  )
}
