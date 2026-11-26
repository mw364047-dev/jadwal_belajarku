const sizes = { sm: 'h-4 w-4 border-2', md: 'h-6 w-6 border-[3px]', lg: 'h-9 w-9 border-4' }

export default function LoadingSpinner({ size = 'md', label = 'Memuat', className = '' }) {
  return (
    <span className={`inline-flex items-center gap-3 text-base text-slate-600 ${className}`} role="status" aria-live="polite">
      <span className={`animate-spin rounded-full border-belajar-600 border-r-transparent ${sizes[size] || sizes.md}`} aria-hidden="true" />
      <span>{label}</span>
    </span>
  )
}
