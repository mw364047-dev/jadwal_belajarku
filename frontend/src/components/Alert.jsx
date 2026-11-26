const styles = {
  info: 'border-belajar-200 bg-belajar-50 text-belajar-900',
  success: 'border-emerald-200 bg-emerald-50 text-emerald-900',
  warning: 'border-amber-200 bg-amber-50 text-amber-900',
  danger: 'border-rose-200 bg-rose-50 text-rose-900',
}

export default function Alert({ title, children, variant = 'info', onClose, className = '', role }) {
  return (
    <div className={`rounded-xl border px-4 py-3 ${styles[variant] || styles.info} ${className}`} role={role || (variant === 'danger' ? 'alert' : 'status')}>
      <div className="flex items-start justify-between gap-3">
        <div>
          {title && <p className="font-bold">{title}</p>}
          {children && <div className={`${title ? 'mt-1' : ''} text-base leading-6`}>{children}</div>}
        </div>
        {onClose && <button type="button" onClick={onClose} className="rounded-lg p-1 text-current/80 hover:bg-black/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-current" aria-label="Tutup pemberitahuan">×</button>}
      </div>
    </div>
  )
}
