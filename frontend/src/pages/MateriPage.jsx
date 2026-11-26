import { useCallback, useEffect, useMemo, useState } from 'react'
import { useAuth } from '../context/AuthContext.jsx'
import { api } from '../services/api.js'
import { useToast } from '../components/ToastProvider.jsx'
import { Badge, Button, Card, ConfirmDialog, EmptyState, Input, LoadingSpinner, Modal, Textarea } from '../components/index.js'

const EMPTY_FORM = { judul: '', isi: '', urutan: '1' }

function getErrorMessage(error, fallback) {
  const errors = error?.response?.data?.errors
  if (errors) {
    const first = Object.values(errors).flat()?.[0]
    if (first) return first
  }
  return error?.response?.data?.message || fallback
}

function isExampleMaterial(materi) {
  return /contoh.*jadwal|jadwal.*contoh/i.test(materi?.judul || '')
}

export default function MateriPage() {
  const { user } = useAuth()
  const { showToast } = useToast()
  const canManage = ['admin', 'guru_bk'].includes(user?.role)
  const canDelete = user?.role === 'admin'

  const [materi, setMateri] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [saving, setSaving] = useState(false)
  const [editorOpen, setEditorOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [formError, setFormError] = useState('')
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [deleting, setDeleting] = useState(false)

  const sortedMateri = useMemo(() => [...materi].sort((a, b) => (a.urutan ?? 0) - (b.urutan ?? 0) || a.id - b.id), [materi])

  const loadMateri = useCallback(async () => {
    setLoading(true)
    setLoadError('')
    try {
      const response = await api.get('/api/materi')
      setMateri(Array.isArray(response.data?.data) ? response.data.data : [])
    } catch (error) {
      setLoadError(getErrorMessage(error, 'Materi belum dapat dimuat. Periksa koneksi lalu coba lagi.'))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { loadMateri() }, [loadMateri])

  const closeEditor = useCallback(() => {
    if (saving) return
    setEditorOpen(false)
    setFormError('')
  }, [saving])

  function openCreate() {
    setEditing(null)
    setForm({ ...EMPTY_FORM, urutan: String((materi.length || 0) + 1) })
    setFormError('')
    setEditorOpen(true)
  }

  function openEdit(item) {
    setEditing(item)
    setForm({ judul: item.judul || '', isi: item.isi || '', urutan: String(item.urutan ?? 0) })
    setFormError('')
    setEditorOpen(true)
  }

  function updateField(field, value) {
    setForm((current) => ({ ...current, [field]: value }))
    setFormError('')
  }

  async function submitForm(event) {
    event.preventDefault()
    setSaving(true)
    setFormError('')
    const payload = {
      judul: form.judul.trim(),
      isi: form.isi.trim(),
      urutan: Number(form.urutan || 0),
    }

    try {
      if (editing) {
        await api.put(`/api/admin/materi/${editing.id}`, payload)
        showToast('Perubahan materi berhasil disimpan.')
      } else {
        await api.post('/api/admin/materi', payload)
        showToast('Materi baru berhasil ditambahkan.')
      }
      setEditorOpen(false)
      setEditing(null)
      setForm(EMPTY_FORM)
      await loadMateri()
    } catch (error) {
      setFormError(getErrorMessage(error, 'Materi belum berhasil disimpan. Periksa kembali isianmu, lalu coba lagi.'))
    } finally {
      setSaving(false)
    }
  }

  async function confirmDelete() {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      await api.delete(`/api/admin/materi/${deleteTarget.id}`)
      showToast('Materi berhasil dihapus.')
      setDeleteTarget(null)
      await loadMateri()
    } catch (error) {
      showToast(getErrorMessage(error, 'Materi belum dapat dihapus. Coba lagi.'), { variant: 'danger' })
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-belajar-100 bg-gradient-to-br from-white via-white to-belajar-50 p-5 shadow-soft sm:p-7">
        <Badge variant="blue">Panduan belajar</Badge>
        <h1 className="mt-3 text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl">Materi Singkat</h1>
        <p className="mt-2 max-w-3xl text-base leading-7 text-slate-600">Ikuti langkah kecil untuk menyusun rencana belajar. Kamu dapat menyesuaikan contoh dengan waktu dan kegiatanmu sendiri.</p>
        {canManage && <div className="mt-5"><Button onClick={openCreate}>Tambah materi</Button></div>}
      </section>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {[
          ['1', 'Buat rencana', 'Catat tugas dan kegiatan yang perlu dilakukan.'],
          ['2', 'Pilih prioritas', 'Perhatikan tenggat dan hal yang perlu diselesaikan lebih dahulu.'],
          ['3', 'Perkirakan waktu', 'Sisihkan waktu yang masuk akal dan jangan lupa jeda.'],
        ].map(([number, title, description]) => (
          <Card key={number} className="h-full">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-belajar-50 text-lg font-bold text-belajar-700">{number}</span>
            <h2 className="mt-3 text-lg font-bold text-slate-900">{title}</h2>
            <p className="mt-1 text-base leading-6 text-slate-600">{description}</p>
          </Card>
        ))}
      </div>

      <section className="space-y-4" aria-label="Daftar materi">
        <div>
          <h2 className="text-xl font-bold text-slate-950">Baca materi</h2>
          <p className="mt-1 text-base text-slate-600">Pilih dan baca sesuai kebutuhanmu. Kamu boleh kembali ke materi kapan saja.</p>
        </div>
        {loading ? <LoadingSpinner label="Memuat materi belajar…" /> : loadError ? (
          <Card><p className="text-base text-rose-700" role="alert">{loadError}</p><Button className="mt-4" variant="outline" onClick={loadMateri}>Coba lagi</Button></Card>
        ) : sortedMateri.length === 0 ? (
          <EmptyState title="Materi belum tersedia" description="Materi belajar akan muncul di halaman ini setelah ditambahkan oleh admin atau Guru BK." />
        ) : (
          <div className="grid gap-4 lg:grid-cols-2">
            {sortedMateri.map((item, index) => {
              const example = isExampleMaterial(item)
              return (
                <Card key={item.id} className="h-full">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="flex flex-wrap items-center gap-2">
                      {example
                        ? <Badge variant="yellow">Contoh, bukan aturan wajib</Badge>
                        : (Number(item.urutan || index + 1) <= 3
                          ? <Badge variant="blue">Langkah {item.urutan || index + 1}</Badge>
                          : <Badge variant="default">Panduan tambahan</Badge>)}
                    </div>
                    {canManage && <div className="flex items-center gap-2"><Button size="sm" variant="outline" onClick={() => openEdit(item)}>Ubah</Button>{canDelete && <Button size="sm" variant="danger" onClick={() => setDeleteTarget(item)}>Hapus</Button>}</div>}
                  </div>
                  <h3 className="mt-3 text-lg font-bold text-slate-900">{item.judul}</h3>
                  {/* React merender isi sebagai teks biasa dan melakukan escaping otomatis. */}
                  <p className="mt-3 whitespace-pre-line break-words text-base leading-7 text-slate-700">{String(item.isi ?? '')}</p>
                </Card>
              )
            })}
          </div>
        )}
      </section>

      <Modal open={editorOpen} onClose={closeEditor} title={editing ? 'Ubah materi' : 'Tambah materi'} description="Gunakan kalimat sederhana dan isi materi dalam bentuk teks. HTML tidak diperlukan." size="lg">
        <form onSubmit={submitForm} className="space-y-4">
          {formError && <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-base text-rose-800" role="alert">{formError}</div>}
          <Input label="Judul materi" required maxLength={180} value={form.judul} onChange={(event) => updateField('judul', event.target.value)} placeholder="Contoh: Menentukan prioritas tugas" />
          <Input label="Urutan tampil" type="number" min="0" max="65535" value={form.urutan} onChange={(event) => updateField('urutan', event.target.value)} helperText="Angka lebih kecil akan ditampilkan lebih dahulu." />
          <Textarea label="Isi materi" required rows={9} maxLength={30000} value={form.isi} onChange={(event) => updateField('isi', event.target.value)} placeholder="Tuliskan penjelasan dengan bahasa yang mudah dipahami siswa kelas VIII…" helperText="Gunakan baris baru untuk memisahkan paragraf atau contoh jadwal." />
          <div className="flex flex-col-reverse gap-2 border-t border-slate-100 pt-4 sm:flex-row sm:justify-end">
            <Button type="button" variant="outline" onClick={closeEditor} disabled={saving}>Batal</Button>
            <Button type="submit" loading={saving}>{editing ? 'Simpan perubahan' : 'Simpan materi'}</Button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onClose={() => !deleting && setDeleteTarget(null)}
        onConfirm={confirmDelete}
        loading={deleting}
        title="Hapus materi?"
        description={deleteTarget ? `Materi “${deleteTarget.judul}” akan dihapus dari daftar. Tindakan ini tidak dapat dibatalkan.` : ''}
        confirmLabel="Ya, hapus materi"
      />
    </div>
  )
}
