import { useCallback, useEffect, useState } from 'react'
import { api } from '../../services/api.js'
import { Badge, Button, Card, Input, LoadingSpinner } from '../../components/index.js'

const labels = {
  klasikal: 'Klasikal',
  kelompok: 'Kelompok',
  individual: 'Individual',
  informasi: 'Informasi',
  tindak_lanjut: 'Tindak lanjut',
}

function formatMonth(value) {
  if (!value) return '—'
  const [year, month] = value.split('-').map(Number)
  return new Intl.DateTimeFormat('id-ID', { month: 'long', year: 'numeric' }).format(new Date(year, month - 1, 1))
}

function getErrorMessage(error) {
  return error?.response?.data?.message || 'Rekap layanan belum dapat dimuat. Silakan coba kembali.'
}

export default function GuruRekapLayananPage() {
  const [filters, setFilters] = useState({ tanggal_mulai: '', tanggal_selesai: '' })
  const [applied, setApplied] = useState({ tanggal_mulai: '', tanggal_selesai: '' })
  const [data, setData] = useState({ total: 0, per_jenis: [], per_bulan: [] })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const loadData = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const response = await api.get('/api/guru/layanan/rekap', { params: applied })
      setData({
        total: response.data?.total || 0,
        per_jenis: response.data?.per_jenis || [],
        per_bulan: response.data?.per_bulan || [],
      })
    } catch (requestError) {
      setError(getErrorMessage(requestError))
    } finally {
      setLoading(false)
    }
  }, [applied])

  useEffect(() => { loadData() }, [loadData])

  function submitFilters(event) {
    event.preventDefault()
    setApplied({ ...filters })
  }

  function resetFilters() {
    const empty = { tanggal_mulai: '', tanggal_selesai: '' }
    setFilters(empty)
    setApplied(empty)
  }

  return (
    <div className="space-y-6">
      <section>
        <Badge variant="blue">Ruang Guru BK</Badge>
        <h1 className="mt-3 text-2xl font-bold tracking-tight text-slate-950">Rekap layanan BK</h1>
        <p className="mt-2 max-w-3xl text-base leading-6 text-slate-600">
          Lihat ringkasan layanan yang telah kamu catat berdasarkan jenis dan bulan. Data ini hanya mencakup catatan milik akunmu.
        </p>
      </section>

      <Card title="Filter periode" description="Pilih rentang tanggal untuk melihat ringkasan layanan pada periode tertentu.">
        <form onSubmit={submitFilters} className="grid gap-4 md:grid-cols-3">
          <Input label="Tanggal mulai" type="date" value={filters.tanggal_mulai} max={filters.tanggal_selesai || undefined} onChange={(event) => setFilters((current) => ({ ...current, tanggal_mulai: event.target.value }))} />
          <Input label="Tanggal selesai" type="date" min={filters.tanggal_mulai || undefined} value={filters.tanggal_selesai} onChange={(event) => setFilters((current) => ({ ...current, tanggal_selesai: event.target.value }))} />
          <div className="flex items-end gap-2">
            <Button type="submit">Terapkan</Button>
            <Button type="button" variant="outline" onClick={resetFilters}>Reset</Button>
          </div>
        </form>
      </Card>

      {error && <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">{error}</div>}

      {loading ? (
        <div className="flex justify-center py-12"><LoadingSpinner label="Memuat rekap layanan…" /></div>
      ) : (
        <>
          <Card>
            <p className="text-sm font-semibold text-slate-500">Total layanan pada periode ini</p>
            <p className="mt-2 text-3xl font-bold tabular-nums text-slate-950">{data.total.toLocaleString('id-ID')}</p>
          </Card>

          <section className="space-y-3">
            <div>
              <h2 className="text-lg font-bold text-slate-900">Jumlah berdasarkan jenis layanan</h2>
              <p className="text-sm text-slate-500">Ringkasan catatan yang kamu buat.</p>
            </div>
            {data.per_jenis.length ? (
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {data.per_jenis.map((item) => (
                  <Card key={item.jenis_layanan}>
                    <p className="text-sm font-semibold text-slate-500">{labels[item.jenis_layanan] || item.jenis_layanan}</p>
                    <p className="mt-2 text-3xl font-bold tabular-nums text-slate-950">{item.jumlah}</p>
                    <p className="mt-1 text-sm text-slate-500">catatan layanan</p>
                  </Card>
                ))}
              </div>
            ) : (
              <Card><p className="py-4 text-center text-sm text-slate-600">Belum ada catatan pada periode ini. Catatan layanan yang kamu buat akan muncul di sini.</p></Card>
            )}
          </section>

          <Card title="Ringkasan per bulan" description="Jumlah layanan yang tercatat pada setiap bulan.">
            {data.per_bulan.length ? (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[360px] text-left text-sm">
                  <thead><tr className="border-b border-slate-200 text-slate-500"><th className="px-3 py-3 font-semibold">Bulan</th><th className="px-3 py-3 text-right font-semibold">Jumlah layanan</th></tr></thead>
                  <tbody>
                    {data.per_bulan.map((item) => (
                      <tr key={item.bulan} className="border-b border-slate-100 last:border-0">
                        <td className="px-3 py-3 font-medium text-slate-800">{formatMonth(item.bulan)}</td>
                        <td className="px-3 py-3 text-right tabular-nums text-slate-700">{item.jumlah}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : <p className="py-4 text-center text-sm text-slate-600">Belum ada ringkasan bulanan untuk ditampilkan.</p>}
          </Card>
        </>
      )}
    </div>
  )
}
