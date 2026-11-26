import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { api } from '../../services/api.js'
import { Badge, Button, Card, EmptyState, LoadingSpinner } from '../../components/index.js'
import GuruCommentThread from './GuruCommentThread.jsx'

const DAYS = [
  { value: 1, label: 'Senin' }, { value: 2, label: 'Selasa' }, { value: 3, label: 'Rabu' },
  { value: 4, label: 'Kamis' }, { value: 5, label: 'Jumat' }, { value: 6, label: 'Sabtu' }, { value: 7, label: 'Minggu' },
]
const TABS = [
  { value: 'tugas', label: 'Tugas' },
  { value: 'jadwal', label: 'Jadwal' },
  { value: 'refleksi', label: 'Refleksi' },
]

function isoWeekParts(dateValue) {
  const date = new Date(Date.UTC(dateValue.getFullYear(), dateValue.getMonth(), dateValue.getDate()))
  date.setUTCDate(date.getUTCDate() + 4 - (date.getUTCDay() || 7))
  const year = date.getUTCFullYear()
  const yearStart = new Date(Date.UTC(year, 0, 1))
  const week = Math.ceil((((date - yearStart) / 86400000) + 1) / 7)
  return { tahun: year, minggu_ke: week }
}

function shiftWeek(year, week, amount) {
  const januaryFourth = new Date(Date.UTC(year, 0, 4))
  const monday = new Date(januaryFourth)
  monday.setUTCDate(januaryFourth.getUTCDate() - ((januaryFourth.getUTCDay() || 7) - 1) + ((week - 1 + amount) * 7))
  return isoWeekParts(new Date(monday.getUTCFullYear(), monday.getUTCMonth(), monday.getUTCDate()))
}

function formatDate(value) {
  if (!value) return '—'
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? '—' : new Intl.DateTimeFormat('id-ID', { dateStyle: 'medium' }).format(date)
}

function formatDateTime(value) {
  if (!value) return ''
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? '' : new Intl.DateTimeFormat('id-ID', { dateStyle: 'medium', timeStyle: 'short' }).format(date)
}

function apiError(error) {
  const errors = error?.response?.data?.errors
  const first = errors ? Object.values(errors).flat()?.[0] : null
  return first || error?.response?.data?.message || 'Data siswa belum dapat dimuat. Silakan coba lagi.'
}

function statusLabel(value) {
  return ({ belum: 'Belum terisi', terisi: 'Sudah terisi', proses: 'Sedang dikerjakan', selesai: 'Selesai' })[value] || value || '—'
}

