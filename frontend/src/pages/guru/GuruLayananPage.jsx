import { useCallback, useEffect, useMemo, useState } from 'react'
import { api } from '../../services/api.js'
import {
  Badge, Button, Card, ConfirmDialog, EmptyState, Input, LoadingSpinner,
  Modal, Pagination, Select, Table, Textarea,
} from '../../components/index.js'
import { useToast } from '../../components/ToastProvider.jsx'

const serviceTypes = [
  { value: 'klasikal', label: 'Klasikal' },
  { value: 'kelompok', label: 'Kelompok' },
  { value: 'individual', label: 'Individual' },
  { value: 'informasi', label: 'Informasi' },
  { value: 'tindak_lanjut', label: 'Tindak lanjut' },
]

const emptyForm = {
  jenis_layanan: 'individual',
  target_type: 'siswa',
  siswa_id: '',
  kelas_id: '',
  tanggal: new Date().toISOString().slice(0, 10),
  topik: '',
  tindak_lanjut: '',
}

function formatDate(value) {
  if (!value) return '—'
  const date = new Date(`${value}T00:00:00`)
  return Number.isNaN(date.getTime()) ? value : new Intl.DateTimeFormat('id-ID', { dateStyle: 'medium' }).format(date)
}

function formatMonth(value) {
  if (!value) return '—'
  const [year, month] = value.split('-').map(Number)
  return new Intl.DateTimeFormat('id-ID', { month: 'long', year: 'numeric' }).format(new Date(year, month - 1, 1))
}

function serviceLabel(value) {
  return serviceTypes.find((item) => item.value === value)?.label || value || '—'
}

function errorText(error) {
  const errors = error?.response?.data?.errors
  if (errors && typeof errors === 'object') {
    const first = Object.values(errors).flat().find(Boolean)
    if (first) return first
  }
  return error?.response?.data?.message || 'Permintaan belum berhasil. Periksa kembali data dan coba lagi.'
}

