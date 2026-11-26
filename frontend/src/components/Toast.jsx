const variants = {
  success: 'border-emerald-200 bg-white text-emerald-900',
  info: 'border-belajar-200 bg-white text-belajar-900',
  warning: 'border-amber-200 bg-white text-amber-900',
  danger: 'border-rose-200 bg-white text-rose-900',
}

export function Toast({ toast, onClose }) {
  return (
    <div className={`flex w-full items-start gap-3 rounded-2xl border p-4 shadow-lg ${variants[toast.variant] || variants.info}`} role={toast.variant === 'danger' ? 'alert' : 'status'}>
      <span className="mt-0.5 h-2.5 w-2.5 shrink-0 rounded-full bg-current" aria-hidden="true" />
      <div className="min-w-0 flex-1">
        {toast.title && <p className="font-bold">{toast.title}</p>}
        <p className="text-base leading-6">{toast.message}</p>
      </div>
      <button type="button" onClick={onClose} className="rounded-lg px-2 text-xl leading-6 opacity-70 hover:bg-slate-100 hover:opacity-100" aria-label="Tutup notifikasi">×</button>
    </div>
  )
}
