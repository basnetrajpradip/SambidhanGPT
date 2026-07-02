import { useCallback, useEffect, useRef, useState } from 'react'
import type { KeyboardEvent } from 'react'
import { ChevronDown, PanelRightClose, Quote, Send, Trash2, X } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from '@/components/ui/collapsible'
import { SuggestionChips } from '@/components/SuggestionChips'
import { clearConversation, getConversation, parseChatQuestion, sendMessage, type Citation } from '@/services/chat-service'

interface UserMessage {
  role: 'user'
  content: string
  selectedText?: string
}

interface AssistantMessage {
  role: 'assistant'
  content: string
  citations: Citation[]
}

type Message = UserMessage | AssistantMessage

export interface ChatInterfaceProps {
  documentId: string
  suggestions: string[]
  initialQuestion?: string | null
  initialQuestionId?: string | null
  onCitationClick?: (citation: Citation) => void
  selectedText?: string | null
  onClearSelectedText?: () => void
  onCollapse?: () => void
}

const SELECTED_TEXT_PREVIEW_LIMIT = 100
const INITIAL_QUESTION_SESSION_PREFIX = 'sambidhan_initial_question'

function getInitialQuestionSessionKey(id: string) {
  return `${INITIAL_QUESTION_SESSION_PREFIX}:${id}`
}

function hasSubmittedInitialQuestion(id: string) {
  try {
    return window.sessionStorage.getItem(getInitialQuestionSessionKey(id)) === 'submitted'
  } catch {
    return false
  }
}

function markInitialQuestionSubmitted(id: string) {
  try {
    window.sessionStorage.setItem(getInitialQuestionSessionKey(id), 'submitted')
  } catch {
    return
  }
}

function TypingIndicator() {
  return (
    <div className="flex items-center gap-2 self-start rounded-full bg-muted/80 px-3 py-2">
      <span className="text-xs font-medium text-muted-foreground">Thinking...</span>
      {[0, 150, 300].map((delay) => (
        <span key={delay} className="block h-2 w-2 rounded-full bg-muted-foreground animate-bounce" style={{ animationDelay: `${delay}ms` }} />
      ))}
    </div>
  )
}

function getSelectedTextPreview(text: string, expanded: boolean) {
  if (expanded || text.length <= SELECTED_TEXT_PREVIEW_LIMIT) return text
  return `${text.slice(0, SELECTED_TEXT_PREVIEW_LIMIT)}...`
}

function SelectedTextPreview({
  selectedText,
  expanded,
  onToggle,
  onClear,
}: {
  selectedText: string
  expanded: boolean
  onToggle: () => void
  onClear?: () => void
}) {
  const canExpand = selectedText.length > SELECTED_TEXT_PREVIEW_LIMIT

  return (
    <div className="w-full rounded-2xl border border-primary/15 bg-primary/5 px-3 py-2 text-left shadow-sm">
      <div className="flex items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-1.5 text-xs font-semibold text-primary">
          <Quote className="h-3.5 w-3.5 shrink-0" />
          <span>Ask questions -&gt;</span>
        </div>
        {onClear && (
          <Button variant="ghost" size="icon" onClick={onClear} aria-label="Clear selected text" className="h-6 w-6 shrink-0 rounded-full text-muted-foreground hover:text-foreground">
            <X className="h-3.5 w-3.5" />
          </Button>
        )}
      </div>
      <button
        type="button"
        disabled={!canExpand}
        onClick={onToggle}
        aria-expanded={canExpand ? expanded : undefined}
        className="mt-1 w-full whitespace-pre-wrap break-words text-left text-xs leading-5 text-muted-foreground disabled:cursor-default"
      >
        {getSelectedTextPreview(selectedText, expanded)}
      </button>
    </div>
  )
}

function UserBubble({ msg }: { msg: UserMessage }) {
  const [expanded, setExpanded] = useState(false)

  return (
    <div className="flex justify-end">
      <div className="flex max-w-[85%] flex-col items-end gap-1.5">
        {msg.selectedText && <SelectedTextPreview selectedText={msg.selectedText} expanded={expanded} onToggle={() => setExpanded((value) => !value)} />}
        <div className="max-w-full break-words rounded-2xl rounded-tr-md bg-primary px-3.5 py-2.5 text-sm leading-relaxed text-primary-foreground shadow-lg shadow-primary/20 whitespace-pre-wrap">
          {msg.content}
        </div>
      </div>
    </div>
  )
}

