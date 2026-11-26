const styles = {
  default: 'bg-slate-100 text-slate-700 ring-slate-200',
  blue: 'bg-slate-100 text-ink ring-slate-200',
  green: 'bg-teal/10 text-teal ring-teal/25',
  yellow: 'bg-mark/50 text-ink ring-mark',
  red: 'bg-mark/50 text-ink ring-mark',
}

export default function Badge({ children, variant = 'default', className = '', dot = false }) {
  return (
    <span className={`inline-flex min-h-7 items-center gap-2 rounded-full px-3 py-1 text-base font-semibold ring-1 ring-inset ${styles[variant] || styles.default} ${className}`}>
      {dot && <span className="h-2 w-2 rounded-full bg-current" aria-hidden="true" />}
      {children}
    </span>
  )
}
