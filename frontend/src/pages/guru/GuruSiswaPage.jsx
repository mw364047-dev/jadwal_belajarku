import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../../services/api.js'
import { Badge, Card, EmptyState, Input, LoadingSpinner } from '../../components/index.js'

export default function GuruSiswaPage() {
  const [students, setStudents] = useState([])
  const [meta, setMeta] = useState(null)
  const [query, setQuery] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const response = await api.get('/api/guru/siswa')
      setStudents(Array.isArray(response.data?.data) ? response.data.data : [])
      setMeta(response.data?.meta || null)
    } catch (requestError) {
      setError(requestError?.response?.data?.message || 'Daftar siswa binaan belum dapat dimuat.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase()
    if (!needle) return students
    return students.filter((student) => [student.nama, student.nis, student.kelas].some((value) => String(value || '').toLowerCase().includes(needle)))
  }, [students, query])

  return (
    <div className="space-y-6">
      <div><h1 className="text-2xl font-bold tracking-tight text-slate-950">Siswa binaan</h1><p className="mt-2 text-base leading-6 text-slate-600">Data siswa ditampilkan hanya untuk siswa yang ditugaskan kepadamu.</p>{meta && <p className="mt-1 text-sm text-slate-500">Tahun ajaran {meta.tahun_ajaran}</p>}</div>
      <Card>
        <div className="mb-4 max-w-md"><Input label="Cari siswa" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Nama, NIS, atau kelas…" /></div>
        {error && <p className="mb-4 rounded-xl bg-rose-50 p-3 text-sm text-rose-800">{error}</p>}
        {loading ? <div className="flex justify-center py-10"><LoadingSpinner label="Memuat siswa binaan…" /></div> : filtered.length === 0 ? (
          <EmptyState title={query ? 'Siswa tidak ditemukan' : 'Belum ada siswa binaan'} description={query ? 'Coba kata pencarian lain.' : 'Admin dapat menetapkan siswa binaan melalui menu penugasan.'} />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[680px] text-left text-sm">
              <thead><tr className="border-b border-slate-200 text-slate-500"><th className="px-3 py-3 font-semibold">Nama siswa</th><th className="px-3 py-3 font-semibold">NIS</th><th className="px-3 py-3 font-semibold">Kelas</th><th className="px-3 py-3 font-semibold">Jadwal minggu ini</th><th className="px-3 py-3 font-semibold">Refleksi</th><th className="px-3 py-3" /></tr></thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((student) => <tr key={student.id} className="hover:bg-slate-50"><td className="px-3 py-4 font-semibold text-slate-900">{student.nama}</td><td className="px-3 py-4 text-slate-600">{student.nis}</td><td className="px-3 py-4 text-slate-600">{student.kelas || '—'}</td><td className="px-3 py-4 text-slate-600">{student.jadwal_minggu_ini} kegiatan</td><td className="px-3 py-4"><Badge variant={student.status_pengisian === 'terisi' ? 'green' : 'yellow'}>{student.status_pengisian === 'terisi' ? 'Sudah terisi' : 'Belum terisi'}</Badge></td><td className="px-3 py-4 text-right"><Link to={`/guru/siswa/${student.id}`} className="font-semibold text-belajar-700 hover:text-belajar-900">Lihat detail →</Link></td></tr>)}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  )
}
