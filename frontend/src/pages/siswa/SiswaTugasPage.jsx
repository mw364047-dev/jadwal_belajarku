import { useCallback, useEffect, useMemo, useState } from 'react'
import { useAuth } from '../../context/AuthContext.jsx'
import { api } from '../../services/api.js'
import { useToast } from '../../components/ToastProvider.jsx'
import { Badge, Button, Card, ConfirmDialog, EmptyState, Input, LoadingSpinner, Modal, Select, Table } from '../../components/index.js'

const EMPTY_FORM = {
  mata_pelajaran: '',
  judul: '',
  tenggat: '',
  durasi_menit: '30',
  prioritas: 'sedang',
  status: 'belum',
}

const PRIORITY_RANK = { tinggi: 1, sedang: 2, rendah: 3 }
const STATUS_RANK = { belum: 1, proses: 2, selesai: 3 }

function readDraft(storageKey) {
  if (typeof window === 'undefined') return null

  // sessionStorage dipakai untuk pemulihan di tab yang sama; localStorage menjadi
  // cadangan berumur 24 jam agar draf masih dapat dipulihkan setelah tab ditutup.
  let raw = null
  try { raw = window.sessionStorage.getItem(storageKey) } catch { /* storage mungkin diblokir */ }
  if (!raw) {
    try { raw = window.localStorage.getItem(storageKey) } catch { /* storage mungkin diblokir */ }
  }
  if (!raw) return null

  try {
    const draft = JSON.parse(raw)
    if (!draft || typeof draft !== 'object' || !draft.form) return null

    const savedAt = Date.parse(draft.savedAt || '')
    if (Number.isFinite(savedAt) && Date.now() - savedAt > 24 * 60 * 60 * 1000) {
      try { window.sessionStorage.removeItem(storageKey) } catch { /* abaikan */ }
      try { window.localStorage.removeItem(storageKey) } catch { /* abaikan */ }
      return null
    }

    try { window.sessionStorage.setItem(storageKey, raw) } catch { /* pemulihan tetap bisa memakai objek draft */ }
    return draft
  } catch {
    return null
  }
}

function errorMessage(error, fallback = 'Belum berhasil memproses tugas. Coba lagi, ya.') {
  const errors = error?.response?.data?.errors
  if (errors) {
    const first = Object.values(errors).flat()?.[0]
    if (first) return first
  }
  return error?.response?.data?.message || fallback
}

function compareDeadline(a, b) {
  if (!a.tenggat && !b.tenggat) return 0
  if (!a.tenggat) return 1
  if (!b.tenggat) return -1
  return a.tenggat.localeCompare(b.tenggat)
}

