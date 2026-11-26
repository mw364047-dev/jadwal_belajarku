import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../../services/api.js'
import { LoadingSpinner } from '../../components/index.js'

const numberFormat = new Intl.NumberFormat('id-ID')
const serviceLabels = {
  klasikal: 'Klasikal',
  kelompok: 'Kelompok',
  individual: 'Individual',
  informasi: 'Informasi',
  tindak_lanjut: 'Tindak lanjut',
}
const activityLabels = {
  login: 'Masuk ke aplikasi',
  logout: 'Keluar dari aplikasi',
  ubah_password: 'Mengganti kata sandi',
  tambah_guru: 'Menambahkan akun Guru BK',
  ubah_guru: 'Mengubah data Guru BK',
  hapus_guru: 'Menghapus akun Guru BK',
  aktifkan_guru: 'Mengaktifkan akun Guru BK',
  nonaktifkan_guru: 'Menonaktifkan akun Guru BK',
  reset_password_guru: 'Mereset kata sandi Guru BK',
  tambah_siswa: 'Menambahkan data siswa',
  ubah_siswa: 'Mengubah data siswa',
  hapus_siswa: 'Menghapus akun siswa',
  impor_siswa_csv: 'Mengimpor data siswa dari CSV',
  tambah_kelas: 'Menambahkan kelas',
  ubah_kelas: 'Mengubah data kelas',
  hapus_kelas: 'Menghapus kelas',
  tambah_penugasan: 'Menambahkan penugasan guru dan siswa',
  ubah_penugasan: 'Mengubah penugasan guru dan siswa',
  hapus_penugasan: 'Menghapus penugasan guru dan siswa',
  tambah_tugas: 'Menambahkan tugas belajar',
  ubah_tugas: 'Mengubah tugas belajar',
  hapus_tugas: 'Menghapus tugas belajar',
  tambah_jadwal: 'Menambahkan kegiatan jadwal',
  ubah_jadwal: 'Mengubah kegiatan jadwal',
  hapus_jadwal: 'Menghapus kegiatan jadwal',
  salin_jadwal_minggu_lalu: 'Menyalin jadwal dari minggu lalu',
  tambah_refleksi: 'Mengisi refleksi mingguan',
  ubah_refleksi: 'Mengubah refleksi mingguan',
  hapus_refleksi: 'Menghapus refleksi mingguan',
  tambah_komentar_guru: 'Menambahkan komentar untuk siswa',
  ubah_komentar_guru: 'Mengubah komentar untuk siswa',
  hapus_komentar_guru: 'Menghapus komentar untuk siswa',
  materi_dibuat: 'Menambahkan materi belajar',
  materi_diubah: 'Mengubah materi belajar',
  materi_dihapus: 'Menghapus materi belajar',
  menambahkan_catatan_layanan: 'Menambahkan catatan layanan BK',
  mengubah_catatan_layanan: 'Mengubah catatan layanan BK',
  menghapus_catatan_layanan: 'Menghapus catatan layanan BK',
}
const moduleLabels = {
  auth: 'Akun',
  guru_bk: 'Guru BK',
  siswa: 'Siswa',
  kelas: 'Kelas',
  penugasan_guru_siswa: 'Penugasan',
  tugas: 'Tugas',
  jadwal: 'Jadwal',
  refleksi: 'Refleksi',
  komentar_guru: 'Komentar',
  layanan_bk: 'Layanan BK',
  materi: 'Materi',
}

