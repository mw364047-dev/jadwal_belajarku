import { useCallback, useEffect, useState } from 'react'
import { api } from '../../services/api.js'
import { Badge, Card, EmptyState, LoadingSpinner } from '../../components/index.js'

const labels = {
  klasikal: 'Klasikal',
  kelompok: 'Kelompok',
  individual: 'Individual',
  informasi: 'Informasi',
  tindak_lanjut: 'Tindak lanjut',
}

function formatDate(value) {
  if (!value) return '—'
  const date = new Date(`${value}T00:00:00`)
  return Number.isNaN(date.getTime()) ? value : new Intl.DateTimeFormat('id-ID', { dateStyle: 'long' }).format(date)
}

export default function SiswaLayananPage() {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const response = await api.get('/api/siswa/layanan')
      setItems(Array.isArray(response.data?.data) ? response.data.data : [])
    } catch (requestError) {
      setError(requestError?.response?.data?.message || 'Ringkasan layanan belum dapat dimuat. Silakan coba kembali.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  return (
    <div className="space-y-6">
      <section>
        <Badge variant="blue">Informasi pendampingan</Badge>
        <h1 className="mt-3 text-2xl font-bold tracking-tight text-slate-950">Ringkasan layanan BK</h1>
        <p className="mt-2 max-w-3xl text-base leading-6 text-slate-600">Di sini kamu dapat melihat jenis layanan BK dan tanggal layanan yang tercatat untukmu atau kelasmu.</p>
      </section>

      <Card title="Riwayat layanan" description="Halaman ini hanya menampilkan jenis dan tanggal. Topik pembahasan serta tindak lanjut tidak ditampilkan.">
        {error && <div className="mb-4 rounded-xl border border-rose-200 bg-rose-50 p-3 text-base text-rose-800" role="alert">{error}</div>}
        {loading ? <div className="flex justify-center py-10"><LoadingSpinner label="Memuat ringkasan layanan…" /></div> : items.length === 0 ? (
          <EmptyState title="Belum ada layanan yang tercatat" description="Informasi layanan akan muncul di sini ketika ada layanan BK yang dicatat untukmu atau kelasmu." />
        ) : (
          <div className="divide-y divide-slate-100">
            {items.map((item, index) => (
              <article key={`${item.jenis_layanan}-${item.tanggal}-${index}`} className="flex flex-wrap items-center justify-between gap-3 py-4 first:pt-0 last:pb-0">
                <div><p className="font-semibold text-slate-900">{labels[item.jenis_layanan] || item.jenis_layanan}</p><p className="mt-1 text-sm text-slate-500">Tanggal layanan</p></div>
                <div className="text-right"><Badge variant="blue">{labels[item.jenis_layanan] || item.jenis_layanan}</Badge><p className="mt-2 text-sm text-slate-600">{formatDate(item.tanggal)}</p></div>
              </article>
            ))}
          </div>
        )}
      </Card>

      <Card className="border-belajar-100 bg-belajar-50/60">
        <p className="font-semibold text-slate-900">Butuh bantuan terkait kegiatan belajar?</p>
        <p className="mt-2 text-base leading-6 text-slate-600">Guru BK dapat membantu kamu meninjau rencana belajar. Kamu bisa menghubungi Guru BK melalui mekanisme yang berlaku di sekolah.</p>
      </Card>
    </div>
  )
}
