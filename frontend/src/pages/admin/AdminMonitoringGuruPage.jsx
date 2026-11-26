import { useCallback, useEffect, useState } from 'react'
import { api } from '../../services/api.js'
import { Button, Card, Input, LoadingSpinner, Pagination, Table } from '../../components/index.js'

function formatDate(value) {
  if (!value) return 'Belum pernah login'
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? '—' : new Intl.DateTimeFormat('id-ID', { dateStyle: 'medium', timeStyle: 'short' }).format(date)
}

export default function AdminMonitoringGuruPage() {
  const [filters, setFilters] = useState({ tanggal_mulai: '', tanggal_selesai: '', search: '' })
  const [applied, setApplied] = useState({ tanggal_mulai: '', tanggal_selesai: '', search: '' })
  const [page, setPage] = useState(1)
  const [items, setItems] = useState([])
  const [lastPage, setLastPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const loadData = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const response = await api.get('/api/admin/monitoring-guru', { params: { ...applied, page, per_page: 10 } })
      setItems(response.data?.data || [])
      setLastPage(response.data?.last_page || 1)
      setTotal(response.data?.total || 0)
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Monitoring guru belum dapat dimuat.')
    } finally {
      setLoading(false)
    }
  }, [applied, page])

  useEffect(() => { loadData() }, [loadData])

  const columns = [
    { key: 'nama', header: 'Guru BK', render: (row) => <div><p className="font-bold text-slate-900">{row.nama || '—'}</p><p className="text-sm text-slate-500">@{row.username || '—'}</p></div> },
    { key: 'status', header: 'Status akun', render: (row) => <span className={`inline-flex min-h-7 items-center rounded-full px-3 py-1 text-base font-semibold ${row.is_active ? 'bg-teal/10 text-teal' : 'bg-slate-100 text-slate-600'}`}>{row.is_active ? 'Aktif' : 'Nonaktif'}</span> },
    { key: 'last_login_at', header: 'Login terakhir', render: (row) => formatDate(row.last_login_at) },
    { key: 'jumlah_layanan', header: 'Jumlah layanan', render: (row) => <span className="font-bold tabular-nums">{Number(row.jumlah_layanan || 0).toLocaleString('id-ID')}</span> },
    { key: 'layanan_terakhir', header: 'Layanan terakhir', render: (row) => row.layanan_terakhir ? new Intl.DateTimeFormat('id-ID', { dateStyle: 'medium' }).format(new Date(`${row.layanan_terakhir}T00:00:00`)) : 'Belum ada layanan' },
  ]

  function submitFilters(event) {
    event.preventDefault()
    setPage(1)
    setApplied({ ...filters })
  }

  function resetFilters() {
    const empty = { tanggal_mulai: '', tanggal_selesai: '', search: '' }
    setFilters(empty)
    setApplied(empty)
    setPage(1)
  }

  return (
    <div className="space-y-6">
      <div><h1 className="text-2xl font-bold tracking-tight text-slate-950">Monitoring Guru BK</h1><p className="mt-2 text-base text-slate-600">Pantau aktivitas login dan jumlah layanan yang dicatat oleh setiap guru BK.</p></div>
      <Card title="Filter periode" description="Kosongkan tanggal untuk melihat seluruh riwayat layanan.">
        <form onSubmit={submitFilters} className="grid gap-4 md:grid-cols-4">
          <Input label="Nama guru" placeholder="Cari nama guru" value={filters.search} onChange={(event) => setFilters((current) => ({ ...current, search: event.target.value }))} />
          <Input label="Tanggal mulai" type="date" value={filters.tanggal_mulai} max={filters.tanggal_selesai || undefined} onChange={(event) => setFilters((current) => ({ ...current, tanggal_mulai: event.target.value }))} />
          <Input label="Tanggal selesai" type="date" value={filters.tanggal_selesai} min={filters.tanggal_mulai || undefined} onChange={(event) => setFilters((current) => ({ ...current, tanggal_selesai: event.target.value }))} />
          <div className="flex items-end gap-2"><Button type="submit">Terapkan</Button><Button type="button" variant="outline" onClick={resetFilters}>Reset</Button></div>
        </form>
      </Card>
      <Card title="Daftar guru BK" description={`${total.toLocaleString('id-ID')} guru ditemukan.`}>
        {loading ? <LoadingSpinner label="Memuat monitoring guru…" /> : error ? <p className="text-base text-rose-700" role="alert">{error}</p> : <>
          <Table columns={columns} data={items} emptyTitle="Belum ada data guru" emptyDescription="Data guru BK akan tampil setelah akun tersedia." />
          <Pagination className="mt-5" page={page} totalPages={lastPage} onPageChange={setPage} />
        </>}
      </Card>
    </div>
  )
}
