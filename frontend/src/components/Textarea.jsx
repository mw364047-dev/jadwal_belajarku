import { useId } from 'react'

export default function Textarea({
  label,
  id,
  helperText,
  error,
  required = false,
  rows = 4,
  wrapperClassName = '',
  className = '',
  ...props
}) {
  const generatedId = useId()
  const textareaId = id || generatedId
  const helperId = `${textareaId}-helper`
  const errorId = `${textareaId}-error`

  return (
    <div className={wrapperClassName}>
      {label && <label htmlFor={textareaId} className="mb-2 block text-base font-semibold text-slate-800">{label}{required && <span className="ml-1 text-rose-600" aria-hidden="true">*</span>}</label>}
      <textarea
        id={textareaId}
        rows={rows}
        required={required}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? errorId : helperText ? helperId : undefined}
        className={`w-full rounded-xl border bg-white px-4 py-3 text-base leading-6 text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-belajar-600 focus:ring-4 focus:ring-belajar-100 disabled:cursor-not-allowed disabled:bg-slate-100 ${error ? 'border-rose-400' : 'border-slate-300'} ${className}`}
        {...props}
      />
      {error && <p id={errorId} className="mt-2 text-sm font-medium text-rose-700" role="alert">{error}</p>}
      {!error && helperText && <p id={helperId} className="mt-2 text-sm leading-5 text-slate-600">{helperText}</p>}
    </div>
  )
}
