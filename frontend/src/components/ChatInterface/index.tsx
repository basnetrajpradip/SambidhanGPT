import { useEffect, useRef, useState } from 'react'
import type { KeyboardEvent } from 'react'
import { Send } from 'lucide-react'
import { ChevronDown } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from '@/components/ui/collapsible'
import { SuggestionChips } from '@/components/SuggestionChips'
import { getConversation, sendMessage, type Citation } from '@/services/chat-service'

interface UserMessage {
  role: 'user'
  content: string
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
  onCitationClick?: (citation: Citation) => void
}

function TypingIndicator() {
  return (
    <div className="flex items-end gap-1 self-start rounded-full bg-muted/80 px-3 py-2">
      {[0, 150, 300].map((delay) => (
        <span key={delay} className="block h-2 w-2 rounded-full bg-muted-foreground animate-bounce" style={{ animationDelay: `${delay}ms` }} />
      ))}
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

export function ChatInterface({ documentId, suggestions, onCitationClick }: ChatInterfaceProps) {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isRestoring, setIsRestoring] = useState(true)
  const bottomRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    setIsRestoring(true)
    getConversation(documentId)
      .then((turns) => {
        const restored = turns.flatMap<Message>((turn) => [
          { role: 'user', content: turn.question },
          { role: 'assistant', content: turn.answer, citations: turn.citations ?? [] },
        ])
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

  const submit = async (question: string) => {
    const trimmed = question.trim()
    if (!trimmed || isLoading || isRestoring) return

    const userMsg: UserMessage = { role: 'user', content: trimmed }
    setMessages((prev) => [...prev, userMsg])
    setInput('')
    setIsLoading(true)

    try {
      const res = await sendMessage(documentId, trimmed)
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
  }

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      submit(input)
    }
  }

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <div className="border-b border-border/70 bg-card/60 px-4 py-3 shrink-0 backdrop-blur">
        <p className="text-sm font-semibold tracking-tight">Ask a question</p>
        <p className="text-xs text-muted-foreground">Your conversation is saved to this document.</p>
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
            <div key={i} className="flex justify-end">
              <div className="max-w-[85%] break-words rounded-2xl rounded-tr-md bg-primary px-3.5 py-2.5 text-sm leading-relaxed text-primary-foreground shadow-lg shadow-primary/20 whitespace-pre-wrap">
                {msg.content}
              </div>
            </div>
          ) : (
            <AssistantBubble key={i} msg={msg as AssistantMessage} onCitationClick={onCitationClick} />
          ),
        )}

        {isLoading && <TypingIndicator />}

        <div ref={bottomRef} />
      </div>

      <div className="flex shrink-0 flex-col gap-2 border-t border-border/70 bg-card/80 pb-3 pt-2 backdrop-blur">
        <div className="flex items-end gap-2 px-3">
          <Textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask about this document…"
            rows={2}
            disabled={isLoading || isRestoring}
            className="max-h-36 flex-1 rounded-2xl border-border/80 bg-background/90 shadow-sm focus:ring-4 focus:ring-primary/10"
          />
          <Button size="icon" onClick={() => submit(input)} disabled={!input.trim() || isLoading || isRestoring} aria-label="Send message" className="h-11 w-11 rounded-2xl shadow-lg shadow-primary/20">
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  )
}
