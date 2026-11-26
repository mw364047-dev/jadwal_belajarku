import { Navigate, useLocation } from 'react-router-dom'
import { getDashboardPath, useAuth } from '../context/AuthContext'

function LoadingScreen() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
      <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-5 py-4 text-sm font-medium text-slate-600 shadow-soft">
        <span className="h-4 w-4 animate-spin rounded-full border-2 border-belajar-600 border-t-transparent" />
        Memeriksa sesi akun…
      </div>
    </main>
  )
}

export function ProtectedRoute({ children, roles, passwordPage = false }) {
  const { user, loading } = useAuth()
  const location = useLocation()

  if (loading) return <LoadingScreen />
  if (!user) return <Navigate to="/login" state={{ from: location.pathname }} replace />

  if (user.must_change_password && !passwordPage) {
    return <Navigate to="/ganti-password" replace />
  }

  if (passwordPage) {
    return user.must_change_password
      ? children
      : <Navigate to={getDashboardPath(user.role)} replace />
  }

  if (roles && !roles.includes(user.role)) {
    return <Navigate to={getDashboardPath(user.role)} replace />
  }

  return children
}

export function GuestRoute({ children }) {
  const { user, loading } = useAuth()

  if (loading) return <LoadingScreen />
  if (user?.must_change_password) return <Navigate to="/ganti-password" replace />
  if (user) return <Navigate to={getDashboardPath(user.role)} replace />

  return children
}
