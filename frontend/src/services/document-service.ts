import api from './api'

export interface UploadDocumentResponse {
  document_id: string
  chunk_count: number
  skipped_chunks?: number
  status: 'complete' | 'partial' | 'failed'
  error?: string
}

export interface DocumentSummary {
  id: string
  name: string
  uploadedAt: string
  ownerId: string
  chunkCount: number
  conversationCount?: number
  clauseCount?: number
  suggestionCount?: number
}

export interface Clause {
  id: string
  documentId: string
  type: string
  title: string
  excerpt: string
  pageNumber: number
}

export interface RiskFlag {
  title: string
  severity: 'low' | 'medium' | 'high'
  explanation: string
  excerpt?: string
  page?: number
}

export interface ObligationItem {
  actor: string
  obligation: string
  deadline?: string
  excerpt?: string
  page?: number
}

export interface DocumentAnalysis {
  id: string
  documentId: string
  summary: string
  keyPoints: string[]
  risks: RiskFlag[]
  obligations: ObligationItem[]
  createdAt: string
  updatedAt: string
}

export async function uploadDocument(file: File, onUploadProgress?: (percent: number) => void): Promise<UploadDocumentResponse> {
  const formData = new FormData()
  formData.append('pdf', file)

  const response = await api.post<UploadDocumentResponse>('/documents/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
    onUploadProgress: (event) => {
      if (onUploadProgress && event.total) {
        onUploadProgress(Math.round((event.loaded * 100) / event.total))
      }
    },
  })

  return response.data
}

export async function getClauses(documentId: string): Promise<Clause[]> {
  const response = await api.get<Clause[]>(`/documents/${documentId}/clauses`)
  return response.data
}

export async function getSuggestions(documentId: string): Promise<string[]> {
  const response = await api.get<string[]>(`/documents/${documentId}/suggestions`)
  return response.data
}

export async function listDocuments(): Promise<DocumentSummary[]> {
  const response = await api.get<DocumentSummary[]>('/documents')
  return response.data
}

export async function getDocument(documentId: string): Promise<DocumentSummary> {
  const response = await api.get<DocumentSummary>(`/documents/${documentId}`)
  return response.data
}

export async function deleteDocument(documentId: string): Promise<void> {
  await api.delete(`/documents/${documentId}`)
}

export async function getAnalysis(documentId: string): Promise<DocumentAnalysis> {
  const response = await api.get<DocumentAnalysis>(`/documents/${documentId}/analysis`)
  return response.data
}
