import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../services/api.js'
import { useAuth } from '../context/AuthContext.jsx'

const DAY_NAMES = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu', 'Minggu']
const DAY_SHORT = ['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min']
const PRIORITY_ORDER = { tinggi: 0, sedang: 1, rendah: 2 }

function getIsoWeek(date) {
  const utcDate = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()))
  const day = utcDate.getUTCDay() || 7
  utcDate.setUTCDate(utcDate.getUTCDate() + 4 - day)
  const year = utcDate.getUTCFullYear()
  const yearStart = new Date(Date.UTC(year, 0, 1))
  const week = Math.ceil((((utcDate - yearStart) / 86400000) + 1) / 7)
  return { year, week, day: date.getDay() === 0 ? 7 : date.getDay() }
}

function dateOnly(date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function formatLongDate(date) {
  return new Intl.DateTimeFormat('id-ID', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  }).format(date)
}

function formatDate(value) {
  if (!value) return 'Tanpa tenggat'
  const date = new Date(`${value}T00:00:00`)
  return Number.isNaN(date.getTime())
    ? value
    : new Intl.DateTimeFormat('id-ID', { day: 'numeric', month: 'short' }).format(date)
}

function dueLabel(value, today) {
  if (!value) return 'Belum ada tanggal'
  const due = new Date(`${value}T00:00:00`)
  const base = new Date(`${dateOnly(today)}T00:00:00`)
  const days = Math.round((due - base) / 86400000)
  if (days < 0) return `Terlambat ${Math.abs(days)} hari`
  if (days === 0) return 'Hari ini'
  if (days === 1) return 'Besok'
  return `${days} hari lagi`
}

function kindLabel(value) {
  return ({ belajar: 'Belajar', istirahat: 'Istirahat', ibadah: 'Ibadah', ujian_libur: 'Ujian / libur', lain: 'Kegiatan lain', kegiatan_lain: 'Kegiatan lain' })[value] || 'Kegiatan'
}

function friendlyError(error, label) {
  if (error?.response?.status === 401) return 'Sesi akunmu berakhir. Masuk kembali untuk memuat data.'
  if (error?.response?.status === 403) return `Akunmu belum memiliki akses untuk memuat ${label}.`
  return error?.response?.data?.message || `${label} belum dapat dimuat. Periksa koneksi lalu coba lagi.`
}

function SectionTitle({ children, note, action }) {
  return (
    <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
      <div>
        <h2 className="font-display text-xl font-bold text-ink">{children}</h2>
        {note && <p className="mt-1 text-sm text-ink-muted">{note}</p>}
      </div>
      {action}
    </div>
  )
}