export default function GuruSiswaDetailPage() {
  const { siswaId } = useParams()
  const initial = useMemo(() => isoWeekParts(new Date()), [])
  const [tab, setTab] = useState('tugas')
  const [year, setYear] = useState(initial.tahun)
  const [week, setWeek] = useState(initial.minggu_ke)
  const [student, setStudent] = useState(null)
  const [data, setData] = useState([])
  const [comments, setComments] = useState([])
  const [history, setHistory] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [refreshKey, setRefreshKey] = useState(0)

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const url = `/api/guru/siswa/${siswaId}/${tab}`
      const response = await api.get(url, tab === 'tugas' ? {} : { params: { tahun: year, minggu_ke: week } })
      setStudent(response.data?.siswa || null)
      setData(tab === 'refleksi' ? (response.data?.data || null) : (Array.isArray(response.data?.data) ? response.data.data : []))
      setComments(Array.isArray(response.data?.comments) ? response.data.comments : [])
      setHistory(Array.isArray(response.data?.history) ? response.data.history : [])
    } catch (requestError) {
      setError(apiError(requestError))
      setData(tab === 'refleksi' ? null : [])
      setComments([])
      setHistory([])
    } finally {
      setLoading(false)
    }
  }, [siswaId, tab, year, week])

  useEffect(() => { load() }, [load, refreshKey])

  const schedulesByDay = useMemo(() => DAYS.map((day) => ({
    ...day,
    items: Array.isArray(data) && tab === 'jadwal' ? data.filter((item) => Number(item.hari) === day.value) : [],
  })), [data, tab])

  function changeWeek(amount) {
    const next = shiftWeek(year, week, amount)
    setYear(next.tahun)
    setWeek(next.minggu_ke)
  }

  const refresh = () => setRefreshKey((current) => current + 1)

  return (
    <div className="space-y-6">
      <div>
        <Link to="/guru/siswa" className="text-sm font-semibold text-belajar-700 hover:text-belajar-900">← Kembali ke siswa binaan</Link>
        <div className="mt-3 flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-950">{student?.nama || 'Detail siswa binaan'}</h1>
            {student && <p className="mt-1 text-sm text-slate-600">NIS {student.nis} · {student.kelas || 'Kelas belum tersedia'}</p>}
          </div>
          {student && <Badge variant="blue">Tahun ajaran {student.tahun_ajaran}</Badge>}
        </div>
      </div>

      <div className="flex flex-wrap gap-2 border-b border-slate-200" role="tablist" aria-label="Bagian data siswa">
        {TABS.map((item) => <button key={item.value} type="button" role="tab" aria-selected={tab === item.value} onClick={() => setTab(item.value)} className={`min-h-11 border-b-2 px-4 text-sm font-semibold transition ${tab === item.value ? 'border-belajar-600 text-belajar-800' : 'border-transparent text-slate-500 hover:text-slate-800'}`}>{item.label}</button>)}
      </div>

      {(tab === 'jadwal' || tab === 'refleksi') && (
        <Card padding="p-4 sm:p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div><p className="text-sm text-slate-500">Periode yang ditinjau</p><p className="font-bold text-slate-900">Minggu {week}, {year}</p></div>
            <div className="flex gap-2"><Button size="sm" variant="outline" onClick={() => changeWeek(-1)}>← Sebelumnya</Button><Button size="sm" variant="outline" onClick={() => changeWeek(1)}>Berikutnya →</Button></div>
          </div>
        </Card>
      )}

      {error && <Card className="border-rose-200 bg-rose-50"><p className="text-sm text-rose-800">{error}</p></Card>}
      {loading ? <Card><div className="flex justify-center py-12"><LoadingSpinner label="Memuat data siswa…" /></div></Card> : !error && (
        <>
          {tab === 'tugas' && (
            <Card title="Daftar tugas" description="Data ditampilkan untuk membantu melihat rencana tugas siswa. Guru BK tidak mengubah data tugas siswa.">
              {data.length === 0 ? <EmptyState title="Belum ada tugas" description="Tugas yang dicatat siswa akan muncul di bagian ini." /> : (
                <div className="overflow-x-auto"><table className="w-full min-w-[720px] text-left text-sm"><thead><tr className="border-b border-slate-200 text-slate-500"><th className="px-3 py-3">Mata pelajaran</th><th className="px-3 py-3">Judul tugas</th><th className="px-3 py-3">Tenggat</th><th className="px-3 py-3">Durasi</th><th className="px-3 py-3">Prioritas</th><th className="px-3 py-3">Status</th></tr></thead><tbody className="divide-y divide-slate-100">{data.map((task) => <tr key={task.id}><td className="px-3 py-3 text-slate-700">{task.mata_pelajaran}</td><td className="px-3 py-3 font-semibold text-slate-900">{task.judul}</td><td className="px-3 py-3 text-slate-600">{formatDate(task.tenggat)}</td><td className="px-3 py-3 text-slate-600">{task.durasi_menit} menit</td><td className="px-3 py-3"><Badge>{task.prioritas}</Badge></td><td className="px-3 py-3"><Badge variant={task.status === 'selesai' ? 'green' : 'blue'}>{statusLabel(task.status)}</Badge></td></tr>)}</tbody></table></div>
              )}
            </Card>
          )}

          {tab === 'jadwal' && (
            <Card title="Jadwal mingguan" description="Jadwal siswa ditampilkan sebagai informasi baca saja. Komentar dapat diberikan pada setiap kegiatan.">
              {!Array.isArray(data) || data.length === 0 ? <EmptyState title="Belum ada jadwal minggu ini" description="Jadwal akan tampil setelah siswa menyusun kegiatan untuk minggu yang dipilih." /> : (
                <div className="space-y-4">
                  {schedulesByDay.filter((day) => day.items.length > 0).map((day) => <section key={day.value} className="rounded-xl border border-slate-200 p-3 sm:p-4"><h3 className="font-bold text-slate-900">{day.label}</h3><div className="mt-3 space-y-3">{day.items.map((item) => <article key={item.id} className="rounded-xl bg-slate-50 p-3"><div className="flex flex-wrap items-center gap-2"><Badge variant="blue">{item.jam_mulai}–{item.jam_selesai}</Badge><Badge>{item.jenis_blok}</Badge></div><h4 className="mt-2 font-semibold text-slate-900">{item.kegiatan}</h4>{item.tugas && <p className="mt-1 text-sm text-slate-600">Tugas terkait: {item.tugas.mata_pelajaran} — {item.tugas.judul}</p>}{item.catatan && <p className="mt-1 whitespace-pre-wrap text-sm text-slate-600">{item.catatan}</p>}<GuruCommentThread comments={item.comments || []} targetField="jadwal_id" targetId={item.id} onChanged={refresh} /></article>)}</div></section>)}
                </div>
              )}
            </Card>
          )}

          {tab === 'refleksi' && (
            <div className="space-y-5">
              <Card title="Refleksi mingguan" description="Refleksi pribadi hanya ditampilkan sebagai status pengisian.">
                {!data ? (
                  <EmptyState title="Belum ada refleksi untuk minggu ini" description="Status akan berubah setelah siswa menyimpan refleksi minggu tersebut." />
                ) : !Object.prototype.hasOwnProperty.call(data, 'skor_realistis') ? (
                  <div className="rounded-xl border border-amber-200 bg-amber-50 p-4"><Badge variant="green">Refleksi sudah terisi</Badge><p className="mt-3 text-sm leading-6 text-amber-900">Siswa memilih untuk menyimpan refleksi ini hanya untuk dirinya. Guru BK hanya dapat melihat status bahwa refleksi sudah terisi.</p></div>
                ) : (
                  <div className="space-y-4">
                    <div className="flex flex-wrap items-center gap-2"><Badge variant="blue">Skor realistis: {data.skor_realistis}/4</Badge><Badge variant="green">Refleksi terisi</Badge></div>
                    {[['Hal yang terlaksana', data.terlaksana], ['Hal yang terasa menantang', data.hambatan], ['Rencana perbaikan', data.perbaikan]].map(([label, value]) => <div key={label} className="rounded-xl bg-slate-50 p-4"><p className="text-sm font-semibold text-slate-500">{label}</p><p className="mt-2 whitespace-pre-wrap text-base leading-6 text-slate-800">{value || 'Belum ada catatan.'}</p></div>)}
                  </div>
                )}
              </Card>
              {data && Object.prototype.hasOwnProperty.call(data, 'skor_realistis') && <Card title="Komentar untuk refleksi"><GuruCommentThread comments={comments} targetField="refleksi_id" targetId={data.id} onChanged={refresh} /></Card>}
              {history.length > 0 && <Card title="Riwayat refleksi" description="Riwayat hanya menampilkan status untuk refleksi yang disimpan secara pribadi."><div className="divide-y divide-slate-100">{history.map((item) => <div key={item.id} className="flex flex-wrap items-center justify-between gap-2 py-3"><span className="font-medium text-slate-800">Minggu {item.minggu_ke}, {item.tahun}</span><Badge variant="green">{item.status === 'terisi' ? 'Terisi' : 'Belum terisi'}</Badge></div>)}</div></Card>}
            </div>
          )}
        </>
      )}
      <p className="text-sm text-slate-500">Data ini hanya dapat dibaca selama penugasan Guru BK dan siswa masih terhubung pada tahun ajaran berjalan.</p>
    </div>
  )
}
