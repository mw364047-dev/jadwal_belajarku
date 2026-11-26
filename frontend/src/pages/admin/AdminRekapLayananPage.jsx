import { useCallback, useEffect, useState } from 'react'
import { api } from '../../services/api.js'
import { Button, Card, Input, LoadingSpinner, Pagination, Select, Table } from '../../components/index.js'
import { useToast } from '../../components/ToastProvider.jsx'

const serviceTypes = [
  { value: 'klasikal', label: 'Klasikal' },
  { value: 'kelompok', label: 'Kelompok' },
  { value: 'individual', label: 'Individual' },
  { value: 'informasi', label: 'Informasi' },
  { value: 'tindak_lanjut', label: 'Tindak lanjut' },
]

function formatDate(value) {
  if (!value) return '—'
  const date = new Date(`${value}T00:00:00`)
  return Number.isNaN(date.getTime()) ? value : new Intl.DateTimeFormat('id-ID', { dateStyle: 'medium' }).format(date)
}

export default function AdminRekapLayananPage() {
  const { showToast } = useToast()
  const [filters, setFilters] = useState({ guru_id: '', kelas_id: '', jenis_layanan: '', tanggal_mulai: '', tanggal_selesai: '' })
  const [applied, setApplied] = useState({ ...filters })
  const [page, setPage] = useState(1)
  const [items, setItems] = useState([])
  const [teachers, setTeachers] = useState([])
  const [classes, setClasses] = useState([])
  const [lastPage, setLastPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [exporting, setExporting] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true
    Promise.all([
      api.get('/api/admin/guru', { params: { per_page: 100 } }),
      api.get('/api/admin/kelas', { params: { per_page: 100 } }),
    ]).then(([guruResponse, kelasResponse]) => {
      if (!active) return
      setTeachers(guruResponse.data?.data || [])
      setClasses(kelasResponse.data?.data || [])
    }).catch(() => {
      if (active) showToast('Pilihan guru atau kelas belum dapat dimuat.', { variant: 'warning' })
    })
    return () => { active = false }
  }, [showToast])

  const loadData = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const response = await api.get('/api/admin/rekap-layanan', { params: { ...applied, page, per_page: 10 } })
      setItems(response.data?.data || [])
      setLastPage(response.data?.last_page || 1)
      setTotal(response.data?.total || 0)
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Rekap layanan belum dapat dimuat.')
    } finally {
      setLoading(false)
    }
  }, [applied, page])

  useEffect(() => { loadData() }, [loadData])

  const columns = [
    { key: 'guru', header: 'Guru BK', render: (row) => <span className="font-semibold text-slate-900">{row.guru?.nama || '—'}</span> },
    { key: 'sasaran', header: 'Siswa / Kelas', render: (row) => <div><p className="font-semibold text-slate-900">{row.siswa?.nama || 'Layanan kelas'}</p><p className="text-sm text-slate-500">{row.kelas?.nama_kelas || 'Kelas tidak dicantumkan'}{row.kelas?.tahun_ajaran ? ` · ${row.kelas.tahun_ajaran}` : ''}</p></div> },
    { key: 'jenis_layanan', header: 'Jenis layanan', render: (row) => <span>{serviceTypes.find((item) => item.value === row.jenis_layanan)?.label || row.jenis_layanan}</span> },
    { key: 'tanggal', header: 'Tanggal', render: (row) => formatDate(row.tanggal) },
  ]

  function submitFilters(event) {
    event.preventDefault()
    setPage(1)
    setApplied({ ...filters })
  }

  function resetFilters() {
    const empty = { guru_id: '', kelas_id: '', jenis_layanan: '', tanggal_mulai: '', tanggal_selesai: '' }
    setFilters(empty)
    setApplied(empty)
    setPage(1)
  }

  async function exportExcel() {
    setExporting(true)
    try {
      const response = await api.get('/api/admin/rekap-layanan/export', { params: applied, responseType: 'blob' })
      const url = URL.createObjectURL(new Blob([response.data], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }))
      const anchor = document.createElement('a')
      anchor.href = url
      anchor.download = `rekap-layanan-bk-${new Date().toISOString().slice(0, 10)}.xlsx`
      document.body.appendChild(anchor)
      anchor.click()
      anchor.remove()
      URL.revokeObjectURL(url)
      showToast('File Excel berhasil disiapkan.')
    } catch (requestError) {
      showToast(requestError.response?.status === 500 ? 'Ekspor belum tersedia. Pastikan paket maatwebsite/excel sudah dipasang.' : 'Ekspor Excel gagal dilakukan.', { variant: 'danger' })
    } finally {
      setExporting(false)
    }
  }

  return (
    <div className="space-y-6">
      <div><h1 className="text-2xl font-bold tracking-tight text-slate-950">Rekap Layanan BK</h1><p className="mt-2 text-base text-slate-600">Admin hanya melihat ringkasan guru, siswa/kelas, jenis layanan, dan tanggal. Isi topik maupun tindak lanjut tidak ditampilkan.</p></div>
      <Card title="Filter rekap" description="Gunakan satu atau beberapa filter untuk mempersempit data.">
        <form onSubmit={submitFilters} className="grid gap-4 md:grid-cols-3">
          <Select label="Guru BK" placeholder="Semua guru" value={filters.guru_id} onChange={(event) => setFilters((current) => ({ ...current, guru_id: event.target.value }))} options={teachers.map((teacher) => ({ value: String(teacher.id), label: teacher.nama }))} />
          <Select label="Kelas" placeholder="Semua kelas" value={filters.kelas_id} onChange={(event) => setFilters((current) => ({ ...current, kelas_id: event.target.value }))} options={classes.map((item) => ({ value: String(item.id), label: `${item.nama_kelas} — ${item.tahun_ajaran}` }))} />
          <Select label="Jenis layanan" placeholder="Semua jenis" value={filters.jenis_layanan} onChange={(event) => setFilters((current) => ({ ...current, jenis_layanan: event.target.value }))} options={serviceTypes} />
          <Input label="Tanggal mulai" type="date" value={filters.tanggal_mulai} max={filters.tanggal_selesai || undefined} onChange={(event) => setFilters((current) => ({ ...current, tanggal_mulai: event.target.value }))} />
          <Input label="Tanggal selesai" type="date" value={filters.tanggal_selesai} min={filters.tanggal_mulai || undefined} onChange={(event) => setFilters((current) => ({ ...current, tanggal_selesai: event.target.value }))} />
          <div className="flex flex-wrap items-end gap-2"><Button type="submit">Terapkan</Button><Button type="button" variant="outline" onClick={resetFilters}>Reset</Button></div>
        </form>
      </Card>
      <Card title="Data ringkasan layanan" description={`${total.toLocaleString('id-ID')} catatan layanan ditemukan.`} action={<Button variant="outline" onClick={exportExcel} loading={exporting}>Ekspor Excel</Button>}>
        {loading ? <LoadingSpinner label="Memuat rekap layanan…" /> : error ? <p className="text-base text-rose-700" role="alert">{error}</p> : <>
          <Table columns={columns} data={items} emptyTitle="Belum ada catatan layanan" emptyDescription="Catatan layanan akan tampil sesuai filter yang dipilih." />
          <Pagination className="mt-5" page={page} totalPages={lastPage} onPageChange={setPage} />
        </>}
      </Card>
    </div>
  )
}
