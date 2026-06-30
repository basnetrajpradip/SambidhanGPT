import { AlertTriangle, CheckCircle2, ClipboardList, Sparkles } from 'lucide-react'
import type { DocumentAnalysis, RiskFlag, ObligationItem } from '@/services/document-service'

interface AnalysisPanelProps {
  analysis: DocumentAnalysis | null
  loading?: boolean
}

const severityStyles: Record<RiskFlag['severity'], string> = {
  low: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  medium: 'bg-amber-50 text-amber-800 border-amber-200',
  high: 'bg-rose-50 text-rose-700 border-rose-200',
}

function SectionHeader({ icon: Icon, title }: { icon: typeof Sparkles; title: string }) {
  return (
    <div className="flex items-center gap-2">
      <div className="rounded-xl bg-primary/10 p-2 text-primary">
        <Icon className="h-4 w-4" />
      </div>
      <h3 className="text-sm font-semibold">{title}</h3>
    </div>
  )
}

function RiskCard({ risk }: { risk: RiskFlag }) {
  return (
    <div className="rounded-2xl border bg-background/75 p-3 shadow-sm">
      <div className="flex items-start justify-between gap-2">
        <p className="break-words text-sm font-semibold leading-5">{risk.title}</p>
        <span className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase ${severityStyles[risk.severity]}`}>{risk.severity}</span>
      </div>
      <p className="mt-1 break-words text-xs leading-5 text-muted-foreground">{risk.explanation}</p>
      {risk.excerpt && <p className="mt-2 break-words rounded-xl bg-muted/50 p-2 text-xs leading-5 text-muted-foreground">{risk.excerpt}</p>}
      {risk.page && <p className="mt-2 text-[11px] font-medium text-primary">Page {risk.page}</p>}
    </div>
  )
}

function ObligationCard({ item }: { item: ObligationItem }) {
  return (
    <div className="rounded-2xl border bg-background/75 p-3 shadow-sm">
      <p className="break-words text-xs font-semibold uppercase tracking-wide text-primary">{item.actor}</p>
      <p className="mt-1 break-words text-sm leading-6">{item.obligation}</p>
      {item.deadline && <p className="mt-2 text-xs text-muted-foreground">Deadline: {item.deadline}</p>}
      {item.page && <p className="mt-2 text-[11px] font-medium text-primary">Page {item.page}</p>}
    </div>
  )
}

export function AnalysisPanel({ analysis, loading }: AnalysisPanelProps) {
  if (loading) {
    return <div className="p-4 text-sm text-muted-foreground">Generating document analysis...</div>
  }

  if (!analysis) {
    return <div className="p-4 text-sm text-muted-foreground">No analysis is available yet.</div>
  }

  return (
    <div className="space-y-5 p-4">
      <section className="rounded-3xl border border-primary/10 bg-primary/5 p-4 shadow-sm">
        <SectionHeader icon={Sparkles} title="Document Summary" />
        <p className="mt-3 break-words text-sm leading-6 text-foreground">{analysis.summary}</p>
      </section>

      {analysis.keyPoints.length > 0 && (
        <section className="space-y-3">
          <SectionHeader icon={CheckCircle2} title="Key Points" />
          <ul className="space-y-2">
            {analysis.keyPoints.map((point) => (
              <li key={point} className="break-words rounded-2xl border bg-background/75 p-3 text-sm leading-6 shadow-sm">
                {point}
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="space-y-3">
        <SectionHeader icon={AlertTriangle} title="Risk Flags" />
        {analysis.risks.length > 0 ? (
          <div className="space-y-2">{analysis.risks.map((risk) => <RiskCard key={`${risk.title}-${risk.page ?? ''}`} risk={risk} />)}</div>
        ) : (
          <p className="rounded-2xl border bg-background/75 p-3 text-sm text-muted-foreground">No obvious risk flags were extracted.</p>
        )}
      </section>

      <section className="space-y-3">
        <SectionHeader icon={ClipboardList} title="Obligations" />
        {analysis.obligations.length > 0 ? (
          <div className="space-y-2">{analysis.obligations.map((item, index) => <ObligationCard key={`${item.actor}-${index}`} item={item} />)}</div>
        ) : (
          <p className="rounded-2xl border bg-background/75 p-3 text-sm text-muted-foreground">No clear obligations were extracted.</p>
        )}
      </section>
    </div>
  )
}
