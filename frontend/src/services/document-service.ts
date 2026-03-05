import api from './api'

export interface UploadDocumentResponse {
  document_id: string
  chunk_count: number
  status: 'complete' | 'failed'
  error?: string
}

export interface Clause {
  id: string
  documentId: string
  type: string
  title: string
  excerpt: string
  pageNumber: number
}

export async function uploadDocument(file: File, onUploadProgress?: (percent: number) => void): Promise<UploadDocumentResponse> {
  const formData = new FormData()
  formData.append('pdf', file)

  const response = await api.post<UploadDocumentResponse>('/upload', formData, {
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