export default function DashboardPage() {
  const { user } = useAuth()
  const [today] = useState(() => new Date())
  const period = useMemo(() => getIsoWeek(today), [today])
  const [tasks, setTasks] = useState([])
  const [schedule, setSchedule] = useState([])
  const [reflection, setReflection] = useState(null)
  const [reflectionLoaded, setReflectionLoaded] = useState(false)
  const [services, setServices] = useState([])
  const [completedBlocks, setCompletedBlocks] = useState(() => new Set())
  const [loading, setLoading] = useState(true)
  const [errors, setErrors] = useState([])

  const loadDashboard = useCallback(async () => {
    setLoading(true)
    setErrors([])
    const requests = await Promise.allSettled([
      api.get('/api/siswa/tugas'),
      api.get('/api/siswa/jadwal', { params: { tahun: period.year, minggu_ke: period.week } }),
      api.get('/api/siswa/refleksi', { params: { tahun: period.year, minggu_ke: period.week } }),
      api.get('/api/siswa/layanan'),
    ])

    const nextErrors = []
    const [taskResult, scheduleResult, reflectionResult, serviceResult] = requests

    if (taskResult.status === 'fulfilled') {
      setTasks(Array.isArray(taskResult.value.data?.data) ? taskResult.value.data.data : [])
    } else {
      setTasks([])
      nextErrors.push(friendlyError(taskResult.reason, 'daftar tugas'))
    }

    if (scheduleResult.status === 'fulfilled') {
      setSchedule(Array.isArray(scheduleResult.value.data?.data) ? scheduleResult.value.data.data : [])
    } else {
      setSchedule([])
      nextErrors.push(friendlyError(scheduleResult.reason, 'jadwal minggu ini'))
    }

    if (reflectionResult.status === 'fulfilled') {
      // Dashboard hanya membutuhkan ada/tidaknya refleksi. Isi refleksi tidak ditampilkan di sini.
      setReflection(reflectionResult.value.data?.data || null)
      setReflectionLoaded(true)
    } else {
      setReflection(null)
      setReflectionLoaded(false)
      nextErrors.push(friendlyError(reflectionResult.reason, 'status refleksi'))
    }

    if (serviceResult.status === 'fulfilled') {
      setServices(Array.isArray(serviceResult.value.data?.data) ? serviceResult.value.data.data : [])
    } else {
      setServices([])
      nextErrors.push(friendlyError(serviceResult.reason, 'ringkasan layanan BK'))
    }

    setErrors(nextErrors)
    setLoading(false)
  }, [period.year, period.week])

  useEffect(() => { loadDashboard() }, [loadDashboard])

  const todaySchedule = useMemo(() => schedule
    .filter((item) => Number(item.hari) === period.day)
    .sort((a, b) => String(a.jam_mulai).localeCompare(String(b.jam_mulai))), [schedule, period.day])

  const weekDensity = useMemo(() => DAY_NAMES.map((name, index) => ({
    name,
    short: DAY_SHORT[index],
    count: schedule.filter((item) => Number(item.hari) === index + 1).length,
  })), [schedule])

  const upcomingTasks = useMemo(() => tasks
    .filter((task) => task.status !== 'selesai' && task.tenggat)
    .sort((a, b) => {
      const dateCompare = String(a.tenggat).localeCompare(String(b.tenggat))
      return dateCompare || (PRIORITY_ORDER[a.prioritas] ?? 3) - (PRIORITY_ORDER[b.prioritas] ?? 3)
    })
    .slice(0, 5), [tasks])

  const nextService = useMemo(() => services
    .filter((item) => item.tanggal && item.tanggal >= dateOnly(today))
    .sort((a, b) => String(a.tanggal).localeCompare(String(b.tanggal)))[0] || null, [services, today])

  const storageKey = `jb-dashboard-checks-${user?.id || 'siswa'}-${dateOnly(today)}`
  useEffect(() => {
    try {
      const stored = JSON.parse(sessionStorage.getItem(storageKey) || '[]')
      setCompletedBlocks(new Set(Array.isArray(stored) ? stored : []))
    } catch {
      setCompletedBlocks(new Set())
    }
  }, [storageKey])

  function toggleBlock(id) {
    setCompletedBlocks((current) => {
      const next = new Set(current)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      try { sessionStorage.setItem(storageKey, JSON.stringify([...next])) } catch { /* penyimpanan sesi bersifat opsional */ }
      return next
    })
  }

  const dateTitle = formatLongDate(today)

  return (
    <div className="planner-grid min-h-full space-y-8 rounded-sm px-1 py-2 sm:px-2">
      <section className="planner-panel rounded-panel-note bg-paper p-4 sm:p-6" aria-labelledby="today-title">
        <div className="flex flex-wrap items-start justify-between gap-3 border-b border-ink/20 pb-4">
          <div>
            <p className="text-sm font-bold text-ink-muted">Hari ini</p>
            <h1 id="today-title" className="mt-1 font-display text-2xl font-bold text-ink sm:text-3xl">{dateTitle}</h1>
            <p className="mt-2 max-w-[60ch] text-sm leading-6 text-ink-muted">Halo, {user?.nama || 'kamu'}. Ini urutan kegiatan yang sudah kamu susun.</p>
          </div>
          <Link to="/siswa/jadwal" className="inline-flex min-h-11 items-center rounded-md border border-ink/35 px-4 text-sm font-bold text-ink transition-colors hover:bg-mark/35 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue focus-visible:ring-offset-2">Buka jadwal</Link>
        </div>

        {loading ? (
          <p className="py-8 text-sm text-ink-muted" role="status">Memuat jadwal hari ini…</p>
        ) : todaySchedule.length ? (
          <ol className="mt-4 divide-y divide-ink/10">
            {todaySchedule.map((item) => {
              const id = String(item.id)
              const done = completedBlocks.has(id)
              return (
                <li key={item.id} className={`grid grid-cols-[72px_22px_minmax(0,1fr)] items-start gap-3 py-3 sm:grid-cols-[88px_22px_minmax(0,1fr)] ${done ? 'text-ink-muted' : 'text-ink'}`}>
                  <span className="pt-0.5 font-mono text-sm tabular-nums text-ink-muted">{item.jam_mulai}–{item.jam_selesai}</span>
                  <input id={`today-block-${id}`} type="checkbox" checked={done} onChange={() => toggleBlock(id)} aria-label={`Tandai ${item.kegiatan} ${done ? 'belum selesai' : 'selesai'}`} className="mt-1 h-5 w-5 cursor-pointer accent-teal focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue focus-visible:ring-offset-2" />
                  <label htmlFor={`today-block-${id}`} className="min-w-0 cursor-pointer">
                    <span className={`block font-semibold ${done ? 'line-through decoration-teal decoration-2' : ''}`}>{item.kegiatan}</span>
                    <span className="mt-1 block text-xs text-ink-muted">{kindLabel(item.jenis_blok)}{item.tugas?.mata_pelajaran ? ` · ${item.tugas.mata_pelajaran}` : ''}</span>
                  </label>
                </li>
              )
            })}
          </ol>
        ) : (
          <div className="py-7">
            <p className="font-semibold text-ink">Belum ada kegiatan untuk hari ini.</p>
            <p className="mt-1 max-w-[55ch] text-sm leading-6 text-ink-muted">Kamu bisa mulai dengan satu kegiatan belajar, lalu sisipkan waktu istirahat.</p>
            <Link to="/siswa/jadwal" className="mt-4 inline-flex min-h-11 items-center border-b-2 border-mark px-1 font-bold text-blue hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue">Susun jadwal hari ini</Link>
          </div>
        )}
      </section>

      {errors.length > 0 && (
        <div role="alert" className="border-l-4 border-mark bg-white px-4 py-3 text-sm leading-6 text-ink">
          <p className="font-bold">Beberapa informasi belum berhasil dimuat.</p>
          <ul className="mt-1 list-disc pl-5">{errors.map((message, index) => <li key={`${index}-${message}`}>{message}</li>)}</ul>
          <button type="button" onClick={loadDashboard} className="mt-2 min-h-10 font-bold text-blue underline underline-offset-4">Coba muat lagi</button>
        </div>
      )}

      <section aria-labelledby="due-title">
        <SectionTitle note="Tugas yang belum selesai, diurutkan dari tenggat terdekat." action={<Link to="/siswa/tugas" className="min-h-11 inline-flex items-center font-bold text-blue underline underline-offset-4">Semua tugas</Link>}>Tenggat terdekat</SectionTitle>
        {loading ? <p className="py-4 text-sm text-ink-muted">Memuat tugas…</p> : upcomingTasks.length ? (
          <ul className="divide-y divide-ink/15 border-y border-ink/20">
            {upcomingTasks.map((task) => {
              const priority = task.prioritas || 'rendah'
              const marker = 'bg-mark'
              return (
                <li key={task.id} className="grid grid-cols-[5px_minmax(0,1fr)_auto] items-center gap-3 py-3">
                  <span aria-hidden="true" className={`h-12 w-[5px] ${marker}`} />
                  <div className="min-w-0">
                    <p className="truncate font-bold text-ink">{task.judul}</p>
                    <p className="mt-1 text-sm text-ink-muted">{task.mata_pelajaran} · {formatDate(task.tenggat)} · Prioritas {priority}</p>
                  </div>
                  <span className={`whitespace-nowrap text-right text-xs font-bold tabular-nums ${task.tenggat < dateOnly(today) ? 'text-ink' : 'text-ink-muted'}`}>{dueLabel(task.tenggat, today)}</span>
                </li>
              )
            })}
          </ul>
        ) : (
          <p className="border-y border-ink/20 py-5 text-sm text-ink-muted">Tidak ada tugas bertenggat yang belum selesai. Kamu bisa menambahkan tugas baru kapan saja.</p>
        )}
      </section>

      <section aria-labelledby="week-title">
        <SectionTitle note={`Kepadatan kegiatan · Minggu ${period.week}, ${period.year}`}>Minggu ini</SectionTitle>
        <div className="grid grid-cols-7 gap-1.5 sm:gap-3" aria-label="Jumlah kegiatan setiap hari minggu ini">
          {weekDensity.map((day, index) => {
            const height = day.count ? Math.min(44, 9 + day.count * 9) : 4
            return (
              <div key={day.name} className={`min-w-0 border-b-2 px-1 pb-2 pt-3 text-center ${period.day === index + 1 ? 'border-mark bg-white' : 'border-ink/15'}`}>
                <p className="text-[11px] font-bold text-ink-muted sm:text-xs">{day.short}</p>
                <p className="mt-2 font-display text-xl font-bold tabular-nums text-ink">{day.count}</p>
                <div className="mx-auto mt-2 flex h-11 items-end justify-center">
                  <span className={`block w-3 rounded-t-sm ${day.count ? 'bg-blue' : 'bg-ink/10'}`} style={{ height: `${height}px` }} />
                </div>
                <p className="mt-1 text-[10px] text-ink-muted sm:text-xs">kegiatan</p>
              </div>
            )
          })}
        </div>
      </section>

      {reflectionLoaded && !reflection && (
        <section className="flex flex-col gap-3 border-y border-ink/25 py-4 sm:flex-row sm:items-center sm:justify-between" aria-label="Refleksi minggu ini belum diisi">
          <div>
            <p className="font-bold text-ink">Minggu ini belum ada refleksi.</p>
            <p className="mt-1 text-sm text-ink-muted">Luangkan beberapa menit untuk melihat kembali kegiatan belajarmu.</p>
          </div>
          <Link to="/siswa/refleksi" className="inline-flex min-h-11 shrink-0 items-center justify-center rounded-md bg-blue px-4 font-bold text-white transition-colors hover:bg-blue/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue focus-visible:ring-offset-2">Isi refleksi</Link>
        </section>
      )}

      {nextService && (
        <section className="border-b border-ink/20 pb-5" aria-labelledby="service-title">
          <SectionTitle note="Catatan layanan yang memiliki tanggal mendatang.">Layanan BK berikutnya</SectionTitle>
          <div className="flex flex-wrap items-baseline justify-between gap-3 border-l-4 border-teal pl-4">
            <div>
              <h3 id="service-title" className="font-bold text-ink">{kindLabel(nextService.jenis_layanan)}</h3>
              <p className="mt-1 text-sm text-ink-muted">Tanggal {formatDate(nextService.tanggal)}</p>
            </div>
            <Link to="/siswa/layanan" className="min-h-11 inline-flex items-center font-bold text-blue underline underline-offset-4">Lihat ringkasan layanan</Link>
          </div>
        </section>
      )}
    </div>
  )
}
