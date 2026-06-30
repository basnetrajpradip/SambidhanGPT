export interface SuggestionChipsProps {
  suggestions: string[]
  onSelect: (question: string) => void
}

export function SuggestionChips({ suggestions, onSelect }: SuggestionChipsProps) {
  if (suggestions.length === 0) return null
  return (
    <div className="flex flex-wrap gap-2 px-3 pb-2">
      {suggestions.map((s) => (
        <button
          key={s}
          onClick={() => onSelect(s)}
          className="rounded-full border border-primary/15 bg-background/80 px-3 py-1.5 text-left text-xs leading-snug text-foreground shadow-sm transition hover:-translate-y-0.5 hover:border-primary/30 hover:bg-primary/5"
        >
          {s}
        </button>
      ))}
    </div>
  )
}
