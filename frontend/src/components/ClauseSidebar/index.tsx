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
  const groups = clauses.reduce<Record<string, Clause[]>>((acc, clause) => {
    ;(acc[clause.type] ??= []).push(clause)
    return acc
  }, {})

  const groupEntries = Object.entries(groups)

  if (groupEntries.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 px-4 py-12 text-center text-muted-foreground">
        <FileSearch className="h-8 w-8 opacity-40" />
        <p className="text-sm">No clauses were extracted from this document.</p>
      </div>
    )
  }

  return (
    <AccordionRoot type="multiple" className="w-full px-2 pb-4">
      {groupEntries.map(([type, items]) => {
        const { label, variant } = typeInfo(type)
        return (
          <AccordionItem key={type} value={type}>
            <AccordionTrigger className="px-2 hover:no-underline">
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
                      className="w-full rounded-md px-2 py-2 text-left text-xs hover:bg-muted transition-colors group"
                    >
                      <p className="font-medium text-foreground truncate group-hover:text-primary">{clause.title}</p>
                      <p className="mt-0.5 text-muted-foreground overflow-hidden line-clamp-2">{clause.excerpt}</p>
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
  )
}
