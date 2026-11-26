import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { api } from '../../services/api.js'
import { useToast } from '../../components/ToastProvider.jsx'
import { Badge, Button, Card, ConfirmDialog, Input, LoadingSpinner, Modal, Select, Textarea, TimeInput } from '../../components/index.js'

const DAYS = [
  { value: 1, label: 'Senin' },
  { value: 2, label: 'Selasa' },
  { value: 3, label: 'Rabu' },
  { value: 4, label: 'Kamis' },
  { value: 5, label: 'Jumat' },
  { value: 6, label: 'Sabtu' },
  { value: 7, label: 'Minggu' },
]

const BLOCK_TYPES = [
  { value: 'belajar', label: 'Belajar' },
  { value: 'istirahat', label: 'Istirahat' },
  { value: 'ibadah', label: 'Ibadah' },
  { value: 'ujian_libur', label: 'Ujian / Libur' },
  { value: 'lain', label: 'Lainnya' },
]

const EMPTY_FORM = {
  hari: '1',
  jam_mulai: '16:00',
  jam_selesai: '17:00',
  jenis_blok: 'belajar',
  tugas_id: '',
  kegiatan: '',
  catatan: '',
}

function getIsoWeekPartsFromUtcDate(inputDate) {
  const date = new Date(Date.UTC(inputDate.getUTCFullYear(), inputDate.getUTCMonth(), inputDate.getUTCDate()))
  date.setUTCDate(date.getUTCDate() + 4 - (date.getUTCDay() || 7))
  const year = date.getUTCFullYear()
  const yearStart = new Date(Date.UTC(year, 0, 1))
  const week = Math.ceil((((date - yearStart) / 86400000) + 1) / 7)
  return { tahun: year, minggu_ke: week }
}

function getIsoWeekParts(inputDate) {
  return getIsoWeekPartsFromUtcDate(new Date(Date.UTC(inputDate.getFullYear(), inputDate.getMonth(), inputDate.getDate())))
}

function isoWeekMonday(year, week) {
  const jan4 = new Date(Date.UTC(year, 0, 4))
  const weekday = jan4.getUTCDay() || 7
  jan4.setUTCDate(jan4.getUTCDate() - weekday + 1 + ((week - 1) * 7))
  return jan4
}

function shiftWeek(year, week, amount) {
  const monday = isoWeekMonday(year, week)
  monday.setUTCDate(monday.getUTCDate() + (amount * 7))
  return getIsoWeekPartsFromUtcDate(monday)
}

function formatWeekDate(date) {
  return new Intl.DateTimeFormat('id-ID', { day: 'numeric', month: 'short', timeZone: 'UTC' }).format(date)
}

function formatWeekRange(year, week) {
  const start = isoWeekMonday(year, week)
  const end = new Date(start)
  end.setUTCDate(end.getUTCDate() + 6)
  return `${formatWeekDate(start)} – ${formatWeekDate(end)} ${year}`
}

function errorMessage(error, fallback = 'Jadwal belum berhasil diproses. Coba lagi, ya.') {
  const errors = error?.response?.data?.errors
  if (errors) {
    const first = Object.values(errors).flat()?.[0]
    if (first) return first
  }
  return error?.response?.data?.message || fallback
}

function minutesBetween(start, end) {
  if (!start || !end || !/^\d{2}:\d{2}$/.test(start) || !/^\d{2}:\d{2}$/.test(end)) return null
  const [startHour, startMinute] = start.split(':').map(Number)
  const [endHour, endMinute] = end.split(':').map(Number)
  const duration = ((endHour * 60) + endMinute) - ((startHour * 60) + startMinute)
  return duration > 0 ? duration : null
}

function formatTime(value) {
  return String(value || '').slice(0, 5)
}

function formatCommentDate(value) {
  if (!value) return ''
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? '' : new Intl.DateTimeFormat('id-ID', { dateStyle: 'medium', timeStyle: 'short' }).format(date)
}

function typeLabel(value) {
  return BLOCK_TYPES.find((item) => item.value === value)?.label || 'Kegiatan'
}

function typeVariant(value) {
  if (value === 'belajar') return 'blue'
  if (value === 'istirahat') return 'green'
  if (value === 'ibadah') return 'yellow'
  if (value === 'ujian_libur') return 'red'
  return 'default'
}

function fieldError(errors, key) {
  return Array.isArray(errors?.[key]) ? errors[key][0] : errors?.[key]
}

