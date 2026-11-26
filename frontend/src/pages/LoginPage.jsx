import { useRef, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { getDashboardPath, useAuth } from '../context/AuthContext'
import '../components/landing/LoginPage.css'

function EyeIcon({ visible }) {
  return visible ? (
    <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 3l18 18M10.6 10.6a2 2 0 0 0 2.8 2.8"/><path d="M9.9 5.2A10.8 10.8 0 0 1 12 5c5.2 0 8.7 4.6 9.5 6-.3.6-1.2 1.8-2.7 2.9M6.2 6.2C3.9 7.7 2.8 9.5 2.5 11c.8 1.5 4.3 6 9.5 6 1 0 2-.2 2.8-.5"/></svg>
  ) : (
    <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M2.5 12s3.4-6 9.5-6 9.5 6 9.5 6-3.4 6-9.5 6-9.5-6-9.5-6Z"/><circle cx="12" cy="12" r="2.6"/></svg>
  )
}

function getLoginError(error) {
  const response = error?.response
  if (!response) return 'Server belum dapat dijangkau. Periksa koneksi dan pastikan Laravel berjalan.'
  if (response.status === 423 && response.data?.code === 'ACCOUNT_LOCKED') return response.data.message || 'Akun terkunci sementara. Coba kembali setelah 10 menit.'
  if (response.status === 403 && response.data?.code === 'ACCOUNT_INACTIVE') return response.data.message || 'Akun sedang dinonaktifkan. Hubungi administrator sekolah.'
  if (response.status === 401) return response.data?.message || 'Username atau kata sandi belum sesuai. Periksa kembali lalu coba lagi.'
  if (response.status === 422) return response.data?.message || 'Lengkapi username dan kata sandi dengan benar.'
  if (response.status === 419 || response.status === 400) return response.data?.message || 'Sesi keamanan belum siap. Muat ulang halaman, kemudian coba masuk lagi.'
  if (response.status >= 500) return 'Server mengalami kendala saat memproses login. Periksa log Laravel atau hubungi pengelola.'
  return response.data?.message || `Login belum dapat diproses (HTTP ${response.status}). Periksa data akun dan coba lagi.`
}

export default function LoginPage() {
  const { login, sessionExpired } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [loading, setLoading] = useState(false)
  const passwordRef = useRef(null)

  async function handleSubmit(event) {
    event.preventDefault()
    if (loading) return
    setErrorMessage('')
    setLoading(true)
    try {
      const result = await login({ username: username.trim(), password })
      const destination = result.user.must_change_password
        ? '/ganti-password'
        : (location.state?.from || getDashboardPath(result.user.role))
      navigate(destination, { replace: true })
    } catch (error) {
      setErrorMessage(getLoginError(error))
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="jb-login">
      <a className="jb-login-skip" href="#form-masuk">Lewati ke formulir masuk</a>
      <div className="jb-login-shell">
        <aside className="jb-login-brand">
          <Link to="/" aria-label="Kembali ke beranda Jadwal Belajarku">
            <img src="/images/logo-jadwal-belajarku.png" alt="Jadwal Belajarku" />
          </Link>
          <p>Ruang sederhana untuk menyusun rencana belajar dan meninjau kembali kegiatanmu.</p>
        </aside>

        <section className="jb-login-main" id="form-masuk">
          <div className="jb-login-form-wrap">
            <Link className="jb-login-back" to="/">Kembali ke beranda</Link>
            <div className="jb-login-paper">
              <div className="jb-login-title">
                <span className="jb-login-kicker">Ruang belajarmu</span>
                <h1>Masuk</h1>
                <p>Gunakan akun yang diberikan oleh sekolah.</p>
              </div>

              {sessionExpired && <div role="status" className="jb-login-notice">Sesi akun telah berakhir. Masuk kembali untuk melanjutkan.</div>}
              {errorMessage && <div role="alert" className="jb-login-error">{errorMessage}</div>}

              <form onSubmit={handleSubmit} className="jb-login-form">
                <div className="jb-field">
                  <label htmlFor="username">Username atau email</label>
                  <input
                    autoFocus
                    id="username"
                    name="username"
                    type="text"
                    autoComplete="username"
                    autoCapitalize="none"
                    spellCheck="false"
                    required
                    value={username}
                    onChange={(event) => setUsername(event.target.value)}
                    placeholder="Masukkan username atau email"
                    disabled={loading}
                  />
                </div>
                <div className="jb-field">
                  <label htmlFor="password">Kata sandi</label>
                  <div className="jb-password-wrap">
                    <input
                      ref={passwordRef}
                      id="password"
                      name="password"
                      type={showPassword ? 'text' : 'password'}
                      autoComplete="current-password"
                      required
                      value={password}
                      onChange={(event) => setPassword(event.target.value)}
                      placeholder="Masukkan kata sandi"
                      disabled={loading}
                    />
                    <button type="button" className="jb-password-toggle" aria-label={showPassword ? 'Sembunyikan kata sandi' : 'Tampilkan kata sandi'} aria-pressed={showPassword} onClick={() => { setShowPassword((value) => !value); passwordRef.current?.focus() }}>
                      <EyeIcon visible={showPassword}/>
                    </button>
                  </div>
                </div>
                <button type="submit" className="jb-login-submit" disabled={loading || !username.trim() || !password}>
                  {loading ? <><span className="jb-spinner" aria-hidden="true"/> Memeriksa akun…</> : 'Masuk'}
                </button>
              </form>
              <p className="jb-login-footnote">Belum memiliki akun? Hubungi pihak sekolah sesuai mekanisme yang berlaku.</p>
            </div>
            <p className="jb-login-legal">Jadwal Belajarku · Media pendukung latihan belajar dan layanan BK.</p>
          </div>
        </section>
      </div>
    </main>
  )
}
