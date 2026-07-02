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

export interface ResolveChatDocumentResponse {
  documentId: string
}

export interface ConversationTurn {
  id: string
  documentId: string
  userId: string
  turn: number
  question: string
  answer: string
  citations: Citation[]
  createdAt: string
}

export type ChatQuestionDisplay = {
  readonly question: string
  readonly selectedText: string | null
}

const selectedTextPromptPattern = /^user selected text: "([\s\S]*)"\nuser's questions: "([\s\S]*)"$/

function normalizeSelectedText(text: string) {
  return text.replace(/\s+/g, ' ').trim()
}

export function formatChatQuestion(question: string, selectedText?: string | null) {
  const trimmedQuestion = question.trim()
  const normalizedSelectedText = selectedText ? normalizeSelectedText(selectedText) : ''

  if (!normalizedSelectedText) return trimmedQuestion

  return `user selected text: "${normalizedSelectedText}"\nuser's questions: "${trimmedQuestion}"`
}

export function parseChatQuestion(question: string): ChatQuestionDisplay {
  const match = question.match(selectedTextPromptPattern)
  if (!match) return { question, selectedText: null }

  const selectedText = match[1]?.trim() ?? ''
  const parsedQuestion = match[2]?.trim() ?? ''
  if (!selectedText || !parsedQuestion) return { question, selectedText: null }

  return { question: parsedQuestion, selectedText }
}

export async function sendMessage(documentId: string, question: string, selectedText?: string | null): Promise<ChatResponse> {
  const response = await api.post<ChatResponse>('/chat', {
    documentId,
    question: formatChatQuestion(question, selectedText),
  })
  return response.data
}

export async function resolveChatDocument(question: string): Promise<ResolveChatDocumentResponse> {
  const response = await api.post<ResolveChatDocumentResponse>('/chat/resolve-document', { question })
  return response.data
}

export async function getConversation(documentId: string): Promise<ConversationTurn[]> {
  const response = await api.get<ConversationTurn[]>(`/conversations/${documentId}`)
  return response.data
}

export async function clearConversation(documentId: string): Promise<void> {
  await api.delete(`/conversations/${documentId}`)
}
