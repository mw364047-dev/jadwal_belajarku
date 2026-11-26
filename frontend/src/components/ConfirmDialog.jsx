import Button from './Button.jsx'
import Modal from './Modal.jsx'

export default function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title = 'Konfirmasi tindakan',
  description = 'Periksa kembali perubahan yang akan dilakukan sebelum melanjutkan.',
  confirmLabel = 'Konfirmasi tindakan',
  cancelLabel = 'Batal',
  loading = false,
  danger = true,
}) {
  return (
    <Modal open={open} onClose={loading ? undefined : onClose} title={title} description={description} size="sm">
      <div className="flex flex-col-reverse gap-3 border-t border-ink/20 pt-4 sm:flex-row sm:justify-end">
        <Button variant="outline" onClick={onClose} disabled={loading}>Batal</Button>
        <Button variant={danger ? 'danger' : 'primary'} onClick={onConfirm} loading={loading} className="min-w-32">
          {confirmLabel}
        </Button>
      </div>
    </Modal>
  )
}