export default function GuruLayananPage() {
  const { showToast } = useToast()
  const [items, setItems] = useState([])
  const [options, setOptions] = useState({ siswa: [], kelas: [], tahun_ajaran: '' })
  const [recap, setRecap] = useState({ total: 0, per_jenis: [], per_bulan: [] })
  const [filters, setFilters] = useState({ jenis_layanan: '', tanggal_mulai: '', tanggal_selesai: '' })
  const [applied, setApplied] = useState({ jenis_layanan: '', tanggal_mulai: '', tanggal_selesai: '' })
  const [page, setPage] = useState(1)
  const [lastPage, setLastPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [optionsLoading, setOptionsLoading] = useState(true)
  const [error, setError] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [deleting, setDeleting] = useState(false)

  const closeModal = useCallback(() => {
    if (saving) return
    setModalOpen(false)
    setEditing(null)
    setForm(emptyForm)
  }, [saving])

  const loadOptions = useCallback(async () => {
    setOptionsLoading(true)
    try {
      const response = await api.get('/api/guru/layanan/options')
      setOptions({
        siswa: response.data?.siswa || [],
        kelas: response.data?.kelas || [],
        tahun_ajaran: response.data?.tahun_ajaran || '',
      })
    } catch (requestError) {
      showToast(errorText(requestError), { variant: 'warning' })
    } finally {
      setOptionsLoading(false)
    }
  }, [showToast])

  const loadData = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const [listResponse, recapResponse] = await Promise.all([
        api.get('/api/guru/layanan', { params: { ...applied, page, per_page: 10 } }),
        api.get('/api/guru/layanan/rekap', { params: applied }),
      ])
      setItems(listResponse.data?.data || [])
      setLastPage(listResponse.data?.last_page || 1)
      setTotal(listResponse.data?.total || 0)
      setRecap(recapResponse.data || { total: 0, per_jenis: [], per_bulan: [] })
    } catch (requestError) {
      setError(errorText(requestError))
    } finally {
      setLoading(false)
    }
  }, [applied, page])

  useEffect(() => { loadOptions() }, [loadOptions])
  useEffect(() => { loadData() }, [loadData])

  const classOptions = useMemo(() => options.kelas.map((item) => ({
    value: String(item.id),
    label: `${item.nama_kelas} · ${item.tahun_ajaran}`,
  })), [options.kelas])

  const studentOptions = useMemo(() => options.siswa.map((item) => ({
    value: String(item.id),
    label: `${item.nama} · ${item.nis}${item.kelas ? ` · ${item.kelas}` : ''}`,
  })), [options.siswa])

  function openCreate() {
    setEditing(null)
    setForm({ ...emptyForm, tanggal: new Date().toISOString().slice(0, 10) })
    setModalOpen(true)
  }

  function openEdit(item) {
    setEditing(item)
    setForm({
      jenis_layanan: item.jenis_layanan,
      target_type: item.siswa_id ? 'siswa' : 'kelas',
      siswa_id: item.siswa_id ? String(item.siswa_id) : '',
      kelas_id: item.siswa_id ? '' : (item.kelas_id ? String(item.kelas_id) : ''),
      tanggal: item.tanggal || '',
      topik: item.topik || '',
      tindak_lanjut: item.tindak_lanjut || '',
    })
    setModalOpen(true)
  }

  function updateForm(key, value) {
    setForm((current) => {
      const next = { ...current, [key]: value }
      if (key === 'jenis_layanan' && value === 'klasikal') {
        next.target_type = 'kelas'
        next.siswa_id = ''
      }
      if (key === 'target_type') {
        next.siswa_id = ''
        next.kelas_id = ''
      }
      return next
    })
  }

  async function submitForm(event) {
    event.preventDefault()
    setSaving(true)
    try {
      const payload = {
        jenis_layanan: form.jenis_layanan,
        siswa_id: form.target_type === 'siswa' ? Number(form.siswa_id) : null,
        kelas_id: form.target_type === 'kelas' ? Number(form.kelas_id) : null,
        tanggal: form.tanggal,
        topik: form.topik.trim(),
        tindak_lanjut: form.tindak_lanjut.trim() || null,
      }

      if (editing) {
        await api.put(`/api/guru/layanan/${editing.id}`, payload)
        showToast('Catatan layanan berhasil diperbarui.')
      } else {
        await api.post('/api/guru/layanan', payload)
        showToast('Catatan layanan berhasil disimpan.')
      }
      setModalOpen(false)
      setEditing(null)
      setForm(emptyForm)
      await loadData()
    } catch (requestError) {
      showToast(errorText(requestError), { variant: 'danger', duration: 6500 })
    } finally {
      setSaving(false)
    }
  }

  async function deleteRecord() {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      await api.delete(`/api/guru/layanan/${deleteTarget.id}`)
      showToast('Catatan layanan berhasil dihapus.')
      setDeleteTarget(null)
      await loadData()
    } catch (requestError) {
      showToast(errorText(requestError), { variant: 'danger' })
    } finally {
      setDeleting(false)
    }
  }

  function applyFilters(event) {
    event.preventDefault()
    setPage(1)
    setApplied({ ...filters })
  }

  function resetFilters() {
    const empty = { jenis_layanan: '', tanggal_mulai: '', tanggal_selesai: '' }
    setFilters(empty)
    setApplied(empty)
    setPage(1)
  }

  const columns = [
    { key: 'tanggal', header: 'Tanggal', render: (row) => formatDate(row.tanggal) },
    { key: 'jenis_layanan', header: 'Jenis', render: (row) => <Badge variant="blue">{serviceLabel(row.jenis_layanan)}</Badge> },
    { key: 'sasaran', header: 'Sasaran', render: (row) => <div><p className="font-semibold text-slate-900">{row.siswa?.nama || (row.kelas ? `Kelas ${row.kelas.nama_kelas}` : '—')}</p><p className="text-sm text-slate-500">{row.siswa ? `${row.siswa.kelas || row.kelas?.nama_kelas || 'Kelas belum tersedia'} · NIS ${row.siswa.nis}` : row.kelas?.tahun_ajaran || ''}</p></div> },
    { key: 'topik', header: 'Topik', render: (row) => <span className="line-clamp-2">{row.topik}</span> },
    { key: 'actions', header: 'Aksi', render: (row) => <div className="flex justify-end gap-2"><Button size="sm" variant="outline" onClick={() => openEdit(row)}>Ubah</Button><Button size="sm" variant="danger" onClick={() => setDeleteTarget(row)}>Hapus</Button></div> },
  ]

  return (
    <div className="space-y-6">
      <section className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <Badge variant="blue">Ruang Guru BK</Badge>
          <h1 className="mt-3 text-2xl font-bold tracking-tight text-slate-950">Catatan layanan BK</h1>
          <p className="mt-2 max-w-3xl text-base leading-6 text-slate-600">Catat layanan yang telah dilakukan dan tindak lanjut untuk membantu pendampingan siswa. Isi tindak lanjut hanya dapat dibaca oleh pembuat catatan.</p>
          {options.tahun_ajaran && <p className="mt-2 text-sm text-slate-500">Tahun ajaran berjalan: {options.tahun_ajaran}</p>}
        </div>
        <Button onClick={openCreate} disabled={optionsLoading || (!options.siswa.length && !options.kelas.length)}>Tambah catatan layanan</Button>
      </section>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        <Card><p className="text-sm font-semibold text-slate-500">Total catatan sesuai filter</p><p className="mt-2 text-3xl font-bold tabular-nums text-slate-950">{recap.total || 0}</p></Card>
        {recap.per_jenis?.map((item) => <Card key={item.jenis_layanan}><p className="text-sm font-semibold text-slate-500">{serviceLabel(item.jenis_layanan)}</p><p className="mt-2 text-3xl font-bold tabular-nums text-slate-950">{item.jumlah}</p></Card>)}
      </div>

      {recap.per_bulan?.length > 0 && <Card title="Ringkasan per bulan" description="Jumlah catatan layanan yang kamu buat pada setiap bulan."><div className="flex flex-wrap gap-2">{recap.per_bulan.slice(-6).map((item) => <div key={item.bulan} className="rounded-xl border border-slate-200 px-4 py-3"><p className="text-sm text-slate-500">{formatMonth(item.bulan)}</p><p className="mt-1 text-xl font-bold text-slate-900">{item.jumlah} layanan</p></div>)}</div></Card>}

      <Card title="Filter catatan" description="Pilih jenis layanan atau rentang tanggal untuk mempersempit daftar.">
        <form onSubmit={applyFilters} className="grid gap-4 md:grid-cols-3">
          <Select label="Jenis layanan" placeholder="Semua jenis layanan" value={filters.jenis_layanan} onChange={(event) => setFilters((current) => ({ ...current, jenis_layanan: event.target.value }))} options={serviceTypes} />
          <Input label="Tanggal mulai" type="date" value={filters.tanggal_mulai} max={filters.tanggal_selesai || undefined} onChange={(event) => setFilters((current) => ({ ...current, tanggal_mulai: event.target.value }))} />
          <Input label="Tanggal selesai" type="date" value={filters.tanggal_selesai} min={filters.tanggal_mulai || undefined} onChange={(event) => setFilters((current) => ({ ...current, tanggal_selesai: event.target.value }))} />
          <div className="flex items-end gap-2 md:col-span-3"><Button type="submit">Terapkan filter</Button><Button type="button" variant="outline" onClick={resetFilters}>Reset</Button></div>
        </form>
      </Card>

      <Card title="Daftar catatan layanan" description={`${total.toLocaleString('id-ID')} catatan ditemukan.`}>
        {error && <div className="mb-4 rounded-xl border border-rose-200 bg-rose-50 p-3 text-base text-rose-800" role="alert">{error}</div>}
        {loading ? <div className="flex justify-center py-10"><LoadingSpinner label="Memuat catatan layanan…" /></div> : (
          <>
            <Table columns={columns} data={items} emptyTitle="Belum ada catatan layanan" emptyDescription="Catatan yang kamu buat akan muncul di sini. Kamu dapat mulai mencatat layanan ketika sudah dilakukan." />
            <Pagination className="mt-5" page={page} totalPages={lastPage} onPageChange={setPage} />
          </>
        )}
      </Card>

      <Modal open={modalOpen} onClose={closeModal} title={editing ? 'Ubah catatan layanan' : 'Tambah catatan layanan'} description="Catat informasi layanan secara ringkas dan sesuai kebutuhan pendampingan." size="lg">
        <form onSubmit={submitForm} className="space-y-4">
          <Select label="Jenis layanan" required value={form.jenis_layanan} onChange={(event) => updateForm('jenis_layanan', event.target.value)} options={serviceTypes} placeholder="Pilih jenis layanan" />

          {form.jenis_layanan !== 'klasikal' && <Select label="Sasaran layanan" value={form.target_type} onChange={(event) => updateForm('target_type', event.target.value)} options={[{ value: 'siswa', label: 'Siswa binaan' }, { value: 'kelas', label: 'Kelas binaan' }]} placeholder="Pilih sasaran" />}

          {form.target_type === 'siswa' && form.jenis_layanan !== 'klasikal' ? (
            <Select label="Siswa binaan" required value={form.siswa_id} onChange={(event) => updateForm('siswa_id', event.target.value)} options={studentOptions} placeholder={optionsLoading ? 'Memuat siswa…' : 'Pilih siswa'} helperText="Hanya siswa yang ditugaskan kepadamu pada tahun ajaran berjalan yang tersedia." />
          ) : (
            <Select label="Kelas binaan" required value={form.kelas_id} onChange={(event) => updateForm('kelas_id', event.target.value)} options={classOptions} placeholder={optionsLoading ? 'Memuat kelas…' : 'Pilih kelas'} helperText="Kelas tersedia bila minimal satu siswa di kelas tersebut ditugaskan kepadamu pada tahun ajaran berjalan." />
          )}

          <Input label="Tanggal layanan" type="date" required value={form.tanggal} onChange={(event) => updateForm('tanggal', event.target.value)} />
          <Input label="Topik layanan" required maxLength={180} value={form.topik} onChange={(event) => updateForm('topik', event.target.value)} placeholder="Contoh: Strategi mengatur waktu belajar" />
          <Textarea label="Tindak lanjut" rows={4} value={form.tindak_lanjut} onChange={(event) => updateForm('tindak_lanjut', event.target.value)} placeholder="Tuliskan rencana tindak lanjut yang diperlukan…" helperText="Tindak lanjut disimpan terenkripsi dan hanya dapat dibaca oleh Guru BK pembuat catatan." />
          <div className="flex flex-col-reverse gap-2 border-t border-slate-100 pt-4 sm:flex-row sm:justify-end"><Button type="button" variant="outline" onClick={closeModal} disabled={saving}>Batal</Button><Button type="submit" loading={saving}>{editing ? 'Simpan perubahan' : 'Simpan catatan'}</Button></div>
        </form>
      </Modal>

      <ConfirmDialog open={Boolean(deleteTarget)} onClose={() => setDeleteTarget(null)} onConfirm={deleteRecord} loading={deleting} title="Hapus catatan layanan?" description="Catatan akan dihapus dari daftar aktif. Riwayat dihapus menggunakan soft delete." confirmLabel="Ya, hapus catatan" />
    </div>
  )
}
