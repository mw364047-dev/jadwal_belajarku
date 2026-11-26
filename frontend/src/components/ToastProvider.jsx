import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react'
import { Toast } from './Toast.jsx'

const ToastContext = createContext(null)

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])
  const timers = useRef(new Map())

  const dismissToast = useCallback((id) => {
    const timer = timers.current.get(id)
    if (timer) window.clearTimeout(timer)
    timers.current.delete(id)
    setToasts((current) => current.filter((toast) => toast.id !== id))
  }, [])

  const showToast = useCallback((message, options = {}) => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2)}`
    const toast = {
      id,
      message,
      title: options.title || '',
      variant: options.variant || 'success',
    }
    setToasts((current) => [...current, toast].slice(-4))
    const duration = options.duration ?? 4000
    if (duration > 0) {
      const timer = window.setTimeout(() => dismissToast(id), duration)
      timers.current.set(id, timer)
    }
    return id
  }, [dismissToast])

  useEffect(() => () => {
    timers.current.forEach((timer) => window.clearTimeout(timer))
    timers.current.clear()
  }, [])

  return (
    <ToastContext.Provider value={{ showToast, dismissToast }}>
      {children}
      <div className="pointer-events-none fixed inset-x-3 top-3 z-[90] flex flex-col gap-3 sm:left-auto sm:right-5 sm:w-[min(24rem,calc(100vw-2.5rem))]" aria-label="Notifikasi aplikasi">
        {toasts.map((toast) => (
          <div key={toast.id} className="pointer-events-auto">
            <Toast toast={toast} onClose={() => dismissToast(toast.id)} />
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast() {
  const context = useContext(ToastContext)
  if (!context) throw new Error('useToast harus digunakan di dalam ToastProvider.')
  return context
}
