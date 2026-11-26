import Button from './Button.jsx'

export default function Pagination({ page = 1, totalPages = 1, onPageChange, className = '' }) {
  const current = Math.min(Math.max(1, page), Math.max(1, totalPages))
  const safeTotal = Math.max(1, totalPages)

  return (
    <nav aria-label="Navigasi halaman" className={`flex flex-wrap items-center justify-between gap-3 ${className}`}>
      <p className="text-base text-slate-600">Halaman <span className="font-bold text-slate-900">{current}</span> dari {safeTotal}</p>
      <div className="flex items-center gap-2">
        <Button size="sm" variant="outline" onClick={() => onPageChange?.(current - 1)} disabled={current <= 1}>Sebelumnya</Button>
        <Button size="sm" variant="outline" onClick={() => onPageChange?.(current + 1)} disabled={current >= safeTotal}>Berikutnya</Button>
      </div>
    </nav>
  )
}
