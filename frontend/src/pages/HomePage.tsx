import { useCallback, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { Upload, FileText, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { uploadDocument } from '@/services/document-service'

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`
}

export default function HomePage() {
  const navigate = useNavigate()
  const inputRef = useRef<HTMLInputElement>(null)
  const [file, setFile] = useState<File | null>(null)
  const [dragging, setDragging] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [progress, setProgress] = useState(0)

  const acceptFile = (f: File) => {
    if (f.type !== 'application/pdf') {
      toast.error('Only PDF files are supported.')
      return
    }
    setFile(f)
    setProgress(0)
  }

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragging(true)
  }, [])

  const handleDragLeave = useCallback(() => {
    setDragging(false)
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragging(false)
    const dropped = e.dataTransfer.files[0]
    if (dropped) acceptFile(dropped)
  }, [])

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
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
      navigate(`/document/${result.document_id}`)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Upload failed. Please try again.'
      toast.error(message)
      setUploading(false)
    }
  }

  const clearFile = () => {
    setFile(null)
    setProgress(0)
    if (inputRef.current) inputRef.current.value = ''
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background px-4">
      <div className="w-full max-w-lg flex flex-col items-center gap-8">
        {/* Header */}
        <div className="text-center space-y-2">
          <h1 className="text-4xl font-bold tracking-tight text-foreground">SambidhanGPT</h1>
          <p className="text-muted-foreground text-base">Ask questions about any Nepali legal document</p>
        </div>

        {/* Upload card */}
        <Card className="w-full">
          <CardContent className="pt-6 flex flex-col gap-5">
            {/* Drop zone */}
            <div
              role="button"
              tabIndex={0}
              aria-label="Upload PDF"
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => !uploading && inputRef.current?.click()}
              onKeyDown={(e) => e.key === 'Enter' && !uploading && inputRef.current?.click()}
              className={[
                'flex flex-col items-center justify-center gap-3 rounded-lg border-2 border-dashed py-10 px-4 cursor-pointer transition-colors select-none',
                dragging ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/60 hover:bg-muted/40',
                uploading ? 'pointer-events-none opacity-60' : '',
              ].join(' ')}
            >
              <Upload className="h-10 w-10 text-muted-foreground" />
              <div className="text-center">
                <p className="text-sm font-medium text-foreground">Drag &amp; drop a PDF here</p>
                <p className="text-xs text-muted-foreground mt-1">or click to browse files</p>
              </div>
            </div>

            <input ref={inputRef} type="file" accept="application/pdf" className="hidden" onChange={handleFileChange} disabled={uploading} />

            {/* Selected file info */}
            {file && (
              <div className="flex items-center gap-3 rounded-md border bg-muted/30 px-3 py-2">
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

            {/* Progress bar */}
            {uploading && (
              <div className="space-y-1">
                <Progress value={progress} className="h-2" />
                <p className="text-xs text-muted-foreground text-right">{progress}%</p>
              </div>
            )}

            {/* Upload button */}
            <Button onClick={handleUpload} disabled={!file || uploading} className="w-full">
              {uploading ? 'Uploading…' : 'Upload & Analyse'}
            </Button>
          </CardContent>
        </Card>

        <p className="text-xs text-muted-foreground text-center">Supports Nepali constitutional and civil law documents in PDF format</p>
      </div>
    </div>
  )
}
