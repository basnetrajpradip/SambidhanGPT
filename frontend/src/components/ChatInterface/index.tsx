import { useEffect, useRef, useState } from 'react'
import { Send } from 'lucide-react'
import { ChevronDown } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from '@/components/ui/collapsible'
import { SuggestionChips } from '@/components/SuggestionChips'
import { sendMessage, type Citation } from '@/services/chat-service'

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
    <div className="flex items-end gap-1 self-start px-1">
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
    <div className="flex flex-col gap-1 self-start max-w-[85%]">
      <div className="rounded-2xl rounded-tl-sm bg-muted px-3.5 py-2.5 text-sm text-foreground whitespace-pre-wrap">{msg.content}</div>

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
                className="overflow-hidden rounded-lg border border-border bg-background px-3 py-1 text-left text-xs text-muted-foreground hover:bg-muted hover:text-foreground transition-colors line-clamp-3"
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
  const bottomRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isLoading])

  const buildHistory = (msgs: Message[]) =>
    msgs.map((m) => ({
      role: m.role,
      content: m.role === 'user' ? m.content : (m as AssistantMessage).content,
    }))

  const submit = async (question: string) => {
    const trimmed = question.trim()
    if (!trimmed || isLoading) return

    const userMsg: UserMessage = { role: 'user', content: trimmed }
    setMessages((prev) => [...prev, userMsg])
    setInput('')
    setIsLoading(true)

    try {
      const history = buildHistory(messages)
      const res = await sendMessage(documentId, trimmed, history)
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

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      submit(input)
    }
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="px-4 py-3 border-b shrink-0">
        <p className="text-sm font-semibold tracking-tight">Ask a question</p>
      </div>

      <div className="flex-1 overflow-y-auto px-3 py-3 flex flex-col gap-3">
        {messages.length === 0 && !isLoading && (
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

        {messages.map((msg, i) =>
          msg.role === 'user' ? (
            <div key={i} className="flex justify-end">
              <div className="rounded-2xl rounded-tr-sm bg-primary px-3.5 py-2.5 text-sm text-primary-foreground max-w-[85%] whitespace-pre-wrap">
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

      <div className="shrink-0 border-t pt-2 pb-3 flex flex-col gap-2">
        <div className="flex items-end gap-2 px-3">
          <Textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask about this document…"
            rows={2}
            disabled={isLoading}
            className="flex-1 max-h-36"
          />
          <Button size="icon" onClick={() => submit(input)} disabled={!input.trim() || isLoading} aria-label="Send message">
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  )
}
