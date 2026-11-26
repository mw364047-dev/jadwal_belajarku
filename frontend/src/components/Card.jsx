export default function Card({
  children,
  title,
  description,
  action,
  padding = 'p-5 sm:p-6',
  className = '',
  as: Component = 'section',
  ...props
}) {
  return (
    <Component className={`rounded-2xl border border-slate-200 bg-white shadow-soft ${padding} ${className}`} {...props}>
      {(title || description || action) && (
        <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
          <div>
            {title && <h2 className="text-lg font-bold tracking-tight text-slate-900">{title}</h2>}
            {description && <p className="mt-1 text-base leading-6 text-slate-600">{description}</p>}
          </div>
          {action}
        </div>
      )}
      {children}
    </Component>
  )
}
