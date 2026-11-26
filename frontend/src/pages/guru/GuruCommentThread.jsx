import { useState } from 'react'
import { api } from '../../services/api.js'
import { useToast } from '../../components/ToastProvider.jsx'
import { Button, ConfirmDialog, Textarea } from '../../components/index.js'

function messageFrom(error, fallback) {
  const errors = error?.response?.data?.errors
  const first = errors ? Object.values(errors).flat()?.[0] : null
  return first || error?.response?.data?.message || fallback
}

function formatDate(value) {
  if (!value) return ''
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? '' : new Intl.DateTimeFormat('id-ID', { dateStyle: 'medium', timeStyle: 'short' }).format(date)
}

export default function GuruCommentThread({ comments = [], targetField, targetId, onChanged, disabled = false }) {
  const { showToast } = useToast()
  const [draft, setDraft] = useState('')
  const [editingId, setEditingId] = useState(null)
  const [editingText, setEditingText] = useState('')
  const [saving, setSaving] = useState(false)
  const [deletingId, setDeletingId] = useState(null)
  const [deleteOpen, setDeleteOpen] = useState(false)

  async function submitNew(event) {
    event.preventDefault()
    if (draft.trim().length < 2) return
    setSaving(true)
    try {
      await api.post('/api/guru/komentar', { [targetField]: targetId, isi: draft.trim() })
      setDraft('')
      showToast('Komentar berhasil dikirim.', { variant: 'success' })
      onChanged?.()
    } catch (error) {
      showToast(messageFrom(error, 'Komentar belum berhasil dikirim. Coba lagi.'), { variant: 'danger' })
    } finally {
      setSaving(false)
    }
  }

  async function saveEdit(id) {
    if (editingText.trim().length < 2) return
    setSaving(true)
    try {
      await api.put(`/api/guru/komentar/${id}`, { isi: editingText.trim() })
      setEditingId(null)
      setEditingText('')
      showToast('Komentar berhasil diperbarui.', { variant: 'success' })
      onChanged?.()
    } catch (error) {
      showToast(messageFrom(error, 'Perubahan komentar belum berhasil disimpan.'), { variant: 'danger' })
    } finally {
      setSaving(false)
    }
  }

  async function deleteComment() {
    if (!deletingId) return
    setSaving(true)
    try {
      await api.delete(`/api/guru/komentar/${deletingId}`)
      setDeleteOpen(false)
      setDeletingId(null)
      showToast('Komentar berhasil dihapus.', { variant: 'success' })
      onChanged?.()
    } catch (error) {
      showToast(messageFrom(error, 'Komentar belum berhasil dihapus.'), { variant: 'danger' })
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="mt-4 border-t border-slate-200 pt-3">
      <h4 className="text-sm font-bold text-slate-800">Komentar dan umpan balik</h4>
      {comments.length === 0 ? (
        <p className="mt-2 text-sm text-slate-500">Belum ada komentar untuk bagian ini.</p>
      ) : (
        <div className="mt-3 space-y-2">
          {comments.map((comment) => (
            <article key={comment.id} className="rounded-xl border border-belajar-100 bg-belajar-50/60 p-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm font-bold text-slate-900">{comment.guru || 'Guru BK'}</p>
                <time className="text-xs text-slate-500">{formatDate(comment.created_at)}</time>
              </div>
              {editingId === comment.id ? (
                <div className="mt-2 space-y-2">
                  <Textarea rows={3} value={editingText} onChange={(event) => setEditingText(event.target.value)} maxLength={5000} />
                  <div className="flex flex-wrap gap-2">
                    <Button size="sm" onClick={() => saveEdit(comment.id)} loading={saving}>Simpan</Button>
                    <Button size="sm" variant="outline" onClick={() => setEditingId(null)} disabled={saving}>Batal</Button>
                  </div>
                </div>
              ) : (
                <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-6 text-slate-700">{comment.isi}</p>
              )}
              {comment.can_manage && editingId !== comment.id && (
                <div className="mt-2 flex flex-wrap gap-2">
                  <Button size="sm" variant="outline" onClick={() => { setEditingId(comment.id); setEditingText(comment.isi) }}>Ubah</Button>
                  <Button size="sm" variant="danger" onClick={() => { setDeletingId(comment.id); setDeleteOpen(true) }}>Hapus</Button>
                </div>
              )}
            </article>
          ))}
        </div>
      )}

      {disabled ? (
        <p className="mt-3 rounded-lg bg-slate-50 p-3 text-sm leading-5 text-slate-600">Siswa memilih untuk menyimpan refleksi ini secara pribadi. Isi dan komentar refleksi tidak tersedia untuk ditinjau.</p>
      ) : (
        <form onSubmit={submitNew} className="mt-3 space-y-2">
          <Textarea label="Tulis umpan balik" rows={2} value={draft} onChange={(event) => setDraft(event.target.value)} maxLength={5000} placeholder="Tuliskan tanggapan yang membantu siswa meninjau rencananya…" />
          <div className="flex justify-end"><Button type="submit" size="sm" loading={saving} disabled={draft.trim().length < 2}>Kirim komentar</Button></div>
        </form>
      )}

      <ConfirmDialog
        open={deleteOpen}
        onClose={() => !saving && setDeleteOpen(false)}
        onConfirm={deleteComment}
        loading={saving}
        title="Hapus komentar ini?"
        description="Komentar akan dihapus dari halaman siswa."
        confirmLabel="Ya, hapus komentar"
      />
    </div>
  )
}
