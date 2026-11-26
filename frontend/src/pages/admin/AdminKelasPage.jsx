import { useCallback, useEffect, useMemo, useState } from 'react'
import { api } from '../../services/api.js'
import { useToast } from '../../components/ToastProvider.jsx'
import { Button, Card, ConfirmDialog, EmptyState, Input, LoadingSpinner, Modal, Pagination, Table } from '../../components/index.js'

function errorMessage(error, fallback = 'Terjadi kesalahan. Silakan coba lagi.') {
  const errors = error?.response?.data?.errors
  if (errors) {
    const first = Object.values(errors).flat()?.[0]
    if (first) return first
  }
  return error?.response?.data?.message || fallback
}

export default function AdminKelasPage() {
  const { showToast } = useToast()
  const [classes, setClasses] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [refreshKey, setRefreshKey] = useState(0)
  const [page, setPage] = useState(1)
  const [lastPage, setLastPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [searchInput, setSearchInput] = useState('')
  const [search, setSearch] = useState('')

  const [formOpen, setFormOpen] = useState(false)
  const [editingClass, setEditingClass] = useState(null)
  const [form, setForm] = useState({ nama_kelas: '', tahun_ajaran: '2026/2027' })
  const [formErrors, setFormErrors] = useState({})
  const [saving, setSaving] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [deleteLoading, setDeleteLoading] = useState(false)

  const loadClasses = useCallback(async () => {
    setLoading(true)
    setLoadError('')
    try {
      const response = await api.get('/api/admin/kelas', { params: { search, page, per_page: 10 } })
      setClasses(response.data.data || [])
      setPage(response.data.current_page || 1)
      setLastPage(response.data.last_page || 1)
      setTotal(response.data.total || 0)
    } catch (error) {
      const message = errorMessage(error, 'Daftar kelas belum dapat dimuat.')
      setLoadError(message)
      if (error.response?.status !== 401) showToast(message, { variant: 'danger', title: 'Gagal memuat data' })
    } finally {
      setLoading(false)
    }
  }, [search, page, showToast])

  useEffect(() => { loadClasses() }, [loadClasses, refreshKey])

  const columns = useMemo(() => [
    { key: 'nama_kelas', header: 'Nama kelas', render: (item) => <span className="font-bold text-slate-900">{item.nama_kelas}</span> },
    { key: 'tahun_ajaran', header: 'Tahun ajaran' },
    { key: 'siswa_count', header: 'Jumlah siswa', numeric: true, render: (item) => <span className="tabular-nums">{Number(item.siswa_count || 0).toLocaleString('id-ID')} siswa</span> },
    { key: 'actions', header: 'Aksi', render: (item) => <div className="flex flex-wrap gap-2"><Button size="sm" variant="outline" onClick={() => openEdit(item)}>Ubah</Button><Button size="sm" variant="danger" onClick={() => setDeleteTarget(item)}>Hapus</Button></div> },
  ], [])

  function openCreate() {
    setEditingClass(null)
    setForm({ nama_kelas: '', tahun_ajaran: '2026/2027' })
    setFormErrors({})
    setFormOpen(true)
  }

  function openEdit(item) {
    setEditingClass(item)
    setForm({ nama_kelas: item.nama_kelas, tahun_ajaran: item.tahun_ajaran })
    setFormErrors({})
    setFormOpen(true)
  }

  async function submitForm(event) {
    event.preventDefault()
    setSaving(true)
    setFormErrors({})
    const payload = { nama_kelas: form.nama_kelas.trim(), tahun_ajaran: form.tahun_ajaran.trim() }
    try {
      if (editingClass) {
        await api.put(`/api/admin/kelas/${editingClass.id}`, payload)
        showToast('Data kelas berhasil diperbarui.')
      } else {
        await api.post('/api/admin/kelas', payload)
        showToast('Data kelas berhasil ditambahkan.')
      }
      setFormOpen(false)
      setEditingClass(null)
      setRefreshKey((value) => value + 1)
    } catch (error) {
      if (error.response?.status === 422 && error.response.data?.errors) setFormErrors(error.response.data.errors)
      else showToast(errorMessage(error, 'Data kelas belum berhasil disimpan.'), { variant: 'danger', title: 'Gagal menyimpan' })
    } finally {
      setSaving(false)
    }
  }

  async function deleteClass() {
    if (!deleteTarget) return
    setDeleteLoading(true)
    try {
      await api.delete(`/api/admin/kelas/${deleteTarget.id}`)
      showToast('Data kelas berhasil dihapus.')
      setDeleteTarget(null)
      setRefreshKey((value) => value + 1)
    } catch (error) {
      showToast(errorMessage(error, 'Kelas belum dapat dihapus.'), { variant: 'danger', title: 'Gagal menghapus' })
    } finally {
      setDeleteLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div><p className="text-base font-semibold text-belajar-700">Pengelolaan data sekolah</p><h1 className="mt-1 text-2xl font-extrabold tracking-tight text-slate-950 sm:text-3xl">Data Kelas</h1><p className="mt-2 max-w-2xl text-base leading-6 text-slate-600">Kelola nama kelas dan tahun ajaran yang digunakan untuk mengelompokkan siswa.</p></div>
        <Button onClick={openCreate}>＋ Tambah kelas</Button>
      </div>

      <Card>
        <form className="grid grid-cols-1 gap-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end" onSubmit={(event) => { event.preventDefault(); setPage(1); setSearch(searchInput.trim()) }}>
          <Input label="Cari kelas" value={searchInput} onChange={(event) => setSearchInput(event.target.value)} placeholder="Nama kelas atau tahun ajaran" />
          <div className="flex gap-2"><Button type="submit" className="flex-1 sm:flex-none">Cari</Button><Button type="button" variant="outline" onClick={() => { setSearchInput(''); setSearch(''); setPage(1) }}>Reset</Button></div>
        </form>
      </Card>

      {loadError && <Card className="border-rose-200 bg-rose-50"><div className="flex flex-wrap items-center justify-between gap-3"><p className="text-base text-rose-800">{loadError}</p><Button size="sm" variant="outline" onClick={() => setRefreshKey((value) => value + 1)}>Coba lagi</Button></div></Card>}

      <Card padding="p-0" className="overflow-hidden">
        <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-4 py-4 sm:px-5"><h2 className="text-lg font-bold text-slate-900">Daftar kelas</h2><span className="text-sm tabular-nums text-ink-muted">{total.toLocaleString('id-ID')} kelas</span></div>
        <div className="p-3 sm:p-5">{loading ? <div className="flex min-h-48 items-center justify-center"><LoadingSpinner label="Memuat daftar kelas…" /></div> : classes.length ? <Table columns={columns} data={classes} caption="Daftar kelas dan jumlah siswa" /> : <EmptyState title={search ? 'Kelas tidak ditemukan' : 'Belum ada data kelas'} description={search ? 'Coba ubah kata kunci pencarian.' : 'Tambahkan kelas terlebih dahulu sebelum menambahkan siswa.'} actionLabel={search ? 'Reset pencarian' : 'Tambah kelas'} onAction={search ? () => { setSearchInput(''); setSearch(''); setPage(1) } : openCreate} />}</div>
        {!loading && total > 0 && <div className="border-t border-slate-100 px-4 py-4 sm:px-5"><Pagination page={page} totalPages={lastPage} onPageChange={setPage} /></div>}
      </Card>

      <Modal open={formOpen} onClose={() => !saving && setFormOpen(false)} title={editingClass ? 'Ubah data kelas' : 'Tambah kelas'} description="Nama kelas dan tahun ajaran harus unik sebagai satu kombinasi.">
        <form onSubmit={submitForm} className="space-y-4">
          <Input label="Nama kelas" value={form.nama_kelas} onChange={(event) => { setForm((current) => ({ ...current, nama_kelas: event.target.value })); setFormErrors((current) => ({ ...current, nama_kelas: undefined })) }} error={formErrors.nama_kelas?.[0]} required placeholder="Contoh: VIII A" />
          <Input label="Tahun ajaran" value={form.tahun_ajaran} onChange={(event) => { setForm((current) => ({ ...current, tahun_ajaran: event.target.value })); setFormErrors((current) => ({ ...current, tahun_ajaran: undefined })) }} error={formErrors.tahun_ajaran?.[0]} required placeholder="2026/2027" helperText="Gunakan format tahun/tahun, misalnya 2026/2027." />
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end"><Button type="button" variant="outline" onClick={() => setFormOpen(false)} disabled={saving}>Batal</Button><Button type="submit" loading={saving}>{editingClass ? 'Simpan perubahan' : 'Tambah kelas'}</Button></div>
        </form>
      </Modal>

      <ConfirmDialog open={Boolean(deleteTarget)} onClose={() => setDeleteTarget(null)} onConfirm={deleteClass} loading={deleteLoading} title="Hapus kelas?" description={`Kelas ${deleteTarget?.nama_kelas || ''} (${deleteTarget?.tahun_ajaran || ''}) akan dihapus dari daftar kelas. Penghapusan hanya dapat dilakukan jika belum ada siswa atau riwayat layanan yang memakai kelas ini.`} confirmLabel="Ya, hapus kelas" />
    </div>
  )
}
