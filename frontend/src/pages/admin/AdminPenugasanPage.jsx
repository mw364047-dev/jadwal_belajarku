import { useCallback, useEffect, useMemo, useState } from 'react'
import { api } from '../../services/api.js'
import { useToast } from '../../components/ToastProvider.jsx'
import { Button, Card, ConfirmDialog, EmptyState, Input, LoadingSpinner, Modal, Pagination, Select, Table } from '../../components/index.js'

function errorMessage(error, fallback = 'Terjadi kesalahan. Silakan coba lagi.') {
  const errors = error?.response?.data?.errors
  if (errors) {
    const first = Object.values(errors).flat()?.[0]
    if (first) return first
  }
  return error?.response?.data?.message || fallback
}

export default function AdminPenugasanPage() {
  const { showToast } = useToast()
  const [teachers, setTeachers] = useState([])
  const [students, setStudents] = useState([])
  const [years, setYears] = useState([])
  const [optionsLoading, setOptionsLoading] = useState(true)

  const [assignments, setAssignments] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [refreshKey, setRefreshKey] = useState(0)
  const [page, setPage] = useState(1)
  const [lastPage, setLastPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [searchInput, setSearchInput] = useState('')
  const [search, setSearch] = useState('')
  const [yearFilter, setYearFilter] = useState('')

  const [teacherId, setTeacherId] = useState('')
  const [assignmentYear, setAssignmentYear] = useState('')
  const [studentSearch, setStudentSearch] = useState('')
  const [selectedStudents, setSelectedStudents] = useState([])
  const [savingBulk, setSavingBulk] = useState(false)

  const [editing, setEditing] = useState(null)
  const [editForm, setEditForm] = useState({ guru_id: '', siswa_id: '', tahun_ajaran: '' })
  const [editErrors, setEditErrors] = useState({})
  const [savingEdit, setSavingEdit] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [deleteLoading, setDeleteLoading] = useState(false)

  const loadAssignments = useCallback(async () => {
    setLoading(true)
    setLoadError('')
    try {
      const response = await api.get('/api/admin/penugasan', {
        params: { search, tahun_ajaran: yearFilter || undefined, page, per_page: 10 },
      })
      setAssignments(response.data.data || [])
      setPage(response.data.current_page || 1)
      setLastPage(response.data.last_page || 1)
      setTotal(response.data.total || 0)
    } catch (error) {
      const message = errorMessage(error, 'Daftar penugasan belum dapat dimuat.')
      setLoadError(message)
      if (error.response?.status !== 401) showToast(message, { variant: 'danger', title: 'Gagal memuat data' })
    } finally {
      setLoading(false)
    }
  }, [search, yearFilter, page, showToast])

  useEffect(() => { loadAssignments() }, [loadAssignments, refreshKey])

  useEffect(() => {
    let active = true
    setOptionsLoading(true)
    api.get('/api/admin/penugasan/options')
      .then((response) => {
        if (!active) return
        const nextTeachers = response.data.teachers || []
        const nextStudents = response.data.students || []
        const nextYears = response.data.years || []
        setTeachers(nextTeachers)
        setStudents(nextStudents)
        setYears(nextYears)
        setTeacherId((current) => current || String(nextTeachers[0]?.id || ''))
        setAssignmentYear((current) => current || String(nextYears[0] || ''))
      })
      .catch((error) => { if (active) showToast(errorMessage(error, 'Opsi guru dan siswa belum dapat dimuat.'), { variant: 'danger' }) })
      .finally(() => { if (active) setOptionsLoading(false) })
    return () => { active = false }
  }, [showToast])

  const filteredStudents = useMemo(() => students.filter((student) => {
    const sameYear = student.tahun_ajaran === assignmentYear
    const needle = studentSearch.trim().toLowerCase()
    const matches = !needle || `${student.nama} ${student.nis} ${student.nama_kelas}`.toLowerCase().includes(needle)
    return sameYear && matches
  }), [students, assignmentYear, studentSearch])

  const allFilteredSelected = filteredStudents.length > 0 && filteredStudents.every((student) => selectedStudents.includes(student.id))

  const columns = useMemo(() => [
    { key: 'guru_nama', header: 'Guru BK', render: (item) => <span className="font-bold text-slate-900">{item.guru_nama}</span> },
    { key: 'siswa_nama', header: 'Siswa', render: (item) => <div><p className="font-semibold text-slate-900">{item.siswa_nama}</p><p className="text-sm text-slate-500">NIS: {item.nis || '—'}</p></div> },
    { key: 'nama_kelas', header: 'Kelas' },
    { key: 'tahun_ajaran', header: 'Tahun ajaran' },
    { key: 'actions', header: 'Aksi', render: (item) => <div className="flex flex-wrap gap-2"><Button size="sm" variant="outline" onClick={() => openEdit(item)}>Ubah</Button><Button size="sm" variant="danger" onClick={() => setDeleteTarget(item)}>Hapus</Button></div> },
  ], [])

  function toggleStudent(id, checked) {
    setSelectedStudents((current) => checked ? [...current, id] : current.filter((item) => item !== id))
  }

  function toggleAllFiltered(checked) {
    const ids = filteredStudents.map((student) => student.id)
    setSelectedStudents((current) => checked
      ? Array.from(new Set([...current, ...ids]))
      : current.filter((id) => !ids.includes(id)))
  }

  async function submitBulk(event) {
    event.preventDefault()
    if (!teacherId || !assignmentYear || !selectedStudents.length) {
      showToast('Pilih guru BK, tahun ajaran, dan minimal satu siswa.', { variant: 'warning' })
      return
    }
    setSavingBulk(true)
    try {
      const response = await api.post('/api/admin/penugasan', {
        guru_id: Number(teacherId),
        siswa_ids: selectedStudents,
        tahun_ajaran: assignmentYear,
      })
      showToast(response.data.message || 'Penugasan berhasil ditambahkan.')
      setSelectedStudents([])
      setStudentSearch('')
      setRefreshKey((value) => value + 1)
    } catch (error) {
      showToast(errorMessage(error, 'Penugasan belum berhasil disimpan.'), { variant: 'danger', title: 'Gagal membuat penugasan' })
    } finally {
      setSavingBulk(false)
    }
  }

  function openEdit(item) {
    setEditing(item)
    setEditForm({ guru_id: String(item.guru_id), siswa_id: String(item.siswa_id), tahun_ajaran: item.tahun_ajaran })
    setEditErrors({})
  }

  async function submitEdit(event) {
    event.preventDefault()
    if (!editing) return
    setSavingEdit(true)
    setEditErrors({})
    try {
      await api.put(`/api/admin/penugasan/${editing.id}`, {
        guru_id: Number(editForm.guru_id),
        siswa_id: Number(editForm.siswa_id),
        tahun_ajaran: editForm.tahun_ajaran,
      })
      showToast('Penugasan berhasil diperbarui.')
      setEditing(null)
      setRefreshKey((value) => value + 1)
    } catch (error) {
      if (error.response?.status === 422 && error.response.data?.errors) setEditErrors(error.response.data.errors)
      else showToast(errorMessage(error, 'Penugasan belum berhasil diubah.'), { variant: 'danger' })
    } finally {
      setSavingEdit(false)
    }
  }

  async function deleteAssignment() {
    if (!deleteTarget) return
    setDeleteLoading(true)
    try {
      await api.delete(`/api/admin/penugasan/${deleteTarget.id}`)
      showToast('Penugasan berhasil dihapus.')
      setDeleteTarget(null)
      setRefreshKey((value) => value + 1)
    } catch (error) {
      showToast(errorMessage(error, 'Penugasan belum berhasil dihapus.'), { variant: 'danger' })
    } finally {
      setDeleteLoading(false)
    }
  }

  const teacherOptions = teachers.map((teacher) => ({ value: String(teacher.id), label: teacher.nama }))
  const yearOptions = years.map((year) => ({ value: year, label: year }))
  const editStudentOptions = students.filter((student) => student.tahun_ajaran === editForm.tahun_ajaran).map((student) => ({ value: String(student.id), label: `${student.nama} — ${student.nis} (${student.nama_kelas})` }))

  return (
    <div className="space-y-6">
      <div>
        <p className="text-base font-semibold text-belajar-700">Pengelolaan data sekolah</p>
        <h1 className="mt-1 text-2xl font-extrabold tracking-tight text-slate-950 sm:text-3xl">Penugasan Guru–Siswa</h1>
        <p className="mt-2 max-w-2xl text-base leading-6 text-slate-600">Tugaskan satu guru BK kepada beberapa siswa sekaligus. Kombinasi guru, siswa, dan tahun ajaran tidak boleh dibuat dua kali.</p>
      </div>

      <Card title="Buat penugasan massal" description="Pilih guru BK, tahun ajaran, lalu centang satu atau beberapa siswa.">
        {optionsLoading ? <div className="flex min-h-36 items-center justify-center"><LoadingSpinner label="Memuat pilihan guru dan siswa…" /></div> : <form onSubmit={submitBulk} className="space-y-4">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <Select label="Guru BK" value={teacherId} onChange={(event) => setTeacherId(event.target.value)} options={teacherOptions} placeholder="Pilih guru BK" required />
            <Select label="Tahun ajaran" value={assignmentYear} onChange={(event) => { setAssignmentYear(event.target.value); setSelectedStudents([]) }} options={yearOptions} placeholder="Pilih tahun ajaran" required />
          </div>
          <div className="rounded-xl border border-slate-200 p-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <div className="min-w-0 flex-1"><Input label="Cari siswa" value={studentSearch} onChange={(event) => setStudentSearch(event.target.value)} placeholder="Nama, NIS, atau kelas" /></div>
              <div className="flex flex-wrap items-center gap-3 text-sm text-slate-600"><span>{selectedStudents.length} siswa dipilih</span><button type="button" className="font-semibold text-belajar-700 hover:underline" onClick={() => toggleAllFiltered(!allFilteredSelected)}>{allFilteredSelected ? 'Batalkan pilihan' : 'Pilih semua hasil'}</button></div>
            </div>
            <div className="mt-4 max-h-72 overflow-y-auto rounded-lg border border-slate-100">
              {filteredStudents.length ? filteredStudents.map((student) => <label key={student.id} className="flex cursor-pointer items-center gap-3 border-b border-slate-100 px-3 py-3 last:border-0 hover:bg-slate-50">
                <input type="checkbox" checked={selectedStudents.includes(student.id)} onChange={(event) => toggleStudent(student.id, event.target.checked)} className="h-4 w-4 rounded border-slate-300 text-belajar-600 focus:ring-belajar-500" />
                <span className="min-w-0 flex-1"><span className="block truncate text-sm font-semibold text-slate-900">{student.nama}</span><span className="block text-xs text-slate-500">NIS {student.nis} · {student.nama_kelas}</span></span>
                <span className="text-sm tabular-nums text-ink-muted">{student.tahun_ajaran}</span>
              </label>) : <p className="px-4 py-8 text-center text-sm text-slate-500">Tidak ada siswa aktif pada tahun ajaran ini.</p>}
            </div>
          </div>
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-between"><p className="text-sm text-slate-500">Siswa yang sudah ditugaskan ke guru yang sama pada tahun ajaran ini akan ditolak untuk mencegah duplikasi.</p><Button type="submit" loading={savingBulk} disabled={!selectedStudents.length || !teacherId || !assignmentYear}>Simpan {selectedStudents.length || ''} penugasan</Button></div>
        </form>}
      </Card>

      <Card>
        <form className="grid grid-cols-1 gap-3 md:grid-cols-[minmax(0,1fr)_14rem_auto] md:items-end" onSubmit={(event) => { event.preventDefault(); setPage(1); setSearch(searchInput.trim()) }}>
          <Input label="Cari penugasan" value={searchInput} onChange={(event) => setSearchInput(event.target.value)} placeholder="Nama guru, nama siswa, atau NIS" />
          <Select label="Tahun ajaran" value={yearFilter} onChange={(event) => { setYearFilter(event.target.value); setPage(1) }} options={[{ value: '', label: 'Semua tahun ajaran' }, ...yearOptions]} placeholder={null} />
          <div className="flex gap-2"><Button type="submit" className="flex-1 md:flex-none">Cari</Button><Button type="button" variant="outline" onClick={() => { setSearchInput(''); setSearch(''); setYearFilter(''); setPage(1) }}>Reset</Button></div>
        </form>
      </Card>

      {loadError && <Card className="border-rose-200 bg-rose-50"><div className="flex flex-wrap items-center justify-between gap-3"><p className="text-base text-rose-800">{loadError}</p><Button size="sm" variant="outline" onClick={() => setRefreshKey((value) => value + 1)}>Coba lagi</Button></div></Card>}

      <Card padding="p-0" className="overflow-hidden">
        <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-4 py-4 sm:px-5"><h2 className="text-lg font-bold text-slate-900">Daftar penugasan</h2><span className="text-sm tabular-nums text-ink-muted">{total.toLocaleString('id-ID')} penugasan</span></div>
        <div className="p-3 sm:p-5">{loading ? <div className="flex min-h-48 items-center justify-center"><LoadingSpinner label="Memuat daftar penugasan…" /></div> : assignments.length ? <Table columns={columns} data={assignments} caption="Daftar penugasan guru BK kepada siswa" /> : <EmptyState title={search || yearFilter ? 'Penugasan tidak ditemukan' : 'Belum ada penugasan'} description={search || yearFilter ? 'Ubah kata kunci atau filter tahun ajaran.' : 'Pilih satu guru BK dan beberapa siswa untuk membuat penugasan.'} actionLabel={search || yearFilter ? 'Reset pencarian' : undefined} onAction={() => { setSearchInput(''); setSearch(''); setYearFilter(''); setPage(1) }} />}</div>
        {!loading && total > 0 && <div className="border-t border-slate-100 px-4 py-4 sm:px-5"><Pagination page={page} totalPages={lastPage} onPageChange={setPage} /></div>}
      </Card>

      <Modal open={Boolean(editing)} onClose={() => !savingEdit && setEditing(null)} title="Ubah penugasan" description="Perbarui guru BK, siswa, atau tahun ajaran pada satu penugasan.">
        <form onSubmit={submitEdit} className="space-y-4">
          <Select label="Guru BK" value={editForm.guru_id} onChange={(event) => setEditForm((current) => ({ ...current, guru_id: event.target.value }))} options={teacherOptions} error={editErrors.guru_id?.[0]} required />
          <Select label="Siswa" value={editForm.siswa_id} onChange={(event) => setEditForm((current) => ({ ...current, siswa_id: event.target.value }))} options={editStudentOptions} error={editErrors.siswa_id?.[0]} required />
          <Select label="Tahun ajaran" value={editForm.tahun_ajaran} onChange={(event) => setEditForm((current) => ({ ...current, tahun_ajaran: event.target.value }))} options={yearOptions} error={editErrors.tahun_ajaran?.[0]} required />
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end"><Button type="button" variant="outline" onClick={() => setEditing(null)} disabled={savingEdit}>Batal</Button><Button type="submit" loading={savingEdit}>Simpan perubahan</Button></div>
        </form>
      </Modal>

      <ConfirmDialog open={Boolean(deleteTarget)} onClose={() => setDeleteTarget(null)} onConfirm={deleteAssignment} loading={deleteLoading} title="Hapus penugasan?" description={`Penugasan ${deleteTarget?.guru_nama || ''} kepada ${deleteTarget?.siswa_nama || ''} pada tahun ajaran ${deleteTarget?.tahun_ajaran || ''} akan dihapus. Siswa tidak lagi tercatat sebagai binaan guru tersebut melalui penugasan ini.`} confirmLabel="Ya, hapus penugasan" />
    </div>
  )
}
