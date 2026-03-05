import api from './api'

export interface Citation {
  chunk_id: string
  page: number
  char_offset_start: number
  char_offset_end: number
  excerpt: string
}

export interface ChatResponse {
  answer: string
  citations: Citation[]
}

export interface ConversationTurn {
  id: string
  documentId: string
  userId: string
  turn: number
  question: string
  answer: string
  createdAt: string
}

export async function sendMessage(documentId: string, question: string, history?: Array<{ role: string; content: string }>): Promise<ChatResponse> {
  const response = await api.post<ChatResponse>('/chat', {
    documentId,
    question,
    history: history ?? [],
  })
  return response.data
}

export async function getConversation(documentId: string): Promise<ConversationTurn[]> {
  const response = await api.get<ConversationTurn[]>(`/conversations/${documentId}`)
  return response.data
}