// ── AssistantBubble ───────────────────────────────────────────────────

function AssistantBubble({ msg, onCitationClick }: { msg: AssistantMessage; onCitationClick?: (c: Citation) => void }) {
  const [open, setOpen] = useState(false)

  return (
    <div className="flex max-w-[88%] flex-col gap-1 self-start">
      <div className="break-words rounded-2xl rounded-tl-md border border-border/70 bg-background/85 px-3.5 py-2.5 text-sm leading-relaxed text-foreground shadow-sm whitespace-pre-wrap">
        {msg.content}
      </div>

      {msg.citations.length > 0 && (
        <Collapsible open={open} onOpenChange={setOpen}>
          <CollapsibleTrigger className="flex items-center gap-1 self-start text-xs text-muted-foreground hover:text-foreground transition-colors ml-0.5">
            <ChevronDown className={`h-3 w-3 transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
            {open ? 'Hide sources' : `${msg.citations.length} source${msg.citations.length > 1 ? 's' : ''}`}
          </CollapsibleTrigger>
          <CollapsibleContent className="mt-1 flex flex-col gap-1">
            {msg.citations.map((c, i) => (
              <button
                key={c.chunk_id + i}
                onClick={() => onCitationClick?.(c)}
                className="break-words rounded-xl border border-border/80 bg-card/90 px-3 py-2 text-left text-xs leading-5 text-muted-foreground shadow-sm transition-colors hover:border-primary/25 hover:bg-primary/5 hover:text-foreground"
              >
                <span className="font-medium text-primary mr-1">p.{c.page}</span>
                {c.excerpt}
              </button>
            ))}
          </CollapsibleContent>
        </Collapsible>
      )}
    </div>
  )
}

// ── ChatInterface ────────────────────────────────────────────────────────

export function ChatInterface({ documentId, suggestions, initialQuestion, initialQuestionId, onCitationClick, selectedText, onClearSelectedText, onCollapse }: ChatInterfaceProps) {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isRestoring, setIsRestoring] = useState(true)
  const [isClearing, setIsClearing] = useState(false)
  const [selectedTextExpanded, setSelectedTextExpanded] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const activeSelectedText = selectedText?.trim() ? selectedText.trim() : null
  const isChatBusy = isLoading || isRestoring || isClearing
  const canClearMessages = messages.length > 0 && !isChatBusy

  useEffect(() => {
    setIsRestoring(true)
    getConversation(documentId)
      .then((turns) => {
        const restored = turns.flatMap<Message>((turn) => {
          const parsedQuestion = parseChatQuestion(turn.question)
          const userMessage: UserMessage = parsedQuestion.selectedText
            ? { role: 'user', content: parsedQuestion.question, selectedText: parsedQuestion.selectedText }
            : { role: 'user', content: parsedQuestion.question }

          return [userMessage, { role: 'assistant', content: turn.answer, citations: turn.citations ?? [] }]
        })
        setMessages(restored)
      })
      .catch((err) => {
        console.error('[ChatInterface] restore conversation failed:', err)
      })
      .finally(() => setIsRestoring(false))
  }, [documentId])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isLoading])

  useEffect(() => {
    setSelectedTextExpanded(false)
  }, [activeSelectedText])

  const submit = useCallback(async (question: string) => {
    const trimmed = question.trim()
    if (!trimmed || isChatBusy) return

    const userMsg: UserMessage = activeSelectedText ? { role: 'user', content: trimmed, selectedText: activeSelectedText } : { role: 'user', content: trimmed }
    setMessages((prev) => [...prev, userMsg])
    setInput('')
    onClearSelectedText?.()
    setIsLoading(true)

    try {
      const res = await sendMessage(documentId, trimmed, activeSelectedText)
      const assistantMsg: AssistantMessage = {
        role: 'assistant',
        content: res.answer,
        citations: res.citations,
      }
      setMessages((prev) => [...prev, assistantMsg])
    } catch (err) {
      const errMsg: AssistantMessage = {
        role: 'assistant',
        content: 'Something went wrong. Please try again.',
        citations: [],
      }
      console.error('[ChatInterface] sendMessage failed:', err)
      setMessages((prev) => [...prev, errMsg])
    } finally {
      setIsLoading(false)
    }
  }, [activeSelectedText, documentId, isChatBusy, onClearSelectedText])

  useEffect(() => {
    const trimmedQuestion = initialQuestion?.trim() ?? ''
    const trimmedQuestionId = initialQuestionId?.trim() ?? ''
    if (!trimmedQuestion || !trimmedQuestionId || isRestoring || isLoading || isClearing) return
    if (hasSubmittedInitialQuestion(trimmedQuestionId)) return

    markInitialQuestionSubmitted(trimmedQuestionId)
    void submit(trimmedQuestion)
  }, [initialQuestion, initialQuestionId, isClearing, isLoading, isRestoring, submit])

  const clearChat = async () => {
    if (!canClearMessages) return

    const confirmed = window.confirm('Clear this chat history? This will remove saved messages for this document.')
    if (!confirmed) return

    setIsClearing(true)
    try {
      await clearConversation(documentId)
      setMessages([])
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to clear chat history.'
      console.error('[ChatInterface] clearConversation failed:', err)
      window.alert(message)
    } finally {
      setIsClearing(false)
    }
  }

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      submit(input)
    }
  }

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <div className="flex items-start justify-between gap-2 border-b border-border/70 bg-card/60 px-4 py-3 shrink-0 backdrop-blur">
        <div className="min-w-0">
          <p className="text-sm font-semibold tracking-tight">Ask a question</p>
          <p className="text-xs text-muted-foreground">Your conversation is saved to this document.</p>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            onClick={clearChat}
            disabled={!canClearMessages}
            aria-label="Clear chat"
            title="Clear chat"
            className="h-8 w-8 rounded-xl text-muted-foreground hover:text-destructive"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
          {onCollapse && (
            <Button variant="ghost" size="icon" onClick={onCollapse} aria-label="Collapse chat" className="hidden h-8 w-8 shrink-0 rounded-xl text-muted-foreground hover:text-foreground xl:inline-flex">
              <PanelRightClose className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>

      <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto px-3 py-4">
        {isRestoring && <p className="text-xs text-muted-foreground text-center mt-6">Restoring conversation...</p>}

        {messages.length === 0 && !isLoading && !isRestoring && (
          <>
            <p className="text-xs text-muted-foreground text-center mt-6 px-4">Ask any question about the uploaded document.</p>
            {suggestions.length > 0 && (
              <div className="mt-2">
                <p className="text-xs text-muted-foreground font-medium px-1 mb-2">Suggested questions</p>
                <SuggestionChips suggestions={suggestions} onSelect={(q) => submit(q)} />
              </div>
            )}
          </>
        )}

        {messages.length > 0 && suggestions.length > 0 && (
          <div className="rounded-2xl border border-primary/10 bg-primary/5 py-2 shadow-sm">
            <p className="px-3 pb-2 text-xs font-medium text-muted-foreground">Suggested follow-ups</p>
            <SuggestionChips suggestions={suggestions.slice(0, 4)} onSelect={(q) => submit(q)} />
          </div>
        )}

        {messages.map((msg, i) =>
          msg.role === 'user' ? (
            <UserBubble key={i} msg={msg} />
          ) : (
            <AssistantBubble key={i} msg={msg as AssistantMessage} onCitationClick={onCitationClick} />
          ),
        )}

        {isLoading && <TypingIndicator />}

        <div ref={bottomRef} />
      </div>

      <div className="flex shrink-0 flex-col gap-2 border-t border-border/70 bg-card/80 pb-3 pt-2 backdrop-blur">
        {activeSelectedText && (
          <div className="px-3">
            <SelectedTextPreview
              selectedText={activeSelectedText}
              expanded={selectedTextExpanded}
              onToggle={() => setSelectedTextExpanded((value) => !value)}
              onClear={onClearSelectedText}
            />
          </div>
        )}
        <div className="flex items-end gap-2 px-3">
          <Textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask about this document…"
            rows={2}
            disabled={isChatBusy}
            className="max-h-36 flex-1 rounded-2xl border-border/80 bg-background/90 shadow-sm focus:ring-4 focus:ring-primary/10"
          />
          <Button size="icon" onClick={() => submit(input)} disabled={!input.trim() || isChatBusy} aria-label="Send message" className="h-11 w-11 rounded-2xl shadow-lg shadow-primary/20">
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  )
}
