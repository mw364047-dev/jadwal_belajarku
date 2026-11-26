import { useState } from 'react'
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'

const roleLabels = {
  admin: 'Administrator',
  guru_bk: 'Guru Bimbingan dan Konseling',
  siswa: 'Siswa kelas VIII',
}

const menus = {
  admin: [
    { label: 'Ringkasan', path: '/admin', icon: 'grid' },
    { label: 'Data guru BK', path: '/admin/guru', icon: 'users' },
    { label: 'Data siswa', path: '/admin/siswa', icon: 'user' },
    { label: 'Data kelas', path: '/admin/kelas', icon: 'school' },
    { label: 'Penugasan guru-siswa', path: '/admin/penugasan', icon: 'users' },
    { label: 'Monitoring guru', path: '/admin/monitoring-guru', icon: 'chart' },
    { label: 'Rekap layanan BK', path: '/admin/rekap-layanan', icon: 'clipboard' },
    { label: 'Materi', path: '/materi', icon: 'book' },
    { label: 'Log aktivitas', path: '/admin/log', icon: 'history' },
  ],
  guru_bk: [
    { label: 'Ringkasan', path: '/guru', icon: 'grid' },
    { label: 'Siswa binaan', path: '/guru/siswa', icon: 'users' },
    { label: 'Catatan layanan', path: '/guru/layanan', icon: 'clipboard' },
    { label: 'Rekap layanan', path: '/guru/rekap-layanan', icon: 'chart' },
    { label: 'Materi', path: '/materi', icon: 'book' },
  ],
  siswa: [
    { label: 'Ringkasan', path: '/siswa', icon: 'grid' },
    { label: 'Materi belajar', path: '/materi', icon: 'book' },
    { label: 'Daftar tugas', path: '/siswa/tugas', icon: 'check' },
    { label: 'Jadwal mingguan', path: '/siswa/jadwal', icon: 'calendar' },
    { label: 'Refleksi', path: '/siswa/refleksi', icon: 'edit' },
    { label: 'Ringkasan layanan BK', path: '/siswa/layanan', icon: 'clipboard' },
  ],
}

const commonMenu = [
  { label: 'Bantuan BK', path: '/bantuan-bk', icon: 'help' },
  { label: 'Kebijakan Data', path: '/kebijakan-data', icon: 'shield' },
  { label: 'Batas Produk', path: '/batasan-produk', icon: 'info' },
]

function AppIcon({ name, className = 'h-5 w-5' }) {
  const paths = {
    grid: <><rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/></>,
    users: <><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/></>,
    user: <><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></>,
    school: <><path d="m3 9 9-6 9 6-9 6-9-6Z"/><path d="M7 12v5c3 3 7 3 10 0v-5M21 9v7"/></>,
    chart: <><path d="M3 3v18h18"/><path d="m7 14 4-4 4 3 6-7"/></>,
    clipboard: <><rect x="5" y="4" width="14" height="17" rx="2"/><path d="M9 4V3h6v1M9 10h6M9 14h6M9 18h3"/></>,
    book: <><path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v17H6.5A2.5 2.5 0 0 0 4 22V5.5Z"/><path d="M4 6a2.5 2.5 0 0 1 2.5 2H20M9 12h7m-7 3h7"/></>,
    history: <><path d="M3 12a9 9 0 1 0 2.64-6.36L3 8"/><path d="M3 3v5h5M12 7v5l3 2"/></>,
    check: <><path d="m5 12 4 4L19 6"/><path d="M21 12a9 9 0 1 1-2.64-6.36"/></>,
    calendar: <><rect x="3" y="4" width="18" height="17" rx="2"/><path d="M16 2v4M8 2v4M3 10h18M8 14h.01M12 14h.01M16 14h.01M8 17h.01M12 17h.01"/></>,
    edit: <><path d="m15 5 4 4M4 20l4-.8L19 8a2.8 2.8 0 0 0-4-4L4 15l0 5Z"/></>,
    menu: <><path d="M4 6h16M4 12h16M4 18h16"/></>,
    close: <><path d="m6 6 12 12M18 6 6 18"/></>,
    logout: <><path d="M10 17l5-5-5-5M15 12H3"/><path d="M12 3h6a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-6"/></>,
    help: <><circle cx="12" cy="12" r="9"/><path d="M9.6 9a2.5 2.5 0 1 1 4.3 1.7c-1.1 1-1.9 1.3-1.9 2.8M12 17h.01"/></>,
    shield: <><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z"/><path d="m9 12 2 2 4-4"/></>,
    info: <><circle cx="12" cy="12" r="9"/><path d="M12 11v5m0-8h.01"/></>,
  }
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">{paths[name] || paths.grid}</svg>
}

function Brand() {
  return (
    <Link to="/" className="flex w-full min-w-0 flex-col items-start gap-1 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue">
      <img
        src="/images/logo-jadwal-belajarku.png"
        alt="Jadwal Belajarku — Atur Waktu, Raih Tujuan, Tumbuh Lebih Terarah"
        className="h-auto w-[176px] max-w-full object-contain object-left"
      />
      <span className="text-xs font-medium text-ink-muted">Media latihan belajar mingguan</span>
    </Link>
  )
}