function formatDate(value) {
  if (!value) return 'Belum ditentukan'
  const date = new Date(`${value}T00:00:00`)
  if (Number.isNaN(date.getTime())) return value
  return new Intl.DateTimeFormat('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }).format(date)
}

function priorityVariant(priority) {
  if (priority === 'tinggi') return 'red'
  if (priority === 'sedang') return 'yellow'
  return 'blue'
}

function statusVariant(status) {
  if (status === 'selesai') return 'green'
  if (status === 'proses') return 'blue'
  return 'default'
}

function statusLabel(status) {
  return ({ belum: 'Belum dikerjakan', proses: 'Sedang dikerjakan', selesai: 'Selesai' })[status] || status
}

export default function SiswaTugasPage() {
  const { user } = useAuth()
  const { showToast } = useToast()
  const draftKey = `jadwal-belajarku:tugas:draft:${user?.id || 'siswa'}`

  const [tasks, setTasks] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [refreshKey, setRefreshKey] = useState(0)
  const [sortMode, setSortMode] = useState('saran')

  const [formOpen, setFormOpen] = useState(false)
  const [editingTask, setEditingTask] = useState(null)
  const [form, setForm] = useState(() => readDraft(draftKey)?.form || EMPTY_FORM)
  const [formErrors, setFormErrors] = useState({})
  const [saving, setSaving] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [deleting, setDeleting] = useState(false)
  const [updatingTaskId, setUpdatingTaskId] = useState(null)

  const loadTasks = useCallback(async () => {
    setLoading(true)
    setLoadError('')
    try {
      const response = await api.get('/api/siswa/tugas')
      setTasks(Array.isArray(response.data?.data) ? response.data.data : [])
    } catch (error) {
      setLoadError(errorMessage(error, 'Daftar tugas belum dapat dimuat. Periksa koneksi lalu coba lagi.'))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { loadTasks() }, [loadTasks, refreshKey])

  // Draf disimpan selama tab/sesi browser masih terbuka dan dipisahkan per akun siswa.
  useEffect(() => {
    if (!formOpen || typeof window === 'undefined') return
    try {
      const draft = JSON.stringify({
        mode: editingTask ? 'edit' : 'create',
        taskId: editingTask?.id || null,
        form,
        savedAt: new Date().toISOString(),
      })
      try { window.sessionStorage.setItem(draftKey, draft) } catch { /* lanjutkan ke cadangan */ }
      try { window.localStorage.setItem(draftKey, draft) } catch { /* formulir tetap dapat digunakan */ }
    } catch {
      // Form tetap dapat digunakan meski penyimpanan sesi diblokir browser.
    }
  }, [draftKey, editingTask, form, formOpen])

  const sortedTasks = useMemo(() => {
    const items = [...tasks]
    if (sortMode === 'prioritas') {
      return items.sort((a, b) => PRIORITY_RANK[a.prioritas] - PRIORITY_RANK[b.prioritas] || compareDeadline(a, b))
    }
    if (sortMode === 'status') {
      return items.sort((a, b) => STATUS_RANK[a.status] - STATUS_RANK[b.status] || compareDeadline(a, b))
    }
    if (sortMode === 'tenggat') {
      return items.sort(compareDeadline)
    }
    // Saran urutan: tenggat paling dekat, lalu prioritas tertinggi.
    return items.sort((a, b) => compareDeadline(a, b) || PRIORITY_RANK[a.prioritas] - PRIORITY_RANK[b.prioritas])
  }, [tasks, sortMode])

  const summary = useMemo(() => ({
    total: tasks.length,
    belum: tasks.filter((task) => task.status === 'belum').length,
    proses: tasks.filter((task) => task.status === 'proses').length,
    selesai: tasks.filter((task) => task.status === 'selesai').length,
  }), [tasks])

  function openCreate() {
    const draft = readDraft(draftKey)
    const draftForm = draft?.mode === 'create' ? draft.form : EMPTY_FORM
    setEditingTask(null)
    setForm({ ...EMPTY_FORM, ...draftForm })
    setFormErrors({})
    setFormOpen(true)
  }

  function openEdit(task) {
    const draft = readDraft(draftKey)
    const savedForm = draft?.mode === 'edit' && Number(draft.taskId) === Number(task.id)
      ? draft.form
      : {
          mata_pelajaran: task.mata_pelajaran || '',
          judul: task.judul || '',
          tenggat: task.tenggat || '',
          durasi_menit: String(task.durasi_menit || 30),
          prioritas: task.prioritas || 'sedang',
          status: task.status || 'belum',
        }
    setEditingTask(task)
    setForm({ ...EMPTY_FORM, ...savedForm })
    setFormErrors({})
    setFormOpen(true)
  }

  function updateField(field, value) {
    setForm((current) => ({ ...current, [field]: value }))
    setFormErrors((current) => ({ ...current, [field]: undefined }))
  }

  // Jaga referensi callback tetap stabil selama siswa mengetik.
  // Modal menggunakan onClose dalam dependency effect; callback baru pada
  // setiap render akan menjalankan cleanup yang mengembalikan fokus ke tombol
  // pembuka, sehingga input hanya menerima satu karakter setiap kali.
  const closeForm = useCallback(() => {
    if (saving) return
    setFormOpen(false)
    setFormErrors({})
  }, [saving])

  async function submitForm(event) {
    event.preventDefault()
    setSaving(true)
    setFormErrors({})
    const payload = {
      mata_pelajaran: form.mata_pelajaran.trim(),
      judul: form.judul.trim(),
      tenggat: form.tenggat || null,
      durasi_menit: Number(form.durasi_menit),
      prioritas: form.prioritas,
      status: form.status,
    }

    try {
      if (editingTask) {
        await api.put(`/api/siswa/tugas/${editingTask.id}`, payload)
        showToast('Perubahan tugas berhasil disimpan.')
      } else {
        await api.post('/api/siswa/tugas', payload)
        showToast('Tugas berhasil ditambahkan. Semangat menyelesaikannya!')
      }
      if (typeof window !== 'undefined') {
        try { window.sessionStorage.removeItem(draftKey) } catch { /* abaikan */ }
        try { window.localStorage.removeItem(draftKey) } catch { /* abaikan */ }
      }
      setForm(EMPTY_FORM)
      setFormOpen(false)
      setEditingTask(null)
      setRefreshKey((value) => value + 1)
    } catch (error) {
      if (error.response?.status === 422 && error.response.data?.errors) {
        setFormErrors(error.response.data.errors)
        showToast(errorMessage(error), { variant: 'danger', title: 'Periksa kembali isian' })
      } else {
        showToast(errorMessage(error), { variant: 'danger', title: 'Tugas belum tersimpan' })
      }
    } finally {
      setSaving(false)
    }
  }

  async function markAsComplete(task) {
    setUpdatingTaskId(task.id)
    try {
      await api.patch(`/api/siswa/tugas/${task.id}`, { status: 'selesai' })
      showToast('Tugas ditandai selesai. Terima kasih sudah berusaha!')
      setRefreshKey((value) => value + 1)
    } catch (error) {
      showToast(errorMessage(error, 'Status tugas belum berhasil diperbarui.'), { variant: 'danger', title: 'Belum berhasil' })
    } finally {
      setUpdatingTaskId(null)
    }
  }

  async function deleteTask() {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      await api.delete(`/api/siswa/tugas/${deleteTarget.id}`)
      showToast('Tugas berhasil dihapus dari daftar.')
      setDeleteTarget(null)
      setRefreshKey((value) => value + 1)
    } catch (error) {
      showToast(errorMessage(error, 'Tugas belum dapat dihapus. Silakan coba lagi.'), { variant: 'danger', title: 'Belum berhasil menghapus' })
    } finally {
      setDeleting(false)
    }
  }

  const columns = useMemo(() => [
    {
      key: 'task', header: 'Tugas', render: (task) => (
        <div className="min-w-48">
          <p className="font-bold text-slate-900">{task.judul}</p>
          <p className="mt-1 text-sm text-slate-500">{task.mata_pelajaran}</p>
        </div>
      ),
    },
    { key: 'tenggat', header: 'Tenggat', render: (task) => <span className="whitespace-nowrap">{formatDate(task.tenggat)}</span> },
    { key: 'durasi_menit', header: 'Durasi', render: (task) => `${task.durasi_menit} menit` },
    { key: 'prioritas', header: 'Prioritas', render: (task) => <Badge variant={priorityVariant(task.prioritas)}>{task.prioritas}</Badge> },
    { key: 'status', header: 'Status', render: (task) => <Badge variant={statusVariant(task.status)}>{statusLabel(task.status)}</Badge> },
    {
      key: 'actions', header: 'Aksi', render: (task) => (
        <div className="flex min-w-40 flex-wrap gap-2">
          <Button size="sm" variant="outline" onClick={() => openEdit(task)}>Ubah</Button>
          {task.status !== 'selesai' && <Button size="sm" variant="secondary" loading={updatingTaskId === task.id} disabled={Boolean(updatingTaskId)} onClick={() => markAsComplete(task)}>Selesai</Button>}
          <Button size="sm" variant="danger" onClick={() => setDeleteTarget(task)}>Hapus</Button>
        </div>
      ),
    },
  ], [updatingTaskId])

  return (
    <div className="space-y-6">
      <section className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-base font-semibold text-belajar-700">Latihan mengatur kegiatan belajar</p>
          <h1 className="mt-1 text-2xl font-extrabold tracking-tight text-slate-950 sm:text-3xl">Daftar Tugas</h1>
          <p className="mt-2 max-w-2xl text-base leading-6 text-slate-600">Catat tugas sekolah, perkirakan waktu pengerjaan, lalu pilih prioritas yang paling sesuai. Kamu bisa menyesuaikan rencanamu kapan saja.</p>
        </div>
        <Button onClick={openCreate}>＋ Tambah tugas</Button>
      </section>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Card padding="p-4"><p className="text-sm font-semibold text-slate-500">Semua tugas</p><p className="mt-1 text-2xl font-extrabold text-slate-900">{summary.total}</p></Card>
        <Card padding="p-4"><p className="text-sm font-semibold text-slate-500">Belum dikerjakan</p><p className="mt-1 text-2xl font-extrabold text-amber-700">{summary.belum}</p></Card>
        <Card padding="p-4"><p className="text-sm font-semibold text-slate-500">Sedang dikerjakan</p><p className="mt-1 text-2xl font-extrabold text-belajar-700">{summary.proses}</p></Card>
        <Card padding="p-4"><p className="text-sm font-semibold text-slate-500">Selesai</p><p className="mt-1 text-2xl font-extrabold text-emerald-700">{summary.selesai}</p></Card>
      </div>

      <Card>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-lg font-bold text-slate-900">Urutan tugas</h2>
            <p className="mt-1 text-base text-slate-600">Saran awal mendahulukan tenggat terdekat, lalu prioritas yang lebih tinggi.</p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
            <div className="sm:w-56">
              <Select label="Tampilkan berdasarkan" value={sortMode} onChange={(event) => setSortMode(event.target.value)} placeholder={null} options={[
                { value: 'saran', label: 'Saran urutan' },
                { value: 'tenggat', label: 'Tenggat terdekat' },
                { value: 'prioritas', label: 'Prioritas tertinggi' },
                { value: 'status', label: 'Status pengerjaan' },
              ]} />
            </div>
            <Button variant="outline" onClick={() => setSortMode('saran')}>↕ Saran Urutan</Button>
          </div>
        </div>
      </Card>

      {loadError && (
        <Card className="border-rose-200 bg-rose-50">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-base leading-6 text-rose-800">{loadError}</p>
            <Button size="sm" variant="outline" onClick={() => setRefreshKey((value) => value + 1)}>Coba lagi</Button>
          </div>
        </Card>
      )}

      <Card padding="p-0" className="overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-4 py-4 sm:px-5">
          <div><h2 className="text-lg font-bold text-slate-900">Tugas yang perlu kamu atur</h2><p className="mt-1 text-sm text-slate-500">Daftar ini hanya menampilkan tugas dari akunmu.</p></div>
          <Badge variant="blue">{tasks.length} tugas</Badge>
        </div>
        <div className="p-3 sm:p-5">
          {loading ? (
            <div className="flex min-h-48 items-center justify-center"><LoadingSpinner label="Memuat daftar tugas…" /></div>
          ) : loadError ? null : sortedTasks.length ? (
            <Table columns={columns} data={sortedTasks} caption="Daftar tugas pribadi siswa, urut berdasarkan pilihan siswa." />
          ) : (
            <EmptyState
              title="Belum ada tugas yang dicatat"
              description="Kamu bisa mulai dengan menambahkan satu tugas. Tidak perlu menyusun semuanya sekaligus."
              actionLabel="Tambah tugas pertama"
              onAction={openCreate}
              icon="✓"
            />
          )}
        </div>
      </Card>

      <Modal
        open={formOpen}
        onClose={closeForm}
        title={editingTask ? 'Ubah tugas' : 'Tambah tugas baru'}
        description="Isi informasi yang kamu perlukan. Draf formulir tersimpan otomatis selama sesi tab ini."
        size="lg"
      >
        <form onSubmit={submitForm} className="space-y-4">
          <Input label="Mata pelajaran" value={form.mata_pelajaran} onChange={(event) => updateField('mata_pelajaran', event.target.value)} error={formErrors.mata_pelajaran?.[0]} required maxLength={80} placeholder="Contoh: Matematika" />
          <Input label="Nama tugas" value={form.judul} onChange={(event) => updateField('judul', event.target.value)} error={formErrors.judul?.[0]} required maxLength={180} placeholder="Contoh: Latihan soal halaman 35" />
          <div className="grid gap-4 sm:grid-cols-2">
            <Input label="Tenggat" type="date" value={form.tenggat} onChange={(event) => updateField('tenggat', event.target.value)} error={formErrors.tenggat?.[0]} helperText="Boleh dikosongkan jika belum ada tenggat." />
            <Input label="Perkiraan durasi (menit)" type="number" min="5" max="240" step="1" value={form.durasi_menit} onChange={(event) => updateField('durasi_menit', event.target.value)} error={formErrors.durasi_menit?.[0]} required helperText="Masukkan 5 sampai 240 menit." />
            <Select label="Prioritas" value={form.prioritas} onChange={(event) => updateField('prioritas', event.target.value)} error={formErrors.prioritas?.[0]} required placeholder={null} options={[
              { value: 'tinggi', label: 'Tinggi' },
              { value: 'sedang', label: 'Sedang' },
              { value: 'rendah', label: 'Rendah' },
            ]} />
            <Select label="Status pengerjaan" value={form.status} onChange={(event) => updateField('status', event.target.value)} error={formErrors.status?.[0]} required placeholder={null} options={[
              { value: 'belum', label: 'Belum dikerjakan' },
              { value: 'proses', label: 'Sedang dikerjakan' },
              { value: 'selesai', label: 'Selesai' },
            ]} />
          </div>
          <div className="flex flex-col-reverse gap-2 border-t border-slate-100 pt-4 sm:flex-row sm:justify-end">
            <Button type="button" variant="outline" onClick={closeForm} disabled={saving}>Batal</Button>
            <Button type="submit" loading={saving}>{editingTask ? 'Simpan perubahan' : 'Simpan tugas'}</Button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onClose={() => !deleting && setDeleteTarget(null)}
        onConfirm={deleteTask}
        loading={deleting}
        title="Hapus tugas ini?"
        description={`Tugas “${deleteTarget?.judul || ''}” akan dihapus dari daftar tugasmu. Tindakan ini tidak dapat dibatalkan.`}
        confirmLabel="Ya, hapus tugas"
      />
    </div>
  )
}
