import { useMemo, useState } from 'react'
import { FileSearch } from 'lucide-react'
import { AccordionRoot, AccordionItem, AccordionTrigger, AccordionContent } from '@/components/ui/accordion'
import { Badge, type BadgeProps } from '@/components/ui/badge'
import type { Clause } from '@/services/document-service'

export interface ClauseSidebarProps {
  clauses: Clause[]
  onClauseClick?: (clause: Clause) => void
}

const CLAUSE_TYPES: Record<string, { label: string; variant: BadgeProps['variant'] }> = {
  indemnity: { label: 'Indemnity', variant: 'indemnity' },
  termination: { label: 'Termination', variant: 'termination' },
  liability: { label: 'Liability', variant: 'liability' },
  payment_terms: { label: 'Payment Terms', variant: 'payment_terms' },
  jurisdiction: { label: 'Jurisdiction', variant: 'jurisdiction' },
  amendment: { label: 'Amendment', variant: 'amendment' },
  definitions: { label: 'Definitions', variant: 'definitions' },
  penalties: { label: 'Penalties', variant: 'penalties' },
}

function typeInfo(type: string) {
  return CLAUSE_TYPES[type] ?? { label: capitalise(type), variant: 'secondary' as BadgeProps['variant'] }
}

function capitalise(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1).replace(/_/g, ' ')
}

export function ClauseSidebar({ clauses, onClauseClick }: ClauseSidebarProps) {
  const [query, setQuery] = useState('')
  const filteredClauses = useMemo(() => {
    const needle = query.trim().toLowerCase()
    if (!needle) return clauses
    return clauses.filter((clause) => `${clause.type} ${clause.title} ${clause.excerpt}`.toLowerCase().includes(needle))
  }, [clauses, query])

  const groups = filteredClauses.reduce<Record<string, Clause[]>>((acc, clause) => {
    ;(acc[clause.type] ??= []).push(clause)
    return acc
  }, {})

  const groupEntries = Object.entries(groups)

  if (clauses.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 px-5 py-14 text-center text-muted-foreground">
        <div className="rounded-2xl bg-muted p-3">
          <FileSearch className="h-7 w-7 opacity-60" />
        </div>
        <p className="text-sm">No clauses were extracted from this document.</p>
      </div>
    )
  }

  return (
    <div className="space-y-3 px-3 pb-4 pt-3">
      <input
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder="Search clauses..."
        className="h-10 w-full rounded-xl border border-border/80 bg-background/80 px-3 text-xs shadow-sm outline-none transition focus:border-primary/40 focus:ring-4 focus:ring-primary/10"
      />
      {groupEntries.length === 0 ? (
        <p className="px-2 py-6 text-center text-sm text-muted-foreground">No clauses match your search.</p>
      ) : (
        <AccordionRoot type="multiple" className="w-full">
          {groupEntries.map(([type, items]) => {
            const { label, variant } = typeInfo(type)
            return (
              <AccordionItem key={type} value={type}>
                <AccordionTrigger className="rounded-xl px-2 hover:bg-muted/60 hover:no-underline">
                  <div className="flex items-center gap-2">
                    <Badge variant={variant}>{label}</Badge>
                    <span className="text-xs text-muted-foreground">{items.length}</span>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="px-1">
                  <ul className="flex flex-col gap-1">
                    {items.map((clause) => (
                      <li key={clause.id}>
                        <button
                          onClick={() => onClauseClick?.(clause)}
                          className="group w-full rounded-xl border border-transparent px-3 py-2.5 text-left text-xs transition-colors hover:border-primary/15 hover:bg-primary/5"
                        >
                          <p className="break-words font-medium leading-5 text-foreground group-hover:text-primary">{clause.title}</p>
                          <p className="mt-1 break-words text-muted-foreground leading-5">{clause.excerpt}</p>
                          <span className="mt-1 block text-[10px] text-muted-foreground/60">Page {clause.pageNumber}</span>
                        </button>
                      </li>
                    ))}
                  </ul>
                </AccordionContent>
              </AccordionItem>
            )
          })}
        </AccordionRoot>
      )}
    </div>
  )
}
