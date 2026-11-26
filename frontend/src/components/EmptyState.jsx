import Button from './Button.jsx'

export default function EmptyState({
  title = 'Belum ada data',
  description = 'Data yang kamu cari belum tersedia.',
  actionLabel,
  onAction,
  icon,
  className = '',
}) {
  return (
    <div className={`flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-5 py-10 text-center ${className}`}>
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white text-2xl text-belajar-700 shadow-sm" aria-hidden="true">{icon || '☰'}</div>
      <h3 className="mt-4 text-lg font-bold text-slate-900">{title}</h3>
      <p className="mt-2 max-w-md text-base leading-6 text-slate-600">{description}</p>
      {actionLabel && onAction && <Button className="mt-5" onClick={onAction}>{actionLabel}</Button>}
    </div>
  )
}
