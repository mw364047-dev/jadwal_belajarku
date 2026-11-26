import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { getDashboardPath, useAuth } from '../context/AuthContext'

export default function ChangePasswordPage() {
  const { user, changePassword, logout } = useAuth()
  const navigate = useNavigate()
  const [currentPassword, setCurrentPassword] = useState('')
  const [password, setPassword] = useState('')
  const [passwordConfirmation, setPasswordConfirmation] = useState('')
  const [errorMessage, setErrorMessage] = useState('')
  const [successMessage, setSuccessMessage] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(event) {
    event.preventDefault()
    setErrorMessage('')
    setSuccessMessage('')

    if (password !== passwordConfirmation) {
      setErrorMessage('Konfirmasi kata sandi baru belum sama.')
      return
    }

    setLoading(true)
    try {
      await changePassword({
        current_password: currentPassword,
        password,
        password_confirmation: passwordConfirmation,
      })
      setSuccessMessage('Kata sandi berhasil diperbarui. Mengarahkan ke halaman utama akun…')
      navigate(getDashboardPath(user.role), { replace: true })
    } catch (error) {
      const response = error.response
      const currentError = response?.data?.errors?.current_password?.[0]
      const passwordError = response?.data?.errors?.password?.[0]
      setErrorMessage(currentError || passwordError || response?.data?.message || 'Kata sandi belum dapat diperbarui. Coba kembali.')
    } finally {
      setLoading(false)
    }
  }

  async function handleLogout() {
    try {
      await logout()
    } catch {
      // Sesi mungkin sudah kedaluwarsa; lanjutkan ke halaman login.
    } finally {
      navigate('/login', { replace: true })
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-10 text-slate-800">
      <section className="w-full max-w-lg rounded-3xl border border-slate-200 bg-white p-6 shadow-soft sm:p-8">
        <Link to="/" className="text-sm font-bold text-belajar-700 hover:text-belajar-900">Jadwal Belajarku</Link>
        <div className="mt-6 flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-50 text-amber-600" aria-hidden="true">
          <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.8">
            <rect x="4" y="10" width="16" height="11" rx="2" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M8 10V7a4 4 0 1 1 8 0v3m-4 5v2" />
          </svg>
        </div>
        <h1 className="mt-5 text-2xl font-bold tracking-tight text-slate-900">Buat kata sandi baru</h1>
        <p className="mt-2 text-sm leading-6 text-slate-600">
          Halo, {user?.nama}. Untuk keamanan akun, ubah kata sandi awal sebelum melanjutkan menggunakan aplikasi.
        </p>

        <form className="mt-7 space-y-5" onSubmit={handleSubmit}>
          <div>
            <label htmlFor="current-password" className="mb-2 block text-sm font-semibold text-slate-700">Kata sandi saat ini</label>
            <input id="current-password" type="password" autoComplete="current-password" required value={currentPassword} onChange={(event) => setCurrentPassword(event.target.value)} className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-belajar-600 focus:ring-4 focus:ring-belajar-100" />
          </div>
          <div>
            <label htmlFor="new-password" className="mb-2 block text-sm font-semibold text-slate-700">Kata sandi baru</label>
            <input id="new-password" type="password" autoComplete="new-password" minLength={8} required value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Minimal 8 karakter" className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-belajar-600 focus:ring-4 focus:ring-belajar-100" />
          </div>
          <div>
            <label htmlFor="password-confirmation" className="mb-2 block text-sm font-semibold text-slate-700">Ulangi kata sandi baru</label>
            <input id="password-confirmation" type="password" autoComplete="new-password" minLength={8} required value={passwordConfirmation} onChange={(event) => setPasswordConfirmation(event.target.value)} className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-belajar-600 focus:ring-4 focus:ring-belajar-100" />
          </div>

          {errorMessage && <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm leading-6 text-rose-700">{errorMessage}</div>}
          {successMessage && <div role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm leading-6 text-emerald-700">{successMessage}</div>}

          <button type="submit" disabled={loading || !currentPassword || !password || !passwordConfirmation} className="w-full rounded-xl bg-belajar-600 px-4 py-3.5 text-sm font-semibold text-white transition hover:bg-belajar-700 focus:outline-none focus:ring-4 focus:ring-belajar-100 disabled:cursor-not-allowed disabled:opacity-60">
            {loading ? 'Menyimpan…' : 'Simpan kata sandi baru'}
          </button>
        </form>

        <button type="button" onClick={handleLogout} className="mt-4 w-full rounded-xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-600 transition hover:bg-slate-50">
          Keluar dari akun
        </button>
        <p className="mt-5 text-xs leading-5 text-slate-400">Gunakan kata sandi yang mudah kamu ingat dan tidak dibagikan kepada orang lain.</p>
      </section>
    </main>
  )
}
