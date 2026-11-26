import { useCallback, useEffect, useMemo, useState } from 'react'
import { api } from '../../services/api.js'
import { useToast } from '../../components/ToastProvider.jsx'
import {
  Badge, Button, Card, ConfirmDialog, EmptyState, Input, LoadingSpinner,
  Modal, Pagination, Select, Table,
} from '../../components/index.js'

const emptyForm = { nama: '', nis: '', kelas_id: '' }

function errorMessage(error, fallback = 'Terjadi kesalahan. Silakan coba lagi.') {
  const errors = error?.response?.data?.errors
  if (errors) {
    const first = Object.values(errors).flat()?.[0]
    if (first) return first
  }
  return error?.response?.data?.message || fallback
}

export default function AdminSiswaPage() {
  const { showToast } = useToast()
  const [students, setStudents] = useState([])
  const [classes, setClasses] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [refreshKey, setRefreshKey] = useState(0)
  const [page, setPage] = useState(1)
  const [lastPage, setLastPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [searchInput, setSearchInput] = useState('')
  const [search, setSearch] = useState('')
  const [kelasFilter, setKelasFilter] = useState('')

  const [formOpen, setFormOpen] = useState(false)
  const [editingStudent, setEditingStudent] = useState(null)
  const [form, setForm] = useState(emptyForm)
  const [formErrors, setFormErrors] = useState({})
  const [saving, setSaving] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [deleteLoading, setDeleteLoading] = useState(false)
  const [credentials, setCredentials] = useState(null)

  const [csvFile, setCsvFile] = useState(null)
  const [preview, setPreview] = useState(null)
  const [previewLoading, setPreviewLoading] = useState(false)
  const [importLoading, setImportLoading] = useState(false)
  const [importResult, setImportResult] = useState(null)

  const loadStudents = useCallback(async () => {
    setLoading(true)
    setLoadError('')
    try {
      const response = await api.get('/api/admin/siswa', {
        params: { search, kelas_id: kelasFilter || undefined, page, per_page: 10 },
      })
      setStudents(response.data.data || [])
      setPage(response.data.current_page || 1)
      setLastPage(response.data.last_page || 1)
      setTotal(response.data.total || 0)
    } catch (error) {
      const message = errorMessage(error, 'Daftar siswa belum dapat dimuat.')
      setLoadError(message)
      if (error.response?.status !== 401) showToast(message, { variant: 'danger', title: 'Gagal memuat data' })
    } finally {
      setLoading(false)
    }
  }, [search, kelasFilter, page, showToast])

  useEffect(() => { loadStudents() }, [loadStudents, refreshKey])

  useEffect(() => {
    let active = true
    api.get('/api/admin/kelas', { params: { per_page: 50 } })
      .then((response) => { if (active) setClasses(response.data.data || []) })
      .catch((error) => {
        if (active) showToast(errorMessage(error, 'Daftar kelas belum dapat dimuat.'), { variant: 'danger' })
      })
    return () => { active = false }
  }, [showToast, refreshKey])

  const columns = useMemo(() => [
    {
      key: 'nama', header: 'Nama siswa',
      render: (student) => <div><p className="font-bold text-slate-900">{student.nama}</p><p className="mt-1 text-sm text-slate-500">NIS: {student.nis}</p></div>,
    },
    {
      key: 'kelas', header: 'Kelas',
      render: (student) => <div><p className="font-semibold text-slate-800">{student.nama_kelas || '—'}</p><p className="text-sm text-slate-500">{student.tahun_ajaran || '—'}</p></div>,
    },
    {
      key: 'actions', header: 'Aksi',
      render: (student) => <div className="flex flex-wrap gap-2">
        <Button size="sm" variant="outline" onClick={() => openEdit(student)}>Ubah</Button>
        <Button size="sm" variant="danger" onClick={() => setDeleteTarget(student)}>Hapus</Button>
      </div>,
    },
  ], [])

  function openCreate() {
    setEditingStudent(null)
    setForm({ ...emptyForm, kelas_id: classes[0]?.id ? String(classes[0].id) : '' })
    setFormErrors({})
    setFormOpen(true)
  }

  function openEdit(student) {
    setEditingStudent(student)
    setForm({ nama: student.nama || '', nis: student.nis || '', kelas_id: String(student.kelas_id || '') })
    setFormErrors({})
    setFormOpen(true)
  }

  function updateField(field, value) {
    setForm((current) => ({ ...current, [field]: value }))
    setFormErrors((current) => ({ ...current, [field]: undefined }))
  }

  async function submitForm(event) {
    event.preventDefault()
    setSaving(true)
    setFormErrors({})
    const payload = { nama: form.nama.trim(), nis: form.nis.trim(), kelas_id: Number(form.kelas_id) }
    try {
      if (editingStudent) {
        await api.put(`/api/admin/siswa/${editingStudent.id}`, payload)
        showToast('Data siswa berhasil diperbarui.')
      } else {
        const response = await api.post('/api/admin/siswa', payload)
        setCredentials([{ nama: payload.nama, nis: payload.nis, ...response.data.credentials }])
        showToast('Data siswa dan akun awal berhasil dibuat.')
      }
      setFormOpen(false)
      setEditingStudent(null)
      setRefreshKey((value) => value + 1)
    } catch (error) {
      if (error.response?.status === 422 && error.response.data?.errors) setFormErrors(error.response.data.errors)
      else showToast(errorMessage(error, 'Data siswa belum berhasil disimpan.'), { variant: 'danger', title: 'Gagal menyimpan' })
    } finally {
      setSaving(false)
    }
  }

  async function deleteStudent() {
    if (!deleteTarget) return
    setDeleteLoading(true)
    try {
      await api.delete(`/api/admin/siswa/${deleteTarget.id}`)
      showToast('Akun siswa berhasil dihapus secara soft delete.')
      setDeleteTarget(null)
      setRefreshKey((value) => value + 1)
    } catch (error) {
      showToast(errorMessage(error, 'Data siswa belum berhasil dihapus.'), { variant: 'danger', title: 'Gagal menghapus' })
    } finally {
      setDeleteLoading(false)
    }
  }

  async function previewCsv() {
    if (!csvFile) {
      showToast('Pilih file CSV terlebih dahulu.', { variant: 'warning' })
      return
    }
    setPreviewLoading(true)
    setPreview(null)
    setImportResult(null)
    const formData = new FormData()
    formData.append('file', csvFile)
    try {
      const response = await api.post('/api/admin/siswa/import/preview', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      setPreview(response.data)
    } catch (error) {
      showToast(errorMessage(error, 'Pratinjau CSV gagal dibuat.'), { variant: 'danger', title: 'Gagal membaca CSV' })
    } finally {
      setPreviewLoading(false)
    }
  }

  async function importCsv() {
    if (!csvFile || !preview) return
    if (!preview.summary?.valid_rows) {
      showToast('Tidak ada baris valid yang dapat diimpor.', { variant: 'warning' })
      return
    }
    setImportLoading(true)
    const formData = new FormData()
    formData.append('file', csvFile)
    try {
      const response = await api.post('/api/admin/siswa/import', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      setImportResult(response.data)
      setCredentials(response.data.credentials || [])
      showToast(`${response.data.summary?.imported || 0} data siswa berhasil diimpor.`)
      setPreview(null)
      setCsvFile(null)
      const input = document.getElementById('csv-siswa-input')
      if (input) input.value = ''
      setRefreshKey((value) => value + 1)
    } catch (error) {
      showToast(errorMessage(error, 'Impor CSV belum berhasil dilakukan.'), { variant: 'danger', title: 'Impor gagal' })
    } finally {
      setImportLoading(false)
    }
  }

  async function copyCredentials() {
    if (!credentials?.length) return
    const content = credentials.map((item) => `${item.nama} | ${item.nis} | ${item.username} | ${item.password}`).join('\n')
    try {
      await navigator.clipboard.writeText(content)
      showToast('Daftar username dan password berhasil disalin.')
    } catch {
      showToast('Clipboard tidak tersedia. Salin data akun dari tabel secara manual.', { variant: 'warning' })
    }
  }

  const classOptions = classes.map((item) => ({ value: String(item.id), label: `${item.nama_kelas} — ${item.tahun_ajaran}` }))

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-base font-semibold text-belajar-700">Pengelolaan pengguna</p>
          <h1 className="mt-1 text-2xl font-extrabold tracking-tight text-slate-950 sm:text-3xl">Data Siswa</h1>
          <p className="mt-2 max-w-2xl text-base leading-6 text-slate-600">Kelola data dasar siswa kelas VIII. Akun dan password awal dibuat otomatis oleh sistem.</p>
        </div>
        <Button onClick={openCreate} disabled={!classes.length}>＋ Tambah siswa</Button>
      </div>

      <Card title="Impor siswa dari CSV" description="Gunakan tiga kolom saja: nama, nis, kelas. Pratinjau akan memeriksa setiap baris sebelum data disimpan.">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end">
          <div className="min-w-0 flex-1">
            <label htmlFor="csv-siswa-input" className="mb-2 block text-base font-semibold text-slate-800">Pilih file CSV</label>
            <input id="csv-siswa-input" type="file" accept=".csv,text/csv" onChange={(event) => { setCsvFile(event.target.files?.[0] || null); setPreview(null); setImportResult(null) }} className="min-h-12 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-base file:mr-3 file:rounded-lg file:border-0 file:bg-belajar-50 file:px-3 file:py-2 file:font-semibold file:text-belajar-700" />
            <p className="mt-2 text-sm text-slate-500">Maksimal 2 MB. Header harus tepat: nama,nis,kelas.</p>
          </div>
          <Button variant="outline" onClick={previewCsv} loading={previewLoading} disabled={!csvFile || importLoading}>Pratinjau CSV</Button>
          <Button onClick={importCsv} loading={importLoading} disabled={!preview?.summary?.valid_rows || previewLoading}>Impor baris valid</Button>
        </div>
        {preview && <div className="mt-5 space-y-3 border-t border-slate-100 pt-5">
          <div className="flex flex-wrap gap-2">
            <span className="text-sm tabular-nums text-ink-muted">Total {preview.summary.total_rows.toLocaleString('id-ID')} baris</span>
            <Badge variant="green">Valid {preview.summary.valid_rows}</Badge>
            <Badge variant={preview.summary.invalid_rows ? 'red' : 'green'}>Gagal {preview.summary.invalid_rows}</Badge>
          </div>
          <div className="overflow-x-auto rounded-xl border border-slate-200">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-slate-50 text-slate-600"><tr><th className="px-3 py-3">Baris</th><th className="px-3 py-3">Nama</th><th className="px-3 py-3">NIS</th><th className="px-3 py-3">Kelas</th><th className="px-3 py-3">Status / alasan</th></tr></thead>
              <tbody className="divide-y divide-slate-100">{preview.rows.map((row) => <tr key={row.row}>
                <td className="px-3 py-3">{row.row}</td><td className="px-3 py-3">{row.nama || '—'}</td><td className="px-3 py-3">{row.nis || '—'}</td><td className="px-3 py-3">{row.kelas || '—'}</td>
                <td className="min-w-56 px-3 py-3">{row.valid ? <Badge variant="green">Valid</Badge> : <span className="inline-block rounded px-2 py-1 text-ink" style={{ backgroundColor: "rgba(255,216,77,.38)" }}>{row.reason}</span>}</td>
              </tr>)}</tbody>
            </table>
          </div>
        </div>}
        {importResult && <div className="mt-5 rounded-xl border border-slate-200 bg-slate-50 p-4">
          <div className="flex flex-wrap gap-2"><Badge variant="green">Berhasil {importResult.summary.imported}</Badge><Badge variant={importResult.summary.failed ? 'yellow' : 'green'}>Gagal {importResult.summary.failed}</Badge></div>
          {importResult.failed_rows?.length > 0 && <div className="mt-3 space-y-2 text-sm text-rose-700">{importResult.failed_rows.map((row) => <p key={`${row.row}-${row.nis}`}>Baris {row.row} (NIS {row.nis || 'kosong'}): {row.reason}</p>)}</div>}
        </div>}
      </Card>

      {credentials?.length > 0 && <Card title="Akun awal siswa" description="Password hanya ditampilkan pada proses ini. Simpan dan bagikan melalui saluran yang aman.">
        <div className="flex justify-end"><Button size="sm" variant="outline" onClick={copyCredentials}>Salin seluruh akun</Button></div>
        <div className="mt-3 overflow-x-auto rounded-xl border border-slate-200"><table className="min-w-full text-left text-sm"><thead className="bg-slate-50 text-slate-600"><tr><th className="px-3 py-3">Nama</th><th className="px-3 py-3">NIS</th><th className="px-3 py-3">Username</th><th className="px-3 py-3">Password awal</th></tr></thead><tbody className="divide-y divide-slate-100">{credentials.map((item) => <tr key={`${item.nis}-${item.username}`}><td className="px-3 py-3">{item.nama}</td><td className="px-3 py-3">{item.nis}</td><td className="px-3 py-3 font-semibold">{item.username}</td><td className="px-3 py-3 font-mono">{item.password}</td></tr>)}</tbody></table></div>
        <div className="mt-3 flex justify-end"><Button size="sm" variant="ghost" onClick={() => setCredentials(null)}>Tutup informasi password</Button></div>
      </Card>}

      <Card>
        <form className="grid grid-cols-1 gap-3 md:grid-cols-[minmax(0,1fr)_15rem_auto] md:items-end" onSubmit={(event) => { event.preventDefault(); setPage(1); setSearch(searchInput.trim()) }}>
          <Input label="Cari siswa" value={searchInput} onChange={(event) => setSearchInput(event.target.value)} placeholder="Nama, NIS, atau kelas" />
          <Select label="Filter kelas" value={kelasFilter} onChange={(event) => { setKelasFilter(event.target.value); setPage(1) }} options={[{ value: '', label: 'Semua kelas' }, ...classOptions]} placeholder={null} />
          <div className="flex gap-2"><Button type="submit" className="flex-1 md:flex-none">Cari</Button><Button type="button" variant="outline" onClick={() => { setSearchInput(''); setSearch(''); setKelasFilter(''); setPage(1) }}>Reset</Button></div>
        </form>
      </Card>

      {loadError && <Card className="border-rose-200 bg-rose-50"><div className="flex flex-wrap items-center justify-between gap-3"><p className="text-base text-rose-800">{loadError}</p><Button size="sm" variant="outline" onClick={() => setRefreshKey((value) => value + 1)}>Coba lagi</Button></div></Card>}

      <Card padding="p-0" className="overflow-hidden">
        <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-4 py-4 sm:px-5"><h2 className="text-lg font-bold text-slate-900">Daftar siswa</h2><span className="text-sm tabular-nums text-ink-muted">{total.toLocaleString('id-ID')} siswa</span></div>
        <div className="p-3 sm:p-5">
          {loading ? <div className="flex min-h-48 items-center justify-center"><LoadingSpinner label="Memuat daftar siswa…" /></div>
            : students.length ? <Table columns={columns} data={students} caption="Daftar siswa dan kelas" />
              : <EmptyState title={search || kelasFilter ? 'Siswa tidak ditemukan' : 'Belum ada data siswa'} description={search || kelasFilter ? 'Ubah kata kunci atau filter kelas.' : 'Tambahkan siswa satu per satu atau gunakan impor CSV.'} actionLabel={search || kelasFilter ? 'Reset pencarian' : (classes.length ? 'Tambah siswa' : undefined)} onAction={search || kelasFilter ? () => { setSearchInput(''); setSearch(''); setKelasFilter(''); setPage(1) } : openCreate} />}
        </div>
        {!loading && total > 0 && <div className="border-t border-slate-100 px-4 py-4 sm:px-5"><Pagination page={page} totalPages={lastPage} onPageChange={setPage} /></div>}
      </Card>

      <Modal open={formOpen} onClose={() => !saving && setFormOpen(false)} title={editingStudent ? 'Ubah data siswa' : 'Tambah siswa'} description="Data yang disimpan hanya nama, NIS, dan kelas.">
        <form onSubmit={submitForm} className="space-y-4">
          <Input label="Nama lengkap" value={form.nama} onChange={(event) => updateField('nama', event.target.value)} error={formErrors.nama?.[0]} required placeholder="Nama siswa" />
          <Input label="NIS" value={form.nis} onChange={(event) => updateField('nis', event.target.value)} error={formErrors.nis?.[0]} required placeholder="Nomor Induk Siswa" />
          <Select label="Kelas" value={form.kelas_id} onChange={(event) => updateField('kelas_id', event.target.value)} error={formErrors.kelas_id?.[0]} options={classOptions} placeholder="Pilih kelas" required />
          {!editingStudent && <p className="rounded-xl bg-belajar-50 px-4 py-3 text-sm leading-6 text-belajar-800">Username dibuat otomatis dari NIS. Password awal dibuat acak dan wajib diganti saat siswa pertama kali masuk.</p>}
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end"><Button type="button" variant="outline" onClick={() => setFormOpen(false)} disabled={saving}>Batal</Button><Button type="submit" loading={saving}>{editingStudent ? 'Simpan perubahan' : 'Tambah siswa'}</Button></div>
        </form>
      </Modal>

      <ConfirmDialog open={Boolean(deleteTarget)} onClose={() => setDeleteTarget(null)} onConfirm={deleteStudent} loading={deleteLoading} title="Hapus akun siswa?" description={`Akun ${deleteTarget?.nama || ''} akan dinonaktifkan dan dihapus secara soft delete. Data riwayat siswa tetap dipertahankan.`} confirmLabel="Ya, hapus siswa" />
    </div>
  )
}
