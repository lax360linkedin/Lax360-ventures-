/** Chip buttons. `items` is [{ id, label }]; selecting one sends it as a message. */
export default function SuggestedQuestions({ items, onSelect, disabled, label = 'Suggested questions' }) {
  return (
    <ul className="flex flex-wrap gap-2 pl-9" aria-label={label}>
      {items.map((q) => (
        <li key={q.id}>
          <button
            type="button"
            disabled={disabled}
            onClick={() => onSelect(q)}
            className="min-h-11 rounded-full border border-edge bg-glass px-4 text-left text-sm font-semibold hover:border-violet hover:text-violet disabled:cursor-not-allowed disabled:opacity-50"
          >
            {q.label}
          </button>
        </li>
      ))}
    </ul>
  )
}
