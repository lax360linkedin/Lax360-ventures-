import { Link } from 'react-router-dom'
import { ArrowRight, Loader2 } from 'lucide-react'

// All variants use theme tokens (graphite + sky blue in dark mode, violet in light). `onDark*` names are kept as aliases so existing calls still work.
const variants = {
  primary: 'bg-primary text-white border border-white/10 shadow-[0_8px_24px_-10px_rgb(var(--glow)/0.9)] hover:-translate-y-0.5 hover:bg-[var(--btn-hover)] hover:shadow-[0_14px_34px_-10px_rgb(var(--glow2)/0.9)] active:translate-y-0',
  secondary: 'border border-edge-strong bg-glass text-fg hover:-translate-y-0.5 hover:border-lav hover:bg-glass-strong',
  violet: 'bg-gradient-to-r from-primary to-accent text-white border border-white/10 shadow-[0_8px_24px_-10px_rgb(var(--glow2)/0.9)] hover:-translate-y-0.5 hover:shadow-[0_14px_34px_-10px_rgb(var(--glow2)/1)]',
}
variants.onDark = variants.primary
variants.onDarkOutline = variants.secondary

const base =
  'group inline-flex min-h-12 items-center justify-center gap-2 rounded-full px-6 py-3 text-base font-semibold leading-tight transition-[transform,background-color,border-color,box-shadow] duration-200 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:translate-y-0'

/** One button for routes (`to`), external links (`href`) and actions (`onClick`). */
export default function Button({ variant = 'primary', to, href, arrow = false, loading = false, className = '', children, ...rest }) {
  const classes = `${base} ${variants[variant]} ${className}`
  const content = (
    <>
      {loading && <Loader2 className="size-5 animate-spin" aria-hidden="true" />}
      <span className="inline-flex items-center justify-center gap-2">{children}</span>
      {arrow && !loading && (
        <ArrowRight className="size-5 transition-transform duration-200 group-hover:translate-x-1" aria-hidden="true" />
      )}
    </>
  )
  if (to) return <Link to={to} className={classes} {...rest}>{content}</Link>
  if (href) {
    const external = /^https?:/.test(href)
    return (
      <a href={href} className={classes} {...(external ? { target: '_blank', rel: 'noopener noreferrer' } : {})} {...rest}>
        {content}
      </a>
    )
  }
  return <button type="button" className={classes} disabled={loading || rest.disabled} {...rest}>{content}</button>
}
