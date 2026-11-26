import { useCallback, useEffect, useState } from 'react'
import { api } from '../../services/api.js'
import { Button, Card, Input, LoadingSpinner, Pagination, Select, Table } from '../../components/index.js'

function formatDate(value) {
  if (!value) return '—'
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? '—' : new Intl.DateTimeFormat('id-ID', { dateStyle: 'medium', timeStyle: 'short' }).format(date)
}

const roleNames = { admin: 'Admin', guru_bk: 'Guru BK', siswa: 'Siswa' }
const moduleNames = { auth: 'Akun', guru_bk: 'Guru BK', siswa: 'Siswa', kelas: 'Kelas', penugasan_guru_siswa: 'Penugasan', tugas: 'Tugas', jadwal: 'Jadwal', refleksi: 'Refleksi', komentar_guru: 'Komentar', layanan_bk: 'Layanan BK', materi: 'Materi' }
const actionLabels = {
  login: 'Masuk ke aplikasi', logout: 'Keluar dari aplikasi', ubah_password: 'Mengganti kata sandi',
  tambah_guru: 'Menambahkan akun Guru BK', ubah_guru: 'Mengubah data Guru BK', hapus_guru: 'Menghapus akun Guru BK',
  aktifkan_guru: 'Mengaktifkan akun Guru BK', nonaktifkan_guru: 'Menonaktifkan akun Guru BK', reset_password_guru: 'Mereset kata sandi Guru BK',
  tambah_siswa: 'Menambahkan data siswa', ubah_siswa: 'Mengubah data siswa', hapus_siswa: 'Menghapus akun siswa', impor_siswa_csv: 'Mengimpor data siswa dari CSV',
  tambah_kelas: 'Menambahkan kelas', ubah_kelas: 'Mengubah data kelas', hapus_kelas: 'Menghapus kelas',
  tambah_penugasan: 'Menambahkan penugasan guru dan siswa', ubah_penugasan: 'Mengubah penugasan guru dan siswa', hapus_penugasan: 'Menghapus penugasan guru dan siswa',
  tambah_tugas: 'Menambahkan tugas belajar', ubah_tugas: 'Mengubah tugas belajar', hapus_tugas: 'Menghapus tugas belajar',
  tambah_jadwal: 'Menambahkan kegiatan jadwal', ubah_jadwal: 'Mengubah kegiatan jadwal', hapus_jadwal: 'Menghapus kegiatan jadwal',
  salin_jadwal_minggu_lalu: 'Menyalin jadwal dari minggu lalu', tambah_refleksi: 'Mengisi refleksi mingguan', ubah_refleksi: 'Mengubah refleksi mingguan', hapus_refleksi: 'Menghapus refleksi mingguan',
  tambah_komentar_guru: 'Menambahkan komentar untuk siswa', ubah_komentar_guru: 'Mengubah komentar untuk siswa', hapus_komentar_guru: 'Menghapus komentar untuk siswa',
  materi_dibuat: 'Menambahkan materi belajar', materi_diubah: 'Mengubah materi belajar', materi_dihapus: 'Menghapus materi belajar',
  menambahkan_catatan_layanan: 'Menambahkan catatan layanan BK', mengubah_catatan_layanan: 'Mengubah catatan layanan BK', menghapus_catatan_layanan: 'Menghapus catatan layanan BK',
}
function describeAction(action) {
  if (actionLabels[action]) return actionLabels[action]
  const assignmentCount = String(action || '').match(/^tambah_penugasan_(\d+)$/)
  if (assignmentCount) return `Menambahkan ${Number(assignmentCount[1]).toLocaleString('id-ID')} penugasan guru dan siswa`
  return 'Melakukan perubahan pada sistem'
}

export default function AdminLogPage() {
  const [filters, setFilters] = useState({ user_id: '', tanggal_mulai: '', tanggal_selesai: '' })
  const [applied, setApplied] = useState({ ...filters })
  const [page, setPage] = useState(1)
  const [items, setItems] = useState([])
  const [users, setUsers] = useState([])
  const [lastPage, setLastPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const loadData = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const response = await api.get('/api/admin/log', { params: { ...applied, page, per_page: 15 } })
      const logData = response.data?.logs || {}
      setItems(logData.data || [])
      setLastPage(logData.last_page || 1)
      setTotal(logData.total || 0)
      setUsers(response.data?.users || [])
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Log aktivitas belum dapat dimuat.')
    } finally {
      setLoading(false)
    }
  }, [applied, page])

  useEffect(() => { loadData() }, [loadData])

  const columns = [
    { key: 'waktu', header: 'Waktu', render: (row) => formatDate(row.waktu) },
    { key: 'pengguna', header: 'Pengguna', render: (row) => <div><p className="font-bold text-slate-900">{row.pengguna}</p><p className="text-sm text-slate-500">{row.username ? `@${row.username}` : '—'}</p></div> },
    { key: 'role', header: 'Peran', render: (row) => <span>{roleNames[row.role] || '—'}</span> },
    { key: 'aksi', header: 'Aktivitas', render: (row) => <span className="font-semibold">{describeAction(row.aksi)}</span> },
    { key: 'modul', header: 'Modul', render: (row) => moduleNames[row.modul] || 'Sistem' },
    { key: 'ip_address', header: 'Alamat IP' },
  ]

  function submitFilters(event) {
    event.preventDefault()
    setPage(1)
    setApplied({ ...filters })
  }

  function resetFilters() {
    const empty = { user_id: '', tanggal_mulai: '', tanggal_selesai: '' }
    setFilters(empty)
    setApplied(empty)
    setPage(1)
  }

  return (
    <div className="space-y-6">
      <div><h1 className="text-2xl font-bold tracking-tight text-slate-950">Log Aktivitas</h1><p className="mt-2 text-base text-slate-600">Riwayat login dan perubahan penting yang tercatat di dalam sistem.</p></div>
      <Card title="Filter log" description="Pilih pengguna dan/atau rentang tanggal.">
        <form onSubmit={submitFilters} className="grid gap-4 md:grid-cols-4">
          <Select label="Pengguna" placeholder="Semua pengguna" value={filters.user_id} onChange={(event) => setFilters((current) => ({ ...current, user_id: event.target.value }))} options={users.map((item) => ({ value: String(item.id), label: `${item.nama} (${roleNames[item.role] || item.role})` }))} />
          <Input label="Tanggal mulai" type="date" value={filters.tanggal_mulai} max={filters.tanggal_selesai || undefined} onChange={(event) => setFilters((current) => ({ ...current, tanggal_mulai: event.target.value }))} />
          <Input label="Tanggal selesai" type="date" value={filters.tanggal_selesai} min={filters.tanggal_mulai || undefined} onChange={(event) => setFilters((current) => ({ ...current, tanggal_selesai: event.target.value }))} />
          <div className="flex items-end gap-2"><Button type="submit">Terapkan</Button><Button type="button" variant="outline" onClick={resetFilters}>Reset</Button></div>
        </form>
      </Card>
      <Card title="Riwayat aktivitas" description={`${total.toLocaleString('id-ID')} aktivitas ditemukan.`}>
        {loading ? <LoadingSpinner label="Memuat log aktivitas…" /> : error ? <p className="text-base text-rose-700" role="alert">{error}</p> : <>
          <Table columns={columns} data={items} emptyTitle="Belum ada aktivitas" emptyDescription="Aktivitas akan tercatat saat pengguna melakukan tindakan di sistem." />
          <Pagination className="mt-5" page={page} totalPages={lastPage} onPageChange={setPage} />
        </>}
      </Card>
    </div>
  )
}
