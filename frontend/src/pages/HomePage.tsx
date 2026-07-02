import { useCallback, useEffect, useRef, useState } from 'react'
import type { ChangeEvent, DragEvent, KeyboardEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { Clock, LogOut, MessageSquare, Send, Upload, FileText, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Textarea } from '@/components/ui/textarea'
import { listDocuments, uploadDocument, type DocumentSummary } from '@/services/document-service'
import { resolveChatDocument } from '@/services/chat-service'
import type { User } from '@/services/auth-service'

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`
}

interface HomePageProps {
  user: User
  onLogout: () => void
}

function formatDate(input: string) {
  return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(input))
}

function createInitialQuestionId() {
  if (typeof window.crypto.randomUUID === 'function') return window.crypto.randomUUID()
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`
}

export default function HomePage({ user, onLogout }: HomePageProps) {
  const navigate = useNavigate()
  const inputRef = useRef<HTMLInputElement>(null)
  const [file, setFile] = useState<File | null>(null)
  const [dragging, setDragging] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [documents, setDocuments] = useState<DocumentSummary[]>([])
  const [loadingDocuments, setLoadingDocuments] = useState(true)
  const [homeQuestion, setHomeQuestion] = useState('')
  const [resolvingQuestion, setResolvingQuestion] = useState(false)

  useEffect(() => {
    listDocuments()
      .then(setDocuments)
      .catch((err) => toast.error(err instanceof Error ? err.message : 'Failed to load documents.'))
      .finally(() => setLoadingDocuments(false))
  }, [])

  const acceptFile = (f: File) => {
    if (f.type !== 'application/pdf') {
      toast.error('Only PDF files are supported.')
      return
    }
    setFile(f)
    setProgress(0)
  }

  const handleDragOver = useCallback((e: DragEvent) => {
    e.preventDefault()
    setDragging(true)
  }, [])

  const handleDragLeave = useCallback(() => {
    setDragging(false)
  }, [])

  const handleDrop = useCallback((e: DragEvent) => {
    e.preventDefault()
    setDragging(false)
    const dropped = e.dataTransfer.files[0]
    if (dropped) acceptFile(dropped)
  }, [])

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const picked = e.target.files?.[0]
    if (picked) acceptFile(picked)
  }

  const handleUpload = async () => {
    if (!file) return
    setUploading(true)
    setProgress(0)
    try {
      const result = await uploadDocument(file, setProgress)
      if (result.status === 'failed') {
        toast.error(result.error ?? 'Ingestion failed. Please try again.')
        setUploading(false)
        return
      }
      if (result.status === 'partial') {
        toast.warning(`${result.skipped_chunks ?? 0} chunks could not be embedded. You can still review the document.`)
      }
      navigate(`/document/${result.document_id}`)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Upload failed. Please try again.'
      toast.error(message)
      setUploading(false)
    }
  }

  const submitHomeQuestion = async () => {
    const question = homeQuestion.trim()
    if (!question || resolvingQuestion) return

    setResolvingQuestion(true)
    try {
      const { documentId } = await resolveChatDocument(question)
      navigate(`/document/${documentId}`, {
        state: {
          initialQuestion: question,
          initialQuestionId: createInitialQuestionId(),
        },
      })
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to find a relevant document.'
      toast.error(message)
      setResolvingQuestion(false)
    }
  }

  const handleHomeQuestionKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      void submitHomeQuestion()
    }
  }

  const clearFile = () => {
    setFile(null)
    setProgress(0)
    if (inputRef.current) inputRef.current.value = ''
  }

  return (
    <div className="min-h-dvh bg-[radial-gradient(circle_at_top_left,_oklch(0.88_0.08_255)_0,_transparent_30rem),radial-gradient(circle_at_bottom_right,_oklch(0.91_0.07_185)_0,_transparent_28rem),linear-gradient(135deg,_oklch(0.99_0.015_250),_oklch(0.95_0.035_210))] px-4 py-6">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-8">
        <header className="flex flex-col gap-4 rounded-3xl border border-white/60 bg-card/70 p-5 shadow-2xl shadow-slate-900/5 backdrop-blur-xl sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-primary">Legal AI workspace</p>
            <h1 className="mt-2 text-4xl font-bold tracking-tight text-foreground sm:text-5xl">SambidhanGPT</h1>
            <p className="mt-2 max-w-2xl text-base leading-7 text-muted-foreground">Welcome back, {user.name || user.email}. Continue a document or upload a new legal PDF for grounded analysis.</p>
          </div>
          <Button variant="outline" onClick={onLogout} className="rounded-2xl bg-background/70">
            <LogOut className="mr-2 h-4 w-4" />
            Sign out
          </Button>
        </header>

        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(22rem,28rem)]">
          <section className="space-y-3">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Recent documents</h2>
            </div>
            {loadingDocuments ? (
              <Card>
                <CardContent className="py-8 text-sm text-muted-foreground">Loading your documents...</CardContent>
              </Card>
            ) : documents.length === 0 ? (
              <Card>
                <CardContent className="py-8 text-sm text-muted-foreground">No documents yet. Upload a PDF to start your first workspace.</CardContent>
              </Card>
            ) : (
              <div className="grid gap-3 md:grid-cols-2">
                {documents.map((doc) => (
                  <button
                    key={doc.id}
                    onClick={() => navigate(`/document/${doc.id}`)}
                  className="rounded-3xl border border-white/60 bg-card/80 p-4 text-left shadow-xl shadow-slate-900/5 backdrop-blur transition hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-2xl hover:shadow-primary/10"
                  >
                    <div className="flex items-start gap-3">
                      <div className="rounded-2xl bg-primary/10 p-2 text-primary ring-1 ring-primary/10">
                        <FileText className="h-5 w-5" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold">{doc.name}</p>
                        <p className="mt-1 text-xs text-muted-foreground">{formatDate(doc.uploadedAt)}</p>
                        <div className="mt-3 flex flex-wrap gap-2 text-[11px] text-muted-foreground">
                          <span className="rounded-full bg-muted px-2 py-0.5">{doc.chunkCount} chunks</span>
                          <span className="rounded-full bg-muted px-2 py-0.5">{doc.conversationCount ?? 0} turns</span>
                        </div>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </section>

          <section>
            <Card className="w-full border-white/60 bg-card/82 shadow-2xl shadow-slate-900/10 backdrop-blur-xl">
              <CardContent className="pt-6 flex flex-col gap-5">
                <div>
                  <h2 className="text-lg font-semibold">Upload a new PDF</h2>
                  <p className="text-sm text-muted-foreground">Analyse Nepali legal documents with grounded answers and citations.</p>
                </div>

                <div
                  role="button"
                  tabIndex={0}
                  aria-label="Upload PDF"
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  onClick={() => !uploading && inputRef.current?.click()}
                  onKeyDown={(e: KeyboardEvent) => e.key === 'Enter' && !uploading && inputRef.current?.click()}
                  className={[
                    'flex cursor-pointer select-none flex-col items-center justify-center gap-3 rounded-3xl border-2 border-dashed px-4 py-12 transition',
                    dragging ? 'border-primary bg-primary/10 shadow-inner' : 'border-primary/20 bg-background/55 hover:border-primary/50 hover:bg-primary/5',
                    uploading ? 'pointer-events-none opacity-60' : '',
                  ].join(' ')}
                >
                  <div className="rounded-3xl bg-primary/10 p-4 text-primary">
                    <Upload className="h-9 w-9" />
                  </div>
                  <div className="text-center">
                    <p className="text-sm font-medium text-foreground">Drag &amp; drop a PDF here</p>
                    <p className="text-xs text-muted-foreground mt-1">or click to browse files</p>
                  </div>
                </div>

                <input ref={inputRef} type="file" accept="application/pdf" className="hidden" onChange={handleFileChange} disabled={uploading} />

                {file && (
                  <div className="flex items-center gap-3 rounded-2xl border bg-background/70 px-3 py-2 shadow-sm">
                    <FileText className="h-5 w-5 shrink-0 text-primary" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate text-foreground">{file.name}</p>
                      <p className="text-xs text-muted-foreground">{formatBytes(file.size)}</p>
                    </div>
                    {!uploading && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          clearFile()
                        }}
                        aria-label="Remove file"
                        className="text-muted-foreground hover:text-destructive transition-colors"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                )}

                {uploading && (
                  <div className="space-y-1">
                    <Progress value={progress} className="h-2" />
                    <p className="text-xs text-muted-foreground text-right">{progress < 100 ? `${progress}% uploaded` : 'Analysing document...'}</p>
                  </div>
                )}

                <Button onClick={handleUpload} disabled={!file || uploading} className="h-11 w-full rounded-2xl shadow-lg shadow-primary/20">
                  {uploading ? 'Uploading & analysing...' : 'Upload & Analyse'}
                </Button>
              </CardContent>
            </Card>
          </section>

          <section className="lg:col-span-2">
            <div className="mx-auto w-full max-w-4xl rounded-3xl border border-white/60 bg-card/85 p-3 shadow-2xl shadow-slate-900/10 backdrop-blur-xl">
              <div className="flex items-end gap-2">
                <div className="hidden h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary ring-1 ring-primary/10 sm:flex">
                  <MessageSquare className="h-5 w-5" />
                </div>
                <Textarea
                  value={homeQuestion}
                  onChange={(e) => setHomeQuestion(e.target.value)}
                  onKeyDown={handleHomeQuestionKeyDown}
                  placeholder="Ask across your documents..."
                  rows={2}
                  disabled={resolvingQuestion}
                  className="min-h-14 flex-1 rounded-2xl border-border/80 bg-background/90 shadow-sm focus:ring-4 focus:ring-primary/10"
                />
                <Button
                  size="icon"
                  onClick={() => void submitHomeQuestion()}
                  disabled={!homeQuestion.trim() || resolvingQuestion}
                  aria-label="Send question"
                  className="h-12 w-12 rounded-2xl shadow-lg shadow-primary/20"
                >
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  )
}
