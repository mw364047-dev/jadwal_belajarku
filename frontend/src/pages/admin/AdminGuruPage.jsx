import { useCallback, useEffect, useMemo, useState } from 'react'
import { api } from '../../services/api.js'
import { useToast } from '../../components/ToastProvider.jsx'
import {
  Button,
  Card,
  ConfirmDialog,
  EmptyState,
  Input,
  LoadingSpinner,
  Modal,
  Pagination,
  Select,
  Table,
} from '../../components/index.js'

const emptyForm = {
  nama: '',
  username: '',
  email: '',
  nip: '',
  jabatan: '',
}

function getErrorMessage(error, fallback = 'Terjadi kesalahan. Silakan coba lagi.') {
  const errors = error?.response?.data?.errors
  if (errors) {
    const firstError = Object.values(errors).flat()?.[0]
    if (firstError) return firstError
  }
  return error?.response?.data?.message || fallback
}

function formatDate(value) {
  if (!value) return 'Belum pernah masuk'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '—'
  return new Intl.DateTimeFormat('id-ID', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  }).format(date)
}

export default function AdminGuruPage() {
  const { showToast } = useToast()
  const [gurus, setGurus] = useState([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [lastPage, setLastPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [searchInput, setSearchInput] = useState('')
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('semua')
  const [refreshKey, setRefreshKey] = useState(0)
  const [loadError, setLoadError] = useState('')

  const [formOpen, setFormOpen] = useState(false)
  const [editingGuru, setEditingGuru] = useState(null)
  const [form, setForm] = useState(emptyForm)
  const [formErrors, setFormErrors] = useState({})
  const [saving, setSaving] = useState(false)

  const [confirmAction, setConfirmAction] = useState(null)
  const [confirmLoading, setConfirmLoading] = useState(false)
  const [credential, setCredential] = useState(null)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    let active = true

    async function loadGurus() {
      setLoading(true)
      setLoadError('')
      try {
        const response = await api.get('/api/admin/guru', {
          params: { search, status, page, per_page: 10 },
        })
        if (!active) return
        setGurus(response.data.data || [])
        setPage(response.data.current_page || 1)
        setLastPage(response.data.last_page || 1)
        setTotal(response.data.total || 0)
      } catch (error) {
        if (!active) return
        const message = getErrorMessage(error, 'Daftar guru BK belum dapat dimuat.')
        setLoadError(message)
        if (error.response?.status !== 401) {
          showToast(message, { variant: 'danger', title: 'Gagal memuat data' })
        }
      } finally {
        if (active) setLoading(false)
      }
    }

    loadGurus()
    return () => { active = false }
  }, [search, status, page, refreshKey, showToast])

  const columns = useMemo(() => [
    {
      key: 'nama',
      header: 'Guru BK',
      render: (guru) => (
        <div className="min-w-0">
          <p className="font-bold text-slate-900">{guru.nama}</p>
          <p className="mt-1 text-base text-slate-500">@{guru.username}</p>
        </div>
      ),
    },
    { key: 'email', header: 'Email', render: (guru) => guru.email || '—' },
    { key: 'nip', header: 'NIP', render: (guru) => guru.nip || '—' },
    { key: 'jabatan', header: 'Jabatan', render: (guru) => guru.jabatan || '—' },
    {
      key: 'status',
      header: 'Status akun',
      render: (guru) => (
        <span className={`inline-flex min-h-7 items-center gap-2 rounded-full px-3 py-1 text-base font-semibold ${guru.is_active ? 'bg-teal/10 text-teal' : 'bg-slate-100 text-slate-600'}`}><span className={`h-2 w-2 rounded-full ${guru.is_active ? 'bg-teal' : 'bg-slate-400'}`} aria-hidden="true" />{guru.is_active ? 'Aktif' : 'Nonaktif'}</span>
      ),
    },
    {
      key: 'last_login_at',
      header: 'Login terakhir',
      render: (guru) => <span className="whitespace-nowrap">{formatDate(guru.last_login_at)}</span>,
    },
    {
      key: 'actions',
      header: 'Aksi',
      render: (guru) => (
        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant="outline" onClick={() => openEdit(guru)}>Ubah</Button>
          <Button size="sm" variant="outline" onClick={() => setConfirmAction({ type: 'toggle', guru })}>
            {guru.is_active ? 'Nonaktifkan' : 'Aktifkan'}
          </Button>
          <Button size="sm" variant="outline" onClick={() => setConfirmAction({ type: 'reset', guru })}>Reset sandi</Button>
          <Button size="sm" variant="danger" onClick={() => setConfirmAction({ type: 'delete', guru })}>Hapus</Button>
        </div>
      ),
    },
  ], [])

  function openCreate() {
    setEditingGuru(null)
    setForm(emptyForm)
    setFormErrors({})
    setFormOpen(true)
  }

  function openEdit(guru) {
    setEditingGuru(guru)
    setForm({
      nama: guru.nama || '',
      username: guru.username || '',
      email: guru.email || '',
      nip: guru.nip || '',
      jabatan: guru.jabatan || '',
    })
    setFormErrors({})
    setFormOpen(true)
  }

  function closeForm() {
    if (saving) return
    setFormOpen(false)
    setEditingGuru(null)
    setFormErrors({})
  }

  function updateField(field, value) {
    setForm((current) => ({ ...current, [field]: value }))
    setFormErrors((current) => ({ ...current, [field]: undefined }))
  }

  async function handleSubmit(event) {
    event.preventDefault()
    setSaving(true)
    setFormErrors({})

    const payload = {
      nama: form.nama.trim(),
      username: form.username.trim(),
      email: form.email.trim() || null,
      nip: form.nip.trim() || null,
      jabatan: form.jabatan.trim() || null,
    }

    try {
      let response
      if (editingGuru) {
        response = await api.put(`/api/admin/guru/${editingGuru.id}`, payload)
        showToast('Perubahan data guru BK berhasil disimpan.')
      } else {
        response = await api.post('/api/admin/guru', payload)
        setCredential({
          nama: response.data.data?.nama || payload.nama,
          username: response.data.data?.username || payload.username,
          password: response.data.temporary_password,
          title: 'Akun guru BK berhasil dibuat',
        })
        setCopied(false)
        showToast('Akun guru BK berhasil ditambahkan.')
      }

      setFormOpen(false)
      setEditingGuru(null)
      setRefreshKey((value) => value + 1)
    } catch (error) {
      if (error.response?.status === 422 && error.response.data?.errors) {
        setFormErrors(error.response.data.errors)
      } else {
        showToast(getErrorMessage(error, 'Data guru BK belum berhasil disimpan.'), {
          variant: 'danger', title: 'Gagal menyimpan',
        })
      }
    } finally {
      setSaving(false)
    }
  }

  async function handleConfirmAction() {
    if (!confirmAction) return
    const { type, guru } = confirmAction
    setConfirmLoading(true)

    try {
      if (type === 'delete') {
        await api.delete(`/api/admin/guru/${guru.id}`)
        showToast('Akun guru BK berhasil dihapus.')
      } else if (type === 'toggle') {
        const response = await api.patch(`/api/admin/guru/${guru.id}/status`)
        showToast(response.data.message || 'Status akun berhasil diperbarui.')
      } else if (type === 'reset') {
        const response = await api.post(`/api/admin/users/${guru.user_id}/reset-password`)
        setCredential({
          nama: guru.nama,
          username: guru.username,
          password: response.data.temporary_password,
          title: 'Password sementara berhasil dibuat',
        })
        setCopied(false)
        showToast('Password sementara berhasil dibuat.')
      }

      setConfirmAction(null)
      setRefreshKey((value) => value + 1)
    } catch (error) {
      showToast(getErrorMessage(error, 'Tindakan belum berhasil dilakukan.'), {
        variant: 'danger', title: 'Tindakan gagal',
      })
    } finally {
      setConfirmLoading(false)
    }
  }

  async function copyTemporaryPassword() {
    if (!credential?.password) return
    try {
      await navigator.clipboard.writeText(credential.password)
      setCopied(true)
      showToast('Password sementara berhasil disalin.')
    } catch {
      showToast('Clipboard tidak tersedia. Silakan salin password secara manual.', { variant: 'warning' })
    }
  }

  const confirmDetails = useMemo(() => {
    if (!confirmAction) return null
    const { type, guru } = confirmAction
    if (type === 'delete') {
      return {
        title: 'Hapus akun guru BK?',
        description: `Akun ${guru.nama} akan dinonaktifkan dan dihapus secara soft delete. Riwayat terkait tetap dipertahankan.`,
        confirmLabel: 'Ya, hapus akun',
        danger: true,
      }
    }
    if (type === 'toggle') {
      return {
        title: guru.is_active ? 'Nonaktifkan akun guru?' : 'Aktifkan akun guru?',
        description: guru.is_active
          ? `Akun ${guru.nama} tidak dapat login selama dinonaktifkan.`
          : `Akun ${guru.nama} akan diizinkan login kembali.`,
        confirmLabel: guru.is_active ? 'Nonaktifkan' : 'Aktifkan',
        danger: guru.is_active,
      }
    }
    return {
      title: 'Reset password guru BK?',
      description: `Password akun ${guru.nama} akan diganti. Password sementara baru hanya ditampilkan satu kali dan guru wajib menggantinya saat login berikutnya.`,
      confirmLabel: 'Ya, reset password',
      danger: false,
    }
  }, [confirmAction])

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-base font-semibold text-belajar-700">Pengelolaan pengguna</p>
          <h1 className="mt-1 text-2xl font-extrabold tracking-tight text-slate-950 sm:text-3xl">Data Guru BK</h1>
          <p className="mt-2 max-w-2xl text-base leading-6 text-slate-600">
            Tambahkan akun guru Bimbingan dan Konseling, perbarui profil, atur status akun, dan reset password.
          </p>
        </div>
        <Button onClick={openCreate} leftIcon={<span aria-hidden="true">＋</span>} className="w-full sm:w-auto">Tambah guru BK</Button>
      </div>

      <Card className="space-y-4">
        <form
          className="grid grid-cols-1 gap-3 md:grid-cols-[minmax(0,1fr)_13rem_auto] md:items-end"
          onSubmit={(event) => { event.preventDefault(); setPage(1); setSearch(searchInput.trim()) }}
        >
          <Input
            label="Cari guru BK"
            value={searchInput}
            onChange={(event) => setSearchInput(event.target.value)}
            placeholder="Nama, username, email, NIP, atau jabatan"
          />
          <Select
            label="Filter status akun"
            value={status}
            onChange={(event) => { setStatus(event.target.value); setPage(1) }}
            options={[
              { value: 'semua', label: 'Semua status' },
              { value: 'aktif', label: 'Aktif' },
              { value: 'nonaktif', label: 'Nonaktif' },
            ]}
            placeholder={null}
          />
          <div className="flex gap-2">
            <Button type="submit" className="flex-1 md:flex-none">Cari</Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => { setSearchInput(''); setSearch(''); setStatus('semua'); setPage(1) }}
            >Reset</Button>
          </div>
        </form>
        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-4">
          <p className="text-base text-slate-600">
            {loading ? 'Memuat data guru BK…' : `Menampilkan ${gurus.length} dari ${total} guru BK`}
          </p>
          <Button size="sm" variant="ghost" onClick={() => setRefreshKey((value) => value + 1)} disabled={loading}>Muat ulang</Button>
        </div>
      </Card>

      {loadError && (
        <Card className="border-rose-200 bg-rose-50">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-base font-medium text-rose-800">{loadError}</p>
            <Button size="sm" variant="outline" onClick={() => setRefreshKey((value) => value + 1)}>Coba lagi</Button>
          </div>
        </Card>
      )}

      <Card padding="p-0" className="overflow-hidden">
        <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-4 py-4 sm:px-5">
          <h2 className="text-lg font-bold text-slate-900">Daftar guru BK</h2>
          <span className="text-sm tabular-nums text-ink-muted">{total.toLocaleString('id-ID')} akun</span>
        </div>
        <div className="p-3 sm:p-5">
          {loading ? (
            <div className="flex min-h-48 items-center justify-center"><LoadingSpinner label="Memuat daftar guru BK…" /></div>
          ) : gurus.length > 0 ? (
            <Table columns={columns} data={gurus} rowKey="id" caption="Daftar akun guru Bimbingan dan Konseling" />
          ) : (
            <EmptyState
              title={search || status !== 'semua' ? 'Guru BK tidak ditemukan' : 'Belum ada data guru BK'}
              description={search || status !== 'semua' ? 'Coba ubah kata kunci atau filter status.' : 'Tambahkan akun guru BK pertama untuk mulai mengelola data.'}
              actionLabel={search || status !== 'semua' ? 'Reset pencarian' : 'Tambah guru BK'}
              onAction={search || status !== 'semua'
                ? () => { setSearchInput(''); setSearch(''); setStatus('semua'); setPage(1) }
                : openCreate}
            />
          )}
        </div>
        {!loading && total > 0 && (
          <div className="border-t border-slate-100 px-4 py-4 sm:px-5">
            <Pagination page={page} totalPages={lastPage} onPageChange={setPage} />
          </div>
        )}
      </Card>

      <Modal
        open={formOpen}
        onClose={closeForm}
        title={editingGuru ? 'Ubah data guru BK' : 'Tambah guru BK'}
        description={editingGuru ? 'Perbarui informasi akun dan profil guru BK.' : 'Buat akun baru untuk guru Bimbingan dan Konseling.'}
        size="lg"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Input label="Nama lengkap" value={form.nama} onChange={(event) => updateField('nama', event.target.value)} error={formErrors.nama?.[0]} required autoComplete="name" placeholder="Nama guru BK" />
            <Input label="Username" value={form.username} onChange={(event) => updateField('username', event.target.value)} error={formErrors.username?.[0]} required autoComplete="off" placeholder="Contoh: guru04" />
            <Input label="Email" type="email" value={form.email} onChange={(event) => updateField('email', event.target.value)} error={formErrors.email?.[0]} autoComplete="email" placeholder="nama@sekolah.sch.id" />
            <Input label="NIP" value={form.nip} onChange={(event) => updateField('nip', event.target.value)} error={formErrors.nip?.[0]} placeholder="Nomor Induk Pegawai (opsional)" />
            <div className="sm:col-span-2">
              <Input label="Jabatan" value={form.jabatan} onChange={(event) => updateField('jabatan', event.target.value)} error={formErrors.jabatan?.[0]} placeholder="Contoh: Guru Bimbingan dan Konseling" />
            </div>
          </div>
          {!editingGuru && (
            <p className="rounded-xl bg-belajar-50 px-4 py-3 text-base leading-6 text-belajar-900">
              Password sementara akan dibuat otomatis setelah akun disimpan. Guru wajib mengganti password saat login pertama.
            </p>
          )}
          <div className="flex flex-col-reverse gap-3 border-t border-slate-100 pt-4 sm:flex-row sm:justify-end">
            <Button type="button" variant="outline" onClick={closeForm} disabled={saving}>Batal</Button>
            <Button type="submit" loading={saving}>{editingGuru ? 'Simpan perubahan' : 'Simpan guru BK'}</Button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={Boolean(confirmAction)}
        onClose={() => !confirmLoading && setConfirmAction(null)}
        onConfirm={handleConfirmAction}
        title={confirmDetails?.title}
        description={confirmDetails?.description}
        confirmLabel={confirmDetails?.confirmLabel}
        loading={confirmLoading}
        danger={confirmDetails?.danger ?? true}
      />

      <Modal
        open={Boolean(credential)}
        onClose={() => setCredential(null)}
        title={credential?.title || 'Password sementara'}
        description="Simpan password ini dan sampaikan kepada guru BK melalui saluran yang aman. Password tidak akan ditampilkan lagi setelah dialog ditutup."
        size="md"
      >
        {credential && (
          <div className="space-y-4">
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-base text-slate-600">Nama akun</p>
              <p className="mt-1 text-base font-bold text-slate-900">{credential.nama}</p>
              <p className="mt-3 text-base text-slate-600">Username</p>
              <p className="mt-1 text-base font-bold text-slate-900">{credential.username}</p>
              <p className="mt-3 text-base text-slate-600">Password sementara</p>
              <p className="mt-1 break-all rounded-lg bg-white px-3 py-3 font-mono text-lg font-bold tracking-wide text-slate-950 ring-1 ring-slate-200">{credential.password}</p>
            </div>
            <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <Button variant="outline" onClick={() => setCredential(null)}>Tutup</Button>
              <Button onClick={copyTemporaryPassword}>{copied ? 'Tersalin' : 'Salin password'}</Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}