export default function SiswaJadwalPage() {
  const { showToast } = useToast()
  const [searchParams] = useSearchParams()
  const initialPeriod = useMemo(() => {
    const current = getIsoWeekParts(new Date())
    const requestedYear = Number(searchParams.get('tahun'))
    const requestedWeek = Number(searchParams.get('minggu_ke'))
    if (requestedYear >= 2000 && requestedYear <= 2100 && requestedWeek >= 1 && requestedWeek <= 53) {
      return { tahun: requestedYear, minggu_ke: requestedWeek }
    }
    return current
  }, [searchParams])
  const [year, setYear] = useState(initialPeriod.tahun)
  const [week, setWeek] = useState(initialPeriod.minggu_ke)
  const [schedules, setSchedules] = useState([])
  const [tasks, setTasks] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [refreshKey, setRefreshKey] = useState(0)
  const [formOpen, setFormOpen] = useState(false)
  const [editingSchedule, setEditingSchedule] = useState(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [formErrors, setFormErrors] = useState({})
  const [saving, setSaving] = useState(false)
  const savingRef = useRef(false)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [deleting, setDeleting] = useState(false)
  const [copying, setCopying] = useState(false)

  useEffect(() => { savingRef.current = saving }, [saving])

  const loadTasks = useCallback(async () => {
    try {
      const response = await api.get('/api/siswa/tugas')
      setTasks(Array.isArray(response.data?.data) ? response.data.data : [])
    } catch {
      // Jadwal tetap dapat dikelola meski daftar tugas belum tersedia untuk ditautkan.
      setTasks([])
    }
  }, [])

  const loadSchedules = useCallback(async () => {
    setLoading(true)
    setLoadError('')
    try {
      const response = await api.get('/api/siswa/jadwal', { params: { tahun: year, minggu_ke: week } })
      setSchedules(Array.isArray(response.data?.data) ? response.data.data : [])
    } catch (error) {
      setLoadError(errorMessage(error, 'Jadwal mingguan belum dapat dimuat. Periksa koneksi lalu coba lagi.'))
    } finally {
      setLoading(false)
    }
  }, [year, week])

  useEffect(() => { loadSchedules() }, [loadSchedules, refreshKey])
  useEffect(() => { loadTasks() }, [loadTasks])

  const schedulesByDay = useMemo(() => DAYS.map((day) => ({
    ...day,
    items: schedules
      .filter((item) => Number(item.hari) === day.value)
      .slice()
      .sort((a, b) => formatTime(a.jam_mulai).localeCompare(formatTime(b.jam_mulai))),
  })), [schedules])

  const breakMissing = schedules.length > 0 && !schedules.some((item) => item.jenis_blok === 'istirahat')
  const durationPreview = minutesBetween(form.jam_mulai, form.jam_selesai)

  const localConflicts = useMemo(() => {
    if (!form.jam_mulai || !form.jam_selesai || !minutesBetween(form.jam_mulai, form.jam_selesai)) return []
    return schedules.filter((item) => (
      Number(item.hari) === Number(form.hari)
      && Number(item.id) !== Number(editingSchedule?.id || 0)
      && formatTime(item.jam_mulai) < form.jam_selesai
      && formatTime(item.jam_selesai) > form.jam_mulai
    ))
  }, [schedules, form.hari, form.jam_mulai, form.jam_selesai, editingSchedule])

  function changePeriod(nextPeriod) {
    setYear(nextPeriod.tahun)
    setWeek(nextPeriod.minggu_ke)
    setFormOpen(false)
    setEditingSchedule(null)
  }

  function openCreate(day = 1, blockType = 'belajar') {
    setEditingSchedule(null)
    setForm({ ...EMPTY_FORM, hari: String(day), jenis_blok: blockType })
    setFormErrors({})
    setFormOpen(true)
  }

  function openEdit(item) {
    setEditingSchedule(item)
    setForm({
      hari: String(item.hari),
      jam_mulai: formatTime(item.jam_mulai),
      jam_selesai: formatTime(item.jam_selesai),
      jenis_blok: item.jenis_blok || 'belajar',
      tugas_id: item.tugas_id ? String(item.tugas_id) : '',
      kegiatan: item.kegiatan || '',
      catatan: item.catatan || '',
    })
    setFormErrors({})
    setFormOpen(true)
  }

  function updateField(field, value) {
    setForm((current) => ({ ...current, [field]: value }))
    setFormErrors((current) => ({ ...current, [field]: undefined }))
  }

  // Callback stabil: Modal tidak boleh mengembalikan fokus ke tombol pembuka saat mengetik.
  const closeForm = useCallback(() => {
    if (savingRef.current) return
    setFormOpen(false)
    setFormErrors({})
  }, [])

  async function submitForm(event) {
    event.preventDefault()
    setSaving(true)
    setFormErrors({})

    const payload = {
      tahun: year,
      minggu_ke: week,
      hari: Number(form.hari),
      jam_mulai: form.jam_mulai,
      jam_selesai: form.jam_selesai,
      jenis_blok: form.jenis_blok,
      tugas_id: form.tugas_id ? Number(form.tugas_id) : null,
      kegiatan: form.kegiatan.trim(),
      catatan: form.catatan.trim() || null,
      // durasi_menit sengaja tidak dikirim; backend menghitungnya dari kedua jam.
    }

    try {
      const response = editingSchedule
        ? await api.put(`/api/siswa/jadwal/${editingSchedule.id}`, payload)
        : await api.post('/api/siswa/jadwal', payload)

      const warnings = response.data?.warnings || []
      showToast(response.data?.message || (editingSchedule ? 'Jadwal berhasil diperbarui.' : 'Jadwal berhasil ditambahkan.'), { variant: 'success' })
      warnings.forEach((warning) => showToast(warning, { variant: 'warning', title: 'Perhatikan waktu kegiatan', duration: 6500 }))
      setFormOpen(false)
      setEditingSchedule(null)
      setRefreshKey((value) => value + 1)
    } catch (error) {
      if (error.response?.status === 422 && error.response.data?.errors) {
        setFormErrors(error.response.data.errors)
        showToast(errorMessage(error, 'Periksa kembali informasi jadwal.'), { variant: 'danger', title: 'Jadwal belum tersimpan' })
      } else {
        showToast(errorMessage(error), { variant: 'danger', title: 'Jadwal belum tersimpan' })
      }
    } finally {
      setSaving(false)
    }
  }

  async function deleteSchedule() {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      await api.delete(`/api/siswa/jadwal/${deleteTarget.id}`)
      showToast('Jadwal berhasil dihapus.', { variant: 'success' })
      setDeleteTarget(null)
      setRefreshKey((value) => value + 1)
    } catch (error) {
      showToast(errorMessage(error, 'Jadwal belum dapat dihapus. Coba lagi, ya.'), { variant: 'danger', title: 'Belum berhasil menghapus' })
    } finally {
      setDeleting(false)
    }
  }

  async function copyPreviousWeek() {
    setCopying(true)
    try {
      const response = await api.post('/api/siswa/jadwal/salin', { tahun: year, minggu_ke: week })
      showToast(response.data?.message || 'Jadwal minggu lalu berhasil disalin.', { variant: 'success' })
      ;(response.data?.warnings || []).forEach((warning) => showToast(warning, { variant: 'warning', title: 'Perhatikan waktu kegiatan', duration: 6500 }))
      setRefreshKey((value) => value + 1)
    } catch (error) {
      showToast(errorMessage(error, 'Jadwal minggu lalu belum dapat disalin.'), { variant: 'warning', title: 'Belum dapat menyalin jadwal', duration: 6000 })
    } finally {
      setCopying(false)
    }
  }

  const taskOptions = useMemo(() => tasks.map((task) => ({
    value: String(task.id),
    label: `${task.mata_pelajaran} — ${task.judul}`,
  })), [tasks])

  return (
    <div className="space-y-6">
      <section className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <p className="text-base font-semibold text-belajar-700">Latihan menyusun waktu belajar yang seimbang</p>
          <h1 className="mt-1 text-2xl font-extrabold tracking-tight text-slate-950 sm:text-3xl">Jadwal Belajar Mingguan</h1>
          <p className="mt-2 max-w-2xl text-base leading-6 text-slate-600">Atur kegiatan belajar, istirahat, ibadah, dan kegiatan lainnya. Jadwal ini milikmu dan boleh disesuaikan saat ada perubahan.</p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
          <a href={`${(import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000').replace(/\/$/, '')}/api/siswa/cetak/${year}/${week}`} target="_blank" rel="noopener" className="inline-flex min-h-10 items-center justify-center rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50">Cetak / Pratinjau PDF</a>
          <a href={`${(import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000').replace(/\/$/, '')}/api/siswa/cetak/${year}/${week}?download=1`} className="inline-flex min-h-10 items-center justify-center rounded-xl border border-belajar-200 bg-white px-4 py-2 text-sm font-semibold text-belajar-700 transition hover:bg-belajar-50">Unduh PDF</a>
          <Button variant="outline" onClick={copyPreviousWeek} loading={copying} disabled={loading || copying}>Salin dari Minggu Lalu</Button>
          <Button onClick={() => openCreate()}>＋ Tambah kegiatan</Button>
        </div>
      </section>

      <Card padding="p-4 sm:p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-semibold text-slate-500">Periode yang ditampilkan</p>
            <h2 className="mt-1 text-lg font-bold text-slate-900">Minggu ke-{week} · {year}</h2>
            <p className="mt-1 text-sm text-slate-600">{formatWeekRange(year, week)}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={() => changePeriod(shiftWeek(year, week, -1))}>← Minggu sebelumnya</Button>
            <Button variant="outline" onClick={() => changePeriod(shiftWeek(year, week, 1))}>Minggu berikutnya →</Button>
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

      {breakMissing && !loading && (
        <Card className="border-amber-200 bg-amber-50" padding="p-4 sm:p-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="font-bold text-amber-900">Jadwalmu belum memuat waktu istirahat.</p>
              <p className="mt-1 text-base text-amber-800">Mau menambahkannya agar kegiatan dan waktu jedamu lebih seimbang?</p>
            </div>
            <Button variant="outline" onClick={() => openCreate(1, 'istirahat')}>Tambah waktu istirahat</Button>
          </div>
        </Card>
      )}

      {loading ? (
        <Card className="flex min-h-56 items-center justify-center"><LoadingSpinner label="Memuat jadwal mingguan…" /></Card>
      ) : !loadError ? (
        <section aria-label="Tabel jadwal Senin sampai Minggu">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <div><h2 className="text-lg font-bold text-slate-900">Rencana kegiatan setiap hari</h2><p className="mt-1 text-sm text-slate-600">Urutan kegiatan ditampilkan berdasarkan jam mulai.</p></div>
            <Badge variant="blue">{schedules.length} blok kegiatan</Badge>
          </div>
          <div role="table" aria-label="Jadwal Senin sampai Minggu">
            <div role="row" className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-7">
            {schedulesByDay.map((day) => (
              <Card key={day.value} role="cell" padding="p-3" className="min-w-0">
                <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-3">
                  <h3 className="font-bold text-slate-900">{day.label}</h3>
                  <Badge>{day.items.length}</Badge>
                </div>
                {day.items.length ? (
                  <div className="mt-3 space-y-3">
                    {day.items.map((item) => (
                      <article key={item.id} className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                        <p className="text-sm font-bold tabular-nums text-belajar-800">{formatTime(item.jam_mulai)}–{formatTime(item.jam_selesai)}</p>
                        <p className="mt-1 break-words font-semibold text-slate-900">{item.kegiatan}</p>
                        <div className="mt-2 flex flex-wrap gap-1.5">
                          <Badge variant={typeVariant(item.jenis_blok)}>{typeLabel(item.jenis_blok)}</Badge>
                          <Badge>{item.durasi_menit} menit</Badge>
                        </div>
                        {item.tugas && <p className="mt-2 text-xs leading-5 text-slate-600">Tugas: {item.tugas.judul}</p>}
                        {item.catatan && <p className="mt-2 whitespace-pre-wrap break-words text-xs leading-5 text-slate-600">{item.catatan}</p>}
                        {Array.isArray(item.comments) && item.comments.length > 0 && (
                          <div className="mt-3 space-y-2 border-t border-slate-200 pt-3">
                            <p className="text-xs font-bold text-slate-700">Komentar Guru BK</p>
                            {item.comments.map((comment) => (
                              <div key={comment.id} className="rounded-lg border border-belajar-100 bg-belajar-50/70 p-2.5">
                                <p className="text-xs font-bold text-slate-800">{comment.guru || 'Guru BK'}</p>
                                <p className="mt-1 whitespace-pre-wrap break-words text-xs leading-5 text-slate-700">{comment.isi}</p>
                                <time className="mt-1 block text-[11px] text-slate-500">{formatCommentDate(comment.created_at)}</time>
                              </div>
                            ))}
                          </div>
                        )}
                        <div className="mt-3 flex flex-wrap gap-2">
                          <Button size="sm" variant="outline" onClick={() => openEdit(item)}>Ubah</Button>
                          <Button size="sm" variant="danger" onClick={() => setDeleteTarget(item)}>Hapus</Button>
                        </div>
                      </article>
                    ))}
                  </div>
                ) : (
                  <div className="mt-3 rounded-xl border border-dashed border-slate-200 px-3 py-5 text-center">
                    <p className="text-sm text-slate-500">Belum ada kegiatan.</p>
                    <Button size="sm" variant="ghost" className="mt-2" onClick={() => openCreate(day.value)}>＋ Tambah</Button>
                  </div>
                )}
              </Card>
            ))}
            </div>
          </div>
        </section>
      ) : null}

      <Modal
        open={formOpen}
        onClose={closeForm}
        title={editingSchedule ? 'Ubah kegiatan' : 'Tambah kegiatan jadwal'}
        description="Pilih hari dan waktu kegiatan. Durasi akan dihitung otomatis dari jam mulai dan jam selesai."
        size="lg"
      >
        <form onSubmit={submitForm} className="space-y-4">
          <Select label="Hari" value={form.hari} onChange={(event) => updateField('hari', event.target.value)} error={fieldError(formErrors, 'hari')} required placeholder={null} options={DAYS.map((day) => ({ value: String(day.value), label: day.label }))} />
          <div className="grid gap-4 sm:grid-cols-2">
            <TimeInput label="Jam mulai" value={form.jam_mulai} onChange={(event) => updateField('jam_mulai', event.target.value)} error={fieldError(formErrors, 'jam_mulai')} required step={300} />
            <TimeInput label="Jam selesai" value={form.jam_selesai} onChange={(event) => updateField('jam_selesai', event.target.value)} error={fieldError(formErrors, 'jam_selesai')} required step={300} />
          </div>
          <div className="rounded-xl bg-belajar-50 px-4 py-3">
            <p className="text-sm font-semibold text-belajar-800">Perkiraan durasi</p>
            <p className="mt-1 text-lg font-bold text-belajar-900">{durationPreview ? `${durationPreview} menit` : 'Periksa kembali jam mulai dan selesai'}</p>
            <p className="mt-1 text-sm text-belajar-700">Durasi dihitung otomatis dan tidak perlu kamu isi.</p>
          </div>

          {localConflicts.length > 0 && (
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-3" role="status">
              <p className="font-semibold text-amber-900">Ada kegiatan lain pada waktu yang sama.</p>
              <p className="mt-1 text-sm leading-5 text-amber-800">{localConflicts.map((item) => `${item.kegiatan} (${formatTime(item.jam_mulai)}–${formatTime(item.jam_selesai)})`).join(', ')}. Kamu tetap bisa menyimpan jadwal ini, lalu meninjau susunannya kembali.</p>
            </div>
          )}

          <Select label="Jenis kegiatan" value={form.jenis_blok} onChange={(event) => updateField('jenis_blok', event.target.value)} error={fieldError(formErrors, 'jenis_blok')} required placeholder={null} options={BLOCK_TYPES} />
          <Input label="Nama kegiatan" value={form.kegiatan} onChange={(event) => updateField('kegiatan', event.target.value)} error={fieldError(formErrors, 'kegiatan')} required maxLength={180} placeholder="Contoh: Belajar Matematika" />
          <Select label="Hubungkan dengan tugas (opsional)" value={form.tugas_id} onChange={(event) => updateField('tugas_id', event.target.value)} error={fieldError(formErrors, 'tugas_id')} placeholder="Tidak dihubungkan dengan tugas" options={taskOptions} />
          <Textarea label="Catatan (opsional)" value={form.catatan} onChange={(event) => updateField('catatan', event.target.value)} error={fieldError(formErrors, 'catatan')} rows={3} placeholder="Tambahkan catatan bila diperlukan." />

          <div className="flex flex-col-reverse gap-2 border-t border-slate-100 pt-4 sm:flex-row sm:justify-end">
            <Button type="button" variant="outline" onClick={closeForm} disabled={saving}>Batal</Button>
            <Button type="submit" loading={saving}>{editingSchedule ? 'Simpan perubahan' : 'Simpan jadwal'}</Button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onClose={() => !deleting && setDeleteTarget(null)}
        onConfirm={deleteSchedule}
        loading={deleting}
        title="Hapus kegiatan ini?"
        description={`Kegiatan “${deleteTarget?.kegiatan || ''}” akan dihapus dari jadwal minggu ini.`}
        confirmLabel="Ya, hapus jadwal"
      />
    </div>
  )
}
