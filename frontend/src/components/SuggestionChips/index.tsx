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
          className="rounded-full border border-border bg-muted/60 px-3 py-1 text-xs text-foreground hover:bg-muted transition-colors text-left leading-snug"
        >
          {s}
        </button>
      ))}
    </div>
  )
}
