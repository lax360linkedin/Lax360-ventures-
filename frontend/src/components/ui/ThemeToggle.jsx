import { Moon, Sun } from 'lucide-react'
import { useTheme } from '../../hooks/useTheme.js'

/**
 * Light / dark switch. A real button with `aria-pressed` (pressed = light mode) and a name that says what it does.
 * The sun and moon cross-fade and rotate; with `showLabel` it also shows text (used in the mobile menu).
 */
export default function ThemeToggle({ showLabel = false, className = '' }) {
  const { theme, toggle } = useTheme()
  const isLight = theme === 'light'
  const label = isLight ? 'Switch to dark mode' : 'Switch to light mode'
  return (
    <button
      type="button"
      onClick={toggle}
      aria-pressed={isLight}
      aria-label={label}
      title={label}
      className={`group inline-flex min-h-11 items-center justify-center gap-3 rounded-full border border-edge-strong bg-glass text-fg transition-[background-color,border-color,transform] duration-200 hover:border-lav hover:bg-glass-strong active:scale-95 ${showLabel ? 'px-5' : 'size-11'} ${className}`}
    >
      <span className="relative block size-5" aria-hidden="true">
        <Sun className={`absolute inset-0 size-5 transition-all duration-300 ${isLight ? 'rotate-0 scale-100 opacity-100' : '-rotate-90 scale-50 opacity-0'}`} />
        <Moon className={`absolute inset-0 size-5 transition-all duration-300 ${isLight ? 'rotate-90 scale-50 opacity-0' : 'rotate-0 scale-100 opacity-100'}`} />
      </span>
      {showLabel && <span className="text-base font-semibold">{isLight ? 'Light mode' : 'Dark mode'}</span>}
    </button>
  )
}