function formatPeriod(startValue, endValue) {
  if (!startValue || !endValue) return 'Periode saat ini'
  const start = new Date(`${startValue}T00:00:00`)
  const end = new Date(`${endValue}T00:00:00`)
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return 'Periode saat ini'
  const monthYear = new Intl.DateTimeFormat('id-ID', { month: 'long', year: 'numeric' })
  const sameMonth = start.getMonth() === end.getMonth() && start.getFullYear() === end.getFullYear()
  if (sameMonth) {
    return `${start.getDate()}–${end.getDate()} ${monthYear.format(end)}`
  }
  const dayMonth = new Intl.DateTimeFormat('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })
  return `${dayMonth.format(start)} – ${dayMonth.format(end)}`
}

function formatDateTime(value) {
  if (!value) return 'Waktu tidak tersedia'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'Waktu tidak tersedia'
  return new Intl.DateTimeFormat('id-ID', { dateStyle: 'medium', timeStyle: 'short' }).format(date)
}

function describeActivity(action) {
  if (!action) return 'Melakukan aktivitas'
  if (activityLabels[action]) return activityLabels[action]
  const assignmentCount = action.match(/^tambah_penugasan_(\d+)$/)
  if (assignmentCount) return `Menambahkan ${numberFormat.format(Number(assignmentCount[1]))} penugasan guru dan siswa`
  return 'Melakukan perubahan pada sistem'
}

function ActionRow({ text, count, to, label }) {
  if (!count) return null
  return (
    <div className="flex flex-col gap-2 border-t border-ink/20 py-3 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-base leading-6 text-ink">{text.replace('{count}', numberFormat.format(count))}</p>
      <Link to={to} className="inline-flex min-h-11 shrink-0 items-center justify-center rounded-md border border-blue px-3 font-semibold text-blue hover:bg-blue/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue focus-visible:ring-offset-2">
        {label}
      </Link>
    </div>
  )
}

export default function AdminDashboardPage() {
  const [summary, setSummary] = useState(null)
  const [logs, setLogs] = useState([])
  const [loading, setLoading] = useState(true)
  const [logLoading, setLogLoading] = useState(true)
  const [error, setError] = useState('')
  const [logError, setLogError] = useState('')

  useEffect(() => {
    let active = true
    api.get('/api/admin/dashboard')
      .then((response) => { if (active) setSummary(response.data?.data || {}) })
      .catch((requestError) => { if (active) setError(requestError.response?.data?.message || 'Ringkasan belum dapat dimuat. Periksa koneksi lalu coba lagi.') })
      .finally(() => { if (active) setLoading(false) })

    api.get('/api/admin/log', { params: { page: 1, per_page: 5 } })
      .then((response) => { if (active) setLogs(response.data?.logs?.data || []) })
      .catch((requestError) => { if (active) setLogError(requestError.response?.data?.message || 'Aktivitas terakhir belum dapat dimuat.') })
      .finally(() => { if (active) setLogLoading(false) })

    return () => { active = false }
  }, [])

  const periodLabel = useMemo(() => formatPeriod(summary?.periode?.bulan_mulai, summary?.periode?.bulan_selesai), [summary])
  const attention = summary?.perlu_ditindak || {}
  const attentionTotal = Number(attention.guru_belum_login_30_hari || 0)
    + Number(attention.siswa_tanpa_guru_pendamping || 0)
    + Number(attention.siswa_belum_ganti_kata_sandi || 0)
    + Number(attention.guru_belum_ganti_kata_sandi || 0)
  const teachers = Number(summary?.jumlah_guru || 0)
  const teachersLoggedIn = Number(summary?.guru_login_30_hari || 0)
  const teacherLoginRate = teachers > 0 ? Math.min(100, Math.round((teachersLoggedIn / teachers) * 100)) : 0
  const serviceRows = summary?.layanan_per_jenis || []
  const maxServiceCount = Math.max(1, ...serviceRows.map((row) => Number(row.jumlah || 0)))

  return (
    <div className="admin-register-paper -m-4 space-y-8 p-4 text-ink sm:-m-6 sm:p-6 lg:-m-8 lg:p-8">
      <header className="border-b border-ink/30 pb-4">
        <h1 className="font-display text-3xl font-bold tracking-tight text-ink sm:text-4xl">Ringkasan</h1>
        <p className="mt-2 text-base text-ink-muted">Periode {periodLabel}</p>
      </header>

      {loading ? (
        <div className="border-b border-ink/30 py-8"><LoadingSpinner label="Memuat ringkasan administrasi…" /></div>
      ) : error ? (
        <p className="border-l-4 border-mark bg-white px-4 py-3 text-base text-ink" role="alert">{error}</p>
      ) : (
        <>
          <section aria-label="Angka utama" className="grid gap-5 border-b border-ink/30 pb-6 md:grid-cols-3 md:gap-8">
            <div>
              <p className="text-sm text-ink-muted">Guru BK</p>
              <p className="mt-1 text-2xl font-bold tabular-nums text-ink sm:text-3xl">
                {numberFormat.format(teachers)} <span className="text-base font-normal">guru BK</span>
              </p>
              <p className="mt-1 text-base text-ink-muted">{numberFormat.format(teachersLoggedIn)} login dalam 30 hari</p>
              <div className="mt-3 h-1.5 w-full bg-slate-200" role="progressbar" aria-label="Persentase guru BK yang login dalam 30 hari" aria-valuemin="0" aria-valuemax="100" aria-valuenow={teacherLoginRate}>
                <div className="h-full bg-ink" style={{ width: `${teacherLoginRate}%` }} />
              </div>
            </div>
            <div className="border-t border-ink/15 pt-4 md:border-l md:border-t-0 md:pl-8 md:pt-0">
              <p className="text-sm text-ink-muted">Siswa terdaftar</p>
              <p className="mt-1 text-2xl font-bold tabular-nums text-ink sm:text-3xl">{numberFormat.format(Number(summary?.jumlah_siswa || 0))}</p>
            </div>
            <div className="border-t border-ink/15 pt-4 md:border-l md:border-t-0 md:pl-8 md:pt-0">
              <p className="text-sm text-ink-muted">Layanan bulan ini</p>
              <p className="mt-1 text-2xl font-bold tabular-nums text-ink sm:text-3xl">{numberFormat.format(Number(summary?.layanan_bulan_ini || 0))}</p>
            </div>
          </section>

          <section className="rounded-[6px_18px] border-2 border-ink bg-white p-4 sm:p-6" aria-labelledby="attention-title">
            <h2 id="attention-title" className="font-display text-xl font-bold text-ink underline decoration-mark decoration-4 underline-offset-4">Perlu ditindak</h2>
            {attentionTotal === 0 ? (
              <p className="mt-4 border-t border-ink/20 pt-4 text-base text-ink">Tidak ada yang perlu ditindak.</p>
            ) : (
              <div className="mt-2">
                <ActionRow count={Number(attention.guru_belum_login_30_hari || 0)} text="{count} guru BK belum login dalam 30 hari." to="/admin/monitoring-guru" label="Lihat monitoring" />
                <ActionRow count={Number(attention.siswa_tanpa_guru_pendamping || 0)} text="{count} siswa belum memiliki guru pendamping pada tahun ajaran berjalan." to="/admin/penugasan" label="Atur penugasan" />
                <ActionRow count={Number(attention.siswa_belum_ganti_kata_sandi || 0)} text="{count} akun siswa belum mengganti kata sandi awal." to="/admin/siswa" label="Kelola siswa" />
                <ActionRow count={Number(attention.guru_belum_ganti_kata_sandi || 0)} text="{count} akun Guru BK belum mengganti kata sandi awal." to="/admin/guru" label="Kelola guru BK" />
              </div>
            )}
          </section>

          <section aria-labelledby="service-title">
            <div className="flex flex-wrap items-end justify-between gap-3 border-b border-ink/30 pb-3">
              <div>
                <h2 id="service-title" className="font-display text-xl font-bold text-ink">Layanan bulan ini per jenis</h2>
                <p className="mt-1 text-sm text-ink-muted">Jumlah catatan berdasarkan jenis layanan. Isi catatan tidak ditampilkan.</p>
              </div>
              <Link to="/admin/rekap-layanan" className="inline-flex min-h-11 items-center font-semibold text-blue underline decoration-1 underline-offset-4 hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue">Buka rekap layanan</Link>
            </div>
            {serviceRows.length ? (
              <div className="space-y-4 pt-4">
                {serviceRows.map((row) => {
                  const count = Number(row.jumlah || 0)
                  const width = count > 0 ? Math.max(2, (count / maxServiceCount) * 100) : 0
                  return (
                    <div key={row.jenis_layanan} className="grid grid-cols-[minmax(0,8rem)_minmax(0,1fr)_2.5rem] items-center gap-3 sm:grid-cols-[10rem_minmax(0,1fr)_3rem]">
                      <span className="text-sm text-ink">{serviceLabels[row.jenis_layanan] || 'Jenis lain'}</span>
                      <div className="h-3 bg-slate-100" role="img" aria-label={`${serviceLabels[row.jenis_layanan] || 'Jenis lain'}: ${numberFormat.format(count)} layanan`}>
                        <div className="h-full bg-ink" style={{ width: `${width}%` }} />
                      </div>
                      <span className="text-right text-sm font-semibold tabular-nums text-ink">{numberFormat.format(count)}</span>
                    </div>
                  )
                })}
              </div>
            ) : (
              <p className="py-5 text-base text-ink-muted">Belum ada catatan layanan pada bulan ini.</p>
            )}
          </section>

          <section aria-labelledby="activity-title">
            <div className="flex flex-wrap items-end justify-between gap-3 border-b border-ink/30 pb-3">
              <h2 id="activity-title" className="font-display text-xl font-bold text-ink">Aktivitas terakhir</h2>
              <Link to="/admin/log" className="inline-flex min-h-11 items-center font-semibold text-blue underline decoration-1 underline-offset-4 hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue">Lihat semua log</Link>
            </div>
            {logLoading ? (
              <div className="py-6"><LoadingSpinner label="Memuat aktivitas terakhir…" /></div>
            ) : logError ? (
              <p className="mt-4 border-l-4 border-mark bg-white px-4 py-3 text-base text-ink" role="alert">{logError}</p>
            ) : logs.length ? (
              <ol className="divide-y divide-ink/15">
                {logs.slice(0, 5).map((item) => (
                  <li key={item.id} className="grid gap-1 py-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center sm:gap-4">
                    <div>
                      <p className="text-base text-ink">{item.pengguna || 'Pengguna'} <span className="font-semibold">{describeActivity(item.aksi)}</span></p>
                      <p className="mt-0.5 text-sm text-ink-muted">{moduleLabels[item.modul] || 'Sistem'}</p>
                    </div>
                    <time className="text-sm tabular-nums text-ink-muted" dateTime={item.waktu || undefined}>{formatDateTime(item.waktu)}</time>
                  </li>
                ))}
              </ol>
            ) : (
              <p className="py-5 text-base text-ink-muted">Belum ada aktivitas yang tercatat.</p>
            )}
          </section>
        </>
      )}
    </div>
  )
}