export default function AppLayout({ children }) {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const role = user?.role
  const roleMenu = menus[role] || []
  const items = [...roleMenu, ...commonMenu]
  const pageTitle = location.pathname.startsWith('/guru/siswa/')
    ? 'Detail siswa binaan'
    : ([...roleMenu, ...commonMenu].find((item) => item.path === location.pathname)?.label || 'Ruang kerja')

  async function handleLogout() {
    try {
      await logout()
      navigate('/login', { replace: true })
    } catch {
      navigate('/login', { replace: true })
    }
  }


  function SidebarContent({ mobile = false }) {
    return (
      <div className="flex h-full min-h-0 flex-col">
        <div className="border-b border-ink/15 px-4 py-3">
          <Brand />
          {mobile && <button type="button" onClick={() => setMobileMenuOpen(false)} className="flex h-10 w-10 items-center justify-center rounded-xl text-slate-500 hover:bg-slate-100" aria-label="Tutup menu"><AppIcon name="close" /></button>}
        </div>
        <div className="px-4 pb-2 pt-4">
          <p className="text-sm font-semibold text-ink-muted">Menu utama</p>
        </div>
        <nav className="min-h-0 flex-1 space-y-1 overflow-y-auto px-2.5" aria-label="Menu utama">
          {items.map((item) => {
            const active = item.path === location.pathname
            const content = <><AppIcon name={item.icon} className="h-5 w-5 shrink-0"/><span className="min-w-0 flex-1 truncate text-left">{item.label}</span></>
            const classes = `flex min-h-11 w-full items-center gap-3 rounded-md px-3 py-2.5 text-[15px] font-semibold transition-colors ${active ? 'border-l-[3px] border-mark bg-white text-ink' : 'text-ink-muted hover:bg-white hover:text-ink'}`
            return (
              <NavLink key={item.label} to={item.path} onClick={() => setMobileMenuOpen(false)} className={classes} aria-current={active ? 'page' : undefined}>{content}</NavLink>
            )
          })}
        </nav>
        <div className="border-t border-ink/15 p-3">
          {user ? (
            <div className="flex items-center gap-3 border-l-2 border-ink/20 bg-white p-2.5">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-ink/30 bg-paper text-sm font-bold text-ink">{(user.nama || 'P').slice(0, 1).toUpperCase()}</span>
              <span className="min-w-0"><span className="block truncate text-sm font-bold text-slate-900">{user.nama}</span><span className="block truncate text-xs text-slate-500">{roleLabels[role] || 'Pengguna'}</span></span>
            </div>
          ) : (
            <Link to="/login" onClick={() => setMobileMenuOpen(false)} className="flex min-h-11 items-center justify-center rounded-xl bg-belajar-600 px-4 text-base font-semibold text-white hover:bg-belajar-700">Masuk akun</Link>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-paper text-ink md:flex">
      <aside className="sticky top-0 hidden h-screen w-[232px] shrink-0 border-r border-ink/15 bg-paper md:block">
        <SidebarContent />
      </aside>

      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 flex md:hidden" role="presentation">
          <button type="button" className="absolute inset-0 bg-slate-950/40" onClick={() => setMobileMenuOpen(false)} aria-label="Tutup menu navigasi" />
          <aside className="relative z-10 h-full w-[min(232px,86vw)] bg-paper shadow-xl"><SidebarContent mobile /></aside>
        </div>
      )}

      <div className="min-w-0 flex-1">
        <header className="sticky top-0 z-30 flex min-h-[4.5rem] items-center justify-between gap-3 border-b border-slate-200 bg-white/95 px-4 backdrop-blur sm:px-6 lg:px-8">
          <div className="flex min-w-0 items-center gap-3">
            <button type="button" onClick={() => setMobileMenuOpen(true)} className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-belajar-100 md:hidden" aria-label="Buka menu navigasi"><AppIcon name="menu" /></button>
            <div className="min-w-0">
              <p className="truncate text-base font-bold text-slate-900">{pageTitle}</p>
              <p className="hidden truncate text-sm text-slate-500 sm:block">Media pendukung layanan Bimbingan dan Konseling</p>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            {user ? (
              <>
                <span className="hidden max-w-40 truncate text-sm font-semibold text-slate-600 lg:block">{user.nama}</span>
                <button type="button" onClick={handleLogout} className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-belajar-100"><AppIcon name="logout" className="h-4 w-4"/><span className="hidden sm:inline">Keluar</span></button>
              </>
            ) : <Link to="/login" className="inline-flex min-h-10 items-center rounded-xl bg-belajar-600 px-4 text-sm font-semibold text-white hover:bg-belajar-700">Masuk</Link>}
          </div>
        </header>

        <main className="mx-auto w-full max-w-[1600px] p-4 sm:p-6 lg:p-8">
          {children}
        </main>
        <footer className="px-4 pb-6 text-center text-sm text-ink-muted sm:px-6 lg:px-8">Jadwal Belajarku · Media latihan belajar, bukan pengganti layanan konseling.</footer>
      </div>
    </div>
  )
}
