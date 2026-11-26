import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { api, getCsrfCookie } from '../services/api'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [sessionExpired, setSessionExpired] = useState(false)
  const userRef = useRef(null)

  useEffect(() => {
    userRef.current = user
  }, [user])

  const refreshUser = useCallback(async () => {
    try {
      const response = await api.get('/api/me')
      setUser(response.data.user)
      setSessionExpired(false)
      return response.data.user
    } catch (error) {
      const isExpired = error.response?.status === 401 || error.response?.data?.code === 'ACCOUNT_INACTIVE'
      if (isExpired) {
        if (userRef.current) setSessionExpired(true)
        setUser(null)
      }
      return null
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    const handleSessionExpired = () => {
      setUser(null)
      setSessionExpired(true)
      setLoading(false)
    }

    window.addEventListener('auth:session-expired', handleSessionExpired)
    refreshUser()

    return () => window.removeEventListener('auth:session-expired', handleSessionExpired)
  }, [refreshUser])

  // Periksa sesi berkala agar kedaluwarsa tetap terdeteksi walau pengguna sedang diam di halaman.
  useEffect(() => {
    if (!user) return undefined
    const intervalId = window.setInterval(() => refreshUser(), 60_000)
    return () => window.clearInterval(intervalId)
  }, [user, refreshUser])

  const login = useCallback(async (credentials) => {
    await getCsrfCookie()
    const response = await api.post('/api/login', credentials)
    setUser(response.data.user)
    setSessionExpired(false)
    return response.data
  }, [])

  const logout = useCallback(async () => {
    try {
      await api.post('/api/logout')
    } finally {
      setUser(null)
      setSessionExpired(false)
    }
  }, [])

  const changePassword = useCallback(async (payload) => {
    const response = await api.put('/api/password', payload)
    setUser(response.data.user)
    return response.data
  }, [])

  const value = useMemo(() => ({
    user,
    loading,
    sessionExpired,
    login,
    logout,
    changePassword,
    refreshUser,
  }), [user, loading, sessionExpired, login, logout, changePassword, refreshUser])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth harus digunakan di dalam AuthProvider.')
  }
  return context
}

export function getDashboardPath(role) {
  if (role === 'admin') return '/admin'
  if (role === 'guru_bk') return '/guru'
  if (role === 'siswa') return '/siswa'
  return '/'
}
