import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../../services/api.js'

const SERVICE_LABELS = {
  klasikal: 'Klasikal',
  kelompok: 'Kelompok',
  individual: 'Individual',
  informasi: 'Informasi',
  tindak_lanjut: 'Tindak lanjut',
}

function formatDate(value) {
  if (!value) return 'Tanggal belum tersedia'
  const date = new Date(`${value}T00:00:00`)
  return Number.isNaN(date.getTime()) ? value : new Intl.DateTimeFormat('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }).format(date)
}

function requestError(error, label) {
  if (error?.response?.status === 401) return 'Sesi akun berakhir. Masuk kembali untuk melanjutkan.'
  if (error?.response?.status === 403) return `Akunmu tidak memiliki akses untuk memuat ${label}.`
  return error?.response?.data?.message || `${label} belum dapat dimuat. Coba periksa koneksi.`
}

export default function GuruDashboardPage() {
  const [students, setStudents] = useState([])
  const [meta, setMeta] = useState(null)
  const [recentServices, setRecentServices] = useState([])
  const [search, setSearch] = useState('')
  const [selectedClass, setSelectedClass] = useState('')
  const [loading, setLoading] = useState(true)
  const [errors, setErrors] = useState([])

  const load = useCallback(async () => {
    setLoading(true)
    setErrors([])
    const [studentsResult, servicesResult] = await Promise.allSettled([
      api.get('/api/guru/siswa'),
      api.get('/api/guru/layanan', { params: { per_page: 3, page: 1 } }),
    ])

    const nextErrors = []
    if (studentsResult.status === 'fulfilled') {
      setStudents(Array.isArray(studentsResult.value.data?.data) ? studentsResult.value.data.data : [])
      setMeta(studentsResult.value.data?.meta || null)
    } else {
      setStudents([])
      setMeta(null)
      nextErrors.push(requestError(studentsResult.reason, 'daftar siswa binaan'))
    }

    if (servicesResult.status === 'fulfilled') {
      const responseData = servicesResult.value.data?.data
      setRecentServices(Array.isArray(responseData) ? responseData.slice(0, 3) : [])
    } else {
      setRecentServices([])
      nextErrors.push(requestError(servicesResult.reason, 'catatan layanan terbaru'))
    }

    setErrors(nextErrors)
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  const classes = useMemo(() => [...new Set(students.map((student) => student.kelas).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'id')), [students])

  const visibleStudents = useMemo(() => students
    .filter((student) => {
      const query = search.trim().toLocaleLowerCase('id')
      const matchesSearch = !query || [student.nama, student.nis, student.kelas].some((value) => String(value || '').toLocaleLowerCase('id').includes(query))
      const matchesClass = !selectedClass || student.kelas === selectedClass
      return matchesSearch && matchesClass
    })
    .sort((a, b) => {
      const aPending = a.status_pengisian === 'terisi' ? 1 : 0
      const bPending = b.status_pengisian === 'terisi' ? 1 : 0
      return aPending - bPending || String(a.nama || '').localeCompare(String(b.nama || ''), 'id')
    }), [students, search, selectedClass])

  const total = Number(meta?.total_siswa ?? students.length)
  const filled = Number(meta?.sudah_mengisi ?? students.filter((student) => student.status_pengisian === 'terisi').length)
  const pending = Number(meta?.belum_mengisi ?? Math.max(total - filled, 0))
  const progress = total > 0 ? Math.round((filled / total) * 100) : 0

  return (
    <div className="planner-grid min-h-full space-y-8 rounded-sm px-1 py-2 sm:px-2">
      <section className="planner-panel rounded-panel-note bg-paper p-4 sm:p-5" aria-labelledby="guru-dashboard-title">
        <h1 id="guru-dashboard-title" className="font-display text-2xl font-bold text-ink sm:text-3xl">Pantau siswa binaan</h1>
        <p className="mt-2 max-w-[68ch] text-base leading-7 text-ink-muted">
          {loading ? 'Memuat status pengisian siswa binaan…' : `Kamu mendampingi ${total} siswa. ${filled} sudah mengisi refleksi minggu ini dan ${pending} belum mengisi.`}
        </p>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <div className="h-3 min-w-[180px] flex-1 overflow-hidden rounded-sm border border-ink/25 bg-white" role="progressbar" aria-label="Persentase siswa yang sudah mengisi refleksi" aria-valuemin={0} aria-valuemax={100} aria-valuenow={progress}>
            <div className="h-full bg-teal" style={{ width: `${progress}%` }} />
          </div>
          <span className="text-sm font-bold tabular-nums text-ink">{progress}% terisi</span>
        </div>
        {meta && <p className="mt-2 text-xs text-ink-muted">Tahun ajaran {meta.tahun_ajaran} · Minggu {meta.minggu_ke}, {meta.tahun}</p>}
      </section>

      {errors.length > 0 && (
        <div role="alert" className="border-l-4 border-mark bg-white px-4 py-3 text-sm leading-6 text-ink">
          <ul className="list-disc pl-5">{errors.map((message, index) => <li key={`${index}-${message}`}>{message}</li>)}</ul>
          <button type="button" onClick={load} className="mt-2 min-h-10 font-bold text-blue underline underline-offset-4">Coba muat lagi</button>
        </div>
      )}

      <section aria-labelledby="students-title">
        <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
          <div>
            <h2 id="students-title" className="font-display text-xl font-bold text-ink">Daftar siswa binaan</h2>
            <p className="mt-1 text-sm text-ink-muted">Siswa yang belum mengisi refleksi ditampilkan lebih dahulu.</p>
          </div>
          <span className="text-sm tabular-nums text-ink-muted">{visibleStudents.length} dari {students.length} siswa</span>
        </div>

        <div className="mb-4 grid gap-3 sm:grid-cols-[minmax(0,1fr)_220px]">
          <label className="block">
            <span className="mb-1 block text-sm font-bold text-ink">Cari nama siswa</span>
            <input value={search} onChange={(event) => setSearch(event.target.value)} type="search" placeholder="Nama atau NIS" className="min-h-11 w-full rounded-md border border-ink/30 bg-white px-3 text-base text-ink placeholder:text-ink-muted/70 focus:border-blue focus:outline-none focus:ring-2 focus:ring-blue/25" />
          </label>
          <label className="block">
            <span className="mb-1 block text-sm font-bold text-ink">Kelas</span>
            <select value={selectedClass} onChange={(event) => setSelectedClass(event.target.value)} className="min-h-11 w-full rounded-md border border-ink/30 bg-white px-3 text-base text-ink focus:border-blue focus:outline-none focus:ring-2 focus:ring-blue/25">
              <option value="">Semua kelas</option>
              {classes.map((className) => <option key={className} value={className}>{className}</option>)}
            </select>
          </label>
        </div>

        {loading ? <p role="status" className="py-8 text-sm text-ink-muted">Memuat siswa binaan…</p> : visibleStudents.length ? (
          <div className="overflow-x-auto border-y border-ink/25">
            <table className="w-full min-w-[620px] border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-ink/20 text-ink-muted">
                  <th scope="col" className="px-3 py-3 font-bold">Nama siswa</th>
                  <th scope="col" className="px-3 py-3 font-bold">Kelas</th>
                  <th scope="col" className="px-3 py-3 font-bold">Refleksi minggu ini</th>
                  <th scope="col" className="px-3 py-3 text-right font-bold">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {visibleStudents.map((student) => {
                  const filledStatus = student.status_pengisian === 'terisi'
                  return (
                    <tr key={student.id} className="border-b border-ink/10 last:border-0 hover:bg-white/70">
                      <td className="px-3 py-3.5">
                        <span className="block font-bold text-ink">{student.nama}</span>
                        <span className="mt-0.5 block text-xs text-ink-muted">NIS {student.nis || '—'}</span>
                      </td>
                      <td className="px-3 py-3.5 text-ink-muted">{student.kelas || '—'}</td>
                      <td className="px-3 py-3.5">
                        {filledStatus ? (
                          <span className="inline-flex min-h-8 items-center border-l-4 border-teal bg-white px-2.5 font-semibold text-ink">Terisi</span>
                        ) : (
                          <span className="inline-flex min-h-8 items-center border-l-4 border-mark bg-[#FFF9D9] px-2.5 font-semibold text-ink">Belum mengisi</span>
                        )}
                      </td>
                      <td className="px-3 py-3.5 text-right">
                        <Link to={`/guru/siswa/${student.id}`} className="inline-flex min-h-11 items-center rounded-md border border-ink/35 px-3 font-bold text-blue hover:border-blue hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue">Buka</Link>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="border-y border-ink/20 py-6 text-sm text-ink-muted">Tidak ada siswa yang sesuai dengan pencarian ini.</p>
        )}
      </section>

      <section aria-labelledby="recent-service-title" className="border-t border-ink/25 pt-5">
        <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
          <div>
            <h2 id="recent-service-title" className="font-display text-xl font-bold text-ink">Catatan layanan terbaru</h2>
            <p className="mt-1 text-sm text-ink-muted">Tiga catatan terakhir yang kamu buat.</p>
          </div>
          <Link to="/guru/layanan" className="inline-flex min-h-11 items-center font-bold text-blue underline underline-offset-4">Tulis catatan baru</Link>
        </div>
        {loading ? <p className="py-4 text-sm text-ink-muted">Memuat catatan layanan…</p> : recentServices.length ? (
          <ul className="divide-y divide-ink/15 border-y border-ink/20">
            {recentServices.slice(0, 3).map((item) => (
              <li key={item.id} className="flex flex-wrap items-start justify-between gap-2 py-3">
                <div className="min-w-0">
                  <p className="font-bold text-ink">{item.topik || SERVICE_LABELS[item.jenis_layanan] || 'Catatan layanan'}</p>
                  <p className="mt-1 text-sm text-ink-muted">{SERVICE_LABELS[item.jenis_layanan] || item.jenis_layanan} · {item.siswa?.nama || item.kelas?.nama_kelas || 'Sasaran tidak tersedia'}</p>
                </div>
                <time className="whitespace-nowrap text-xs text-ink-muted" dateTime={item.tanggal || undefined}>{formatDate(item.tanggal)}</time>
              </li>
            ))}
          </ul>
        ) : (
          <p className="border-y border-ink/20 py-5 text-sm text-ink-muted">Belum ada catatan layanan. Catatan yang kamu buat akan muncul di bagian ini.</p>
        )}
      </section>
    </div>
  )
}
