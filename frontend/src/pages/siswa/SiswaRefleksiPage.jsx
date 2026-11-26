import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../../services/api.js'
import { useToast } from '../../components/ToastProvider.jsx'
import { Alert, Badge, Button, Card, ConfirmDialog, EmptyState, LoadingSpinner, Textarea } from '../../components/index.js'

const DAYS = [
  { value: 1, label: 'Senin' },
  { value: 2, label: 'Selasa' },
  { value: 3, label: 'Rabu' },
  { value: 4, label: 'Kamis' },
  { value: 5, label: 'Jumat' },
  { value: 6, label: 'Sabtu' },
  { value: 7, label: 'Minggu' },
]

const SCORE_OPTIONS = [
  { value: 1, label: 'Belum sesuai', detail: 'Jadwal masih perlu banyak penyesuaian.' },
  { value: 2, label: 'Mulai tercapai', detail: 'Beberapa bagian sudah berjalan.' },
  { value: 3, label: 'Cukup sesuai', detail: 'Sebagian besar rencana terlaksana.' },
  { value: 4, label: 'Sangat sesuai', detail: 'Jadwal terasa cocok untuk minggu ini.' },
]

const EMPTY_FORM = {
  skor_realistis: '3',
  terlaksana: '',
  hambatan: '',
  perbaikan: '',
  hanya_untuk_saya: false,
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

function formatDateTime(value) {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  return new Intl.DateTimeFormat('id-ID', { dateStyle: 'medium', timeStyle: 'short' }).format(date)
}

function errorMessage(error, fallback = 'Refleksi belum berhasil diproses. Coba lagi, ya.') {
  const errors = error?.response?.data?.errors
  if (errors) {
    const first = Object.values(errors).flat()?.[0]
    if (first) return first
  }
  return error?.response?.data?.message || fallback
}

function fieldError(errors, key) {
  return Array.isArray(errors?.[key]) ? errors[key][0] : errors?.[key]
}

export default function SiswaRefleksiPage() {
  const { showToast } = useToast()
  const initialPeriod = useMemo(() => getIsoWeekParts(new Date()), [])
  const [year, setYear] = useState(initialPeriod.tahun)
  const [week, setWeek] = useState(initialPeriod.minggu_ke)
  const [reflection, setReflection] = useState(null)
  const [schedule, setSchedule] = useState([])
  const [history, setHistory] = useState([])
  const [comments, setComments] = useState([])
  const [form, setForm] = useState(EMPTY_FORM)
  const [formErrors, setFormErrors] = useState({})
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [refreshKey, setRefreshKey] = useState(0)

  const loadPeriod = useCallback(async () => {
    setLoading(true)
    setLoadError('')
    try {
      const response = await api.get('/api/siswa/refleksi', { params: { tahun: year, minggu_ke: week } })
      const payload = response.data || {}
      const item = payload.data || null
      setReflection(item)
      setSchedule(Array.isArray(payload.schedule) ? payload.schedule : [])
      setHistory(Array.isArray(payload.history) ? payload.history : [])
      setComments(Array.isArray(payload.comments) ? payload.comments : [])
      setForm(item ? {
        skor_realistis: String(item.skor_realistis || 3),
        terlaksana: item.terlaksana || '',
        hambatan: item.hambatan || '',
        perbaikan: item.perbaikan || '',
        hanya_untuk_saya: Boolean(item.hanya_untuk_saya),
      } : EMPTY_FORM)
      setFormErrors({})
    } catch (error) {
      setLoadError(errorMessage(error, 'Refleksi minggu ini belum dapat dimuat. Periksa koneksi lalu coba lagi.'))
    } finally {
      setLoading(false)
    }
  }, [year, week])

  useEffect(() => { loadPeriod() }, [loadPeriod, refreshKey])

  const scheduleByDay = useMemo(() => DAYS.map((day) => ({
    ...day,
    items: schedule.filter((item) => Number(item.hari) === day.value),
  })), [schedule])

  const hasBreak = schedule.some((item) => item.jenis_blok === 'istirahat')
  const missingBreak = schedule.length > 0 && !hasBreak
  const periodLabel = formatWeekRange(year, week)

  function changeField(field, value) {
    setForm((current) => ({ ...current, [field]: value }))
    setFormErrors((current) => ({ ...current, [field]: undefined }))
  }

  function moveWeek(amount) {
    const next = shiftWeek(year, week, amount)
    setYear(next.tahun)
    setWeek(next.minggu_ke)
  }

  function openHistory(item) {
    setYear(Number(item.tahun))
    setWeek(Number(item.minggu_ke))
  }

  async function submitReflection(event) {
    event.preventDefault()
    setSaving(true)
    setFormErrors({})

    const payload = {
      tahun: year,
      minggu_ke: week,
      skor_realistis: Number(form.skor_realistis),
      terlaksana: form.terlaksana.trim() || null,
      hambatan: form.hambatan.trim() || null,
      perbaikan: form.perbaikan.trim() || null,
      hanya_untuk_saya: Boolean(form.hanya_untuk_saya),
      // siswa_id tidak dikirim. Backend mengambil profil siswa dari akun login.
    }

    try {
      const response = reflection
        ? await api.put(`/api/siswa/refleksi/${reflection.id}`, payload)
        : await api.post('/api/siswa/refleksi', payload)
      showToast(response.data?.message || 'Refleksimu berhasil disimpan.', { variant: 'success' })
      setRefreshKey((value) => value + 1)
    } catch (error) {
      const status = error.response?.status
      if (status === 422 && error.response.data?.errors) {
        setFormErrors(error.response.data.errors)
        showToast(errorMessage(error), { variant: 'danger', title: 'Periksa kembali refleksimu' })
      } else if (status === 409) {
        showToast(errorMessage(error), { variant: 'warning', title: 'Refleksi minggu ini sudah ada' })
        setRefreshKey((value) => value + 1)
      } else {
        showToast(errorMessage(error), { variant: 'danger', title: 'Refleksi belum tersimpan' })
      }
    } finally {
      setSaving(false)
    }
  }

  async function deleteReflection() {
    if (!reflection) return
    setDeleting(true)
    try {
      const response = await api.delete(`/api/siswa/refleksi/${reflection.id}`)
      showToast(response.data?.message || 'Refleksi berhasil dihapus.', { variant: 'success' })
      setDeleteOpen(false)
      setRefreshKey((value) => value + 1)
    } catch (error) {
      showToast(errorMessage(error, 'Refleksi belum berhasil dihapus.'), { variant: 'danger', title: 'Belum berhasil dihapus' })
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-belajar-700">Refleksi belajar</p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">Melihat kembali proses belajarmu</h1>
          <p className="mt-2 max-w-2xl text-base leading-6 text-slate-600">Luangkan waktu untuk mengenali hal yang sudah berjalan dan hal yang ingin kamu coba berikutnya. Tidak ada jawaban benar atau salah.</p>
        </div>
        <div className="flex flex-col items-stretch gap-2 self-start sm:self-auto">
          <div className="flex items-center justify-end gap-2">
            <Button variant="outline" onClick={() => moveWeek(-1)} aria-label="Minggu sebelumnya">←</Button>
            <span className="min-w-36 text-center text-sm font-semibold text-slate-700">Minggu {week}, {year}</span>
            <Button variant="outline" onClick={() => moveWeek(1)} aria-label="Minggu berikutnya">→</Button>
          </div>
          <div className="flex flex-wrap justify-end gap-2">
            <a href={`${(import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000').replace(/\/$/, '')}/api/siswa/cetak/${year}/${week}`} target="_blank" rel="noopener" className="inline-flex min-h-10 items-center justify-center rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50">Cetak / Pratinjau PDF</a>
            <a href={`${(import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000').replace(/\/$/, '')}/api/siswa/cetak/${year}/${week}?download=1`} className="inline-flex min-h-10 items-center justify-center rounded-xl border border-belajar-200 bg-white px-3 py-2 text-sm font-semibold text-belajar-700 transition hover:bg-belajar-50">Unduh PDF</a>
          </div>
        </div>
      </div>

      <Card padding="p-4 sm:p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm font-medium text-slate-500">Periode refleksi</p>
            <p className="mt-1 text-lg font-bold text-slate-900">{periodLabel}</p>
          </div>
          {reflection
            ? <Badge variant="green">Refleksi sudah terisi</Badge>
            : <Badge variant="yellow">Belum diisi</Badge>}
        </div>
      </Card>

      {loadError && <Alert variant="danger" title="Refleksi belum dapat dimuat">{loadError}</Alert>}

      {loading ? (
        <Card><div className="flex justify-center py-12"><LoadingSpinner label="Memuat refleksi dan jadwal minggu ini…" /></div></Card>
      ) : !loadError && (
        <div className="grid grid-cols-1 items-start gap-5 lg:grid-cols-[minmax(0,1.15fr)_minmax(19rem,0.85fr)]">
          <Card className="order-1 lg:order-2" title="Jadwal minggu yang sama" description="Gunakan jadwal ini untuk membantu mengingat kegiatanmu minggu ini.">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
              <Badge variant="blue">{schedule.length} kegiatan</Badge>
              <Link
                to={`/siswa/jadwal?tahun=${year}&minggu_ke=${week}`}
                className="inline-flex min-h-10 items-center rounded-xl border border-belajar-200 px-3 py-2 text-sm font-semibold text-belajar-700 transition hover:bg-belajar-50 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-belajar-100"
              >
                Perbaiki Jadwal
              </Link>
            </div>
            {schedule.length === 0 ? (
              <EmptyState title="Belum ada jadwal minggu ini" description="Kamu dapat menyusun kegiatan belajar terlebih dahulu, lalu kembali untuk mengisi refleksi." />
            ) : (
              <div className="space-y-3">
                {scheduleByDay.filter((day) => day.items.length > 0).map((day) => (
                  <div key={day.value} className="rounded-xl border border-slate-200 p-3">
                    <h3 className="mb-2 font-bold text-slate-900">{day.label}</h3>
                    <div className="space-y-2">
                      {day.items.map((item) => (
                        <div key={item.id} className="flex items-start gap-3 rounded-lg bg-slate-50 p-3">
                          <span className="min-w-[5.8rem] pt-0.5 text-sm font-semibold tabular-nums text-belajar-700">{item.jam_mulai}–{item.jam_selesai}</span>
                          <div className="min-w-0">
                            <p className="font-semibold text-slate-800">{item.kegiatan}</p>
                            {item.tugas && <p className="mt-0.5 text-sm text-slate-500">{item.tugas.mata_pelajaran}: {item.tugas.judul}</p>}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
            {missingBreak && (
              <Alert variant="info" className="mt-4" title="Ingat juga waktu jeda">Jadwalmu belum memuat waktu istirahat. Mau menambahkannya?</Alert>
            )}
          </Card>

          <div className="order-2 space-y-5 lg:order-1">
            <Card title={reflection ? 'Perbarui refleksi' : 'Refleksi minggu ini'} description="Ceritakan pengalamanmu dengan kata-katamu sendiri. Kamu dapat mengubahnya kapan saja.">
              <form onSubmit={submitReflection} className="space-y-5">
                <fieldset>
                  <legend className="mb-3 text-base font-semibold text-slate-800">Seberapa sesuai jadwal dengan keadaanmu minggu ini? <span className="text-rose-600">*</span></legend>
                  <div className="grid grid-cols-2 gap-2">
                    {SCORE_OPTIONS.map((option) => {
                      const selected = Number(form.skor_realistis) === option.value
                      return (
                        <label key={option.value} className={`cursor-pointer rounded-xl border p-3 transition ${selected ? 'border-belajar-500 bg-belajar-50 ring-2 ring-belajar-100' : 'border-slate-200 bg-white hover:bg-slate-50'}`}>
                          <input
                            type="radio"
                            name="skor_realistis"
                            value={option.value}
                            checked={selected}
                            onChange={(event) => changeField('skor_realistis', event.target.value)}
                            className="sr-only"
                          />
                          <span className="flex items-center gap-2 font-bold text-slate-900"><span className="flex h-7 w-7 items-center justify-center rounded-full bg-white text-sm ring-1 ring-slate-200">{option.value}</span>{option.label}</span>
                          <span className="mt-2 block text-sm leading-5 text-slate-600">{option.detail}</span>
                        </label>
                      )
                    })}
                  </div>
                  {fieldError(formErrors, 'skor_realistis') && <p className="mt-2 text-sm font-medium text-rose-700" role="alert">{fieldError(formErrors, 'skor_realistis')}</p>}
                </fieldset>

                <Textarea
                  label="Hal yang berhasil kamu lakukan"
                  value={form.terlaksana}
                  onChange={(event) => changeField('terlaksana', event.target.value)}
                  error={fieldError(formErrors, 'terlaksana')}
                  rows={3}
                  placeholder="Contoh: Saya menyelesaikan latihan matematika pada hari Selasa."
                  helperText="Catat kegiatan atau bagian jadwal yang sempat kamu jalankan."
                />
                <Textarea
                  label="Hal yang terasa menantang"
                  value={form.hambatan}
                  onChange={(event) => changeField('hambatan', event.target.value)}
                  error={fieldError(formErrors, 'hambatan')}
                  rows={3}
                  placeholder="Contoh: Waktu belajar sore berubah karena ada kegiatan keluarga."
                  helperText="Tuliskan situasi yang memengaruhi rencanamu, tanpa perlu menyalahkan diri sendiri."
                />
                <Textarea
                  label="Hal yang ingin kamu coba minggu depan"
                  value={form.perbaikan}
                  onChange={(event) => changeField('perbaikan', event.target.value)}
                  error={fieldError(formErrors, 'perbaikan')}
                  rows={3}
                  placeholder="Contoh: Saya ingin mencoba membagi latihan menjadi dua sesi singkat."
                  helperText="Pilih langkah kecil yang terasa mungkin dilakukan."
                />

                <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4">
                  <input
                    type="checkbox"
                    checked={form.hanya_untuk_saya}
                    onChange={(event) => changeField('hanya_untuk_saya', event.target.checked)}
                    className="mt-1 h-5 w-5 rounded border-slate-300 text-belajar-600 focus:ring-belajar-500"
                  />
                  <span>
                    <span className="block font-semibold text-slate-900">Refleksi ini hanya untuk saya</span>
                    <span className="mt-1 block text-sm leading-5 text-slate-600">Guru BK hanya dapat melihat bahwa refleksi minggu ini sudah terisi, bukan isi refleksinya.</span>
                  </span>
                </label>

                <div className="flex flex-col-reverse gap-3 border-t border-slate-100 pt-4 sm:flex-row sm:items-center sm:justify-between">
                  {reflection ? (
                    <Button type="button" variant="danger" onClick={() => setDeleteOpen(true)}>Hapus refleksi</Button>
                  ) : <span className="text-sm text-slate-500">Belum ada refleksi untuk periode ini.</span>}
                  <Button type="submit" loading={saving}>{reflection ? 'Simpan perubahan' : 'Simpan refleksi'}</Button>
                </div>
              </form>
            </Card>

            <Card title="Komentar Guru BK" description="Umpan balik yang diberikan untuk refleksi minggu ini.">
              {comments.length === 0 ? (
                <EmptyState title="Belum ada komentar" description="Komentar dari Guru BK akan muncul di sini ketika tersedia." />
              ) : (
                <div className="space-y-3">
                  {comments.map((comment) => (
                    <article key={comment.id} className="rounded-xl border border-belajar-100 bg-belajar-50/60 p-4">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <p className="font-bold text-slate-900">{comment.guru || 'Guru BK'}</p>
                        <time className="text-sm text-slate-500">{formatDateTime(comment.created_at)}</time>
                      </div>
                      <p className="mt-2 whitespace-pre-wrap text-base leading-6 text-slate-700">{comment.isi}</p>
                    </article>
                  ))}
                </div>
              )}
            </Card>
          </div>
        </div>
      )}

      <Card title="Riwayat refleksi" description="Kamu dapat membuka kembali refleksi dari minggu-minggu sebelumnya.">
        {history.length === 0 ? (
          <EmptyState title="Belum ada riwayat refleksi" description="Refleksi yang kamu simpan pada minggu sebelumnya akan tercatat di sini." />
        ) : (
          <div className="divide-y divide-slate-100">
            {history.map((item) => (
              <button key={item.id} type="button" onClick={() => openHistory(item)} className="flex w-full flex-wrap items-center justify-between gap-3 py-3 text-left transition hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-belajar-300">
                <span>
                  <span className="block font-semibold text-slate-900">Minggu {item.minggu_ke}, {item.tahun}</span>
                  <span className="mt-1 block text-sm text-slate-500">Terakhir diperbarui {formatDateTime(item.updated_at)}</span>
                </span>
                <span className="flex items-center gap-2">
                  {item.hanya_untuk_saya && <Badge>Pribadi</Badge>}
                  <Badge variant="blue">{item.skor_realistis}/4</Badge>
                  <span className="text-sm font-semibold text-belajar-700">Buka →</span>
                </span>
              </button>
            ))}
          </div>
        )}
      </Card>

      <ConfirmDialog
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        onConfirm={deleteReflection}
        title="Hapus refleksi minggu ini?"
        description="Refleksi ini akan dihapus dari riwayatmu. Kamu dapat mengisinya kembali untuk minggu yang sama."
        confirmLabel="Ya, hapus refleksi"
        loading={deleting}
      />
    </div>
  )
}
