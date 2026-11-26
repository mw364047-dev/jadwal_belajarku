import { useId } from 'react'

export default function Select({
  label,
  id,
  options = [],
  placeholder = 'Pilih salah satu',
  helperText,
  error,
  required = false,
  wrapperClassName = '',
  children,
  className = '',
  ...props
}) {
  const generatedId = useId()
  const selectId = id || generatedId
  const helperId = `${selectId}-helper`
  const errorId = `${selectId}-error`

  return (
    <div className={wrapperClassName}>
      {label && <label htmlFor={selectId} className="mb-2 block text-base font-semibold text-slate-800">{label}{required && <span className="ml-1 text-rose-600" aria-hidden="true">*</span>}</label>}
      <select
        id={selectId}
        required={required}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? errorId : helperText ? helperId : undefined}
        className={`min-h-12 w-full rounded-xl border bg-white px-4 py-3 text-base text-slate-900 outline-none transition focus:border-belajar-600 focus:ring-4 focus:ring-belajar-100 disabled:cursor-not-allowed disabled:bg-slate-100 ${error ? 'border-rose-400' : 'border-slate-300'} ${className}`}
        {...props}
      >
        {placeholder && <option value="">{placeholder}</option>}
        {children || options.map((option) => {
          const item = typeof option === 'string' ? { value: option, label: option } : option
          return <option key={item.value} value={item.value} disabled={item.disabled}>{item.label}</option>
        })}
      </select>
      {error && <p id={errorId} className="mt-2 text-sm font-medium text-rose-700" role="alert">{error}</p>}
      {!error && helperText && <p id={helperId} className="mt-2 text-sm leading-5 text-slate-600">{helperText}</p>}
    </div>
  )
}
