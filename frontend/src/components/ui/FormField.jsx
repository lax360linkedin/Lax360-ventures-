import { AlertCircle } from 'lucide-react'

const fieldBase =
  'w-full rounded-xl border bg-glass px-4 text-fg placeholder:text-soft/70 focus:outline-none focus-visible:outline-none focus:border-2 focus:border-lav focus:px-[15px]'

/**
 * Labelled input / textarea / select with an accessible error message.
 * The label is always visible (no placeholder-only labels).
 */
export default function FormField({ id, label, error, hint, as = 'input', required, tone = 'light', adornment, children, className = '', ...rest }) {
  const describedBy = [error && `${id}-error`, hint && `${id}-hint`].filter(Boolean).join(' ') || undefined
  const Tag = as
  const border = error ? 'border-2 border-error px-[15px]' : 'border-edge'
  const sizing = as === 'textarea' ? 'min-h-32 py-3' : 'h-12'
  // Room for a trailing control (e.g. the password visibility button); `pr-[46px]` mirrors the 2px-border focus/error padding.
  const room = adornment ? ' pr-12 focus:pr-[46px]' + (error ? ' pr-[46px]' : '') : ''
  return (
    <div className={className}>
      <label htmlFor={id} className={`mb-1.5 block text-sm font-bold ${tone === 'dark' ? 'text-fg' : 'text-fg'}`}>
        {label}
        {required ? <span aria-hidden="true" className={tone === 'dark' ? 'text-soft' : 'text-accent'}> *</span> : <span className="font-normal text-soft"> (optional)</span>}
      </label>
      <div className={adornment ? 'relative' : undefined}>
        <Tag
          id={id}
          name={id}
          required={required}
          aria-required={required || undefined}
          aria-invalid={error ? 'true' : undefined}
          aria-describedby={describedBy}
          className={`${fieldBase} ${sizing} ${border}${room}`}
          {...rest}
        >
          {children}
        </Tag>
        {adornment && <div className="absolute right-1 top-1/2 -translate-y-1/2">{adornment}</div>}
      </div>
      {hint && !error && <p id={`${id}-hint`} className={`mt-1.5 text-sm ${tone === 'dark' ? 'text-soft' : 'text-soft'}`}>{hint}</p>}
      {error && (
        <p id={`${id}-error`} className="mt-1.5 flex items-start gap-1.5 rounded bg-glass px-2 py-1 text-sm font-medium text-error">
          <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          <span>{error}</span>
        </p>
      )}
    </div>
  )
}
