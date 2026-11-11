import { createPortal } from 'react-dom'
import { AlertCircle, CheckCircle2, X } from 'lucide-react'

interface Props {
  message: string
  tone?: 'error' | 'success'
  onDismiss: () => void
  onViewErrors?: () => void
}

export default function FormNotification({ message, tone = 'error', onDismiss, onViewErrors }: Props) {
  if (!message) return null
  const Icon = tone === 'error' ? AlertCircle : CheckCircle2
  return createPortal(
    <div className="pointer-events-none fixed inset-x-4 bottom-5 z-[100] sm:inset-x-auto sm:right-6 sm:w-[26rem]" data-form-notification>
      <div role={tone === 'error' ? 'alert' : 'status'} aria-atomic="true"
        className={`pointer-events-auto max-h-[70vh] overflow-y-auto rounded-2xl border bg-white p-4 shadow-xl ${tone === 'error' ? 'border-rose-300 text-rose-800' : 'border-emerald-300 text-emerald-800'}`}>
        <div className="flex items-start gap-3">
          <Icon className="mt-0.5 size-5 shrink-0" aria-hidden="true" />
          <div className="min-w-0 flex-1">
            <p className="break-words text-sm font-medium leading-6">{message}</p>
            {onViewErrors && <button type="button" onClick={onViewErrors} className="mt-2 min-h-9 text-sm font-semibold underline underline-offset-4">Xem ô cần sửa</button>}
          </div>
          <button type="button" aria-label="Đóng thông báo" onClick={onDismiss} className="grid size-9 shrink-0 place-items-center rounded-lg hover:bg-slate-100"><X className="size-4" /></button>
        </div>
      </div>
    </div>, document.body,
  )
}
