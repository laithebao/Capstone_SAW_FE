import { useEffect, useId, useRef } from 'react';
import { CheckCircle2, Loader2, TriangleAlert } from 'lucide-react';

interface Props {
  variant: 'success' | 'confirm';
  title: string;
  description: string;
  onClose: () => void;
  onConfirm?: () => void;
  busy?: boolean;
  error?: string;
}

export function SupplierBatchFeedbackDialog({ variant, title, description, onClose, onConfirm, busy = false, error }: Props) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const descriptionId = useId();
  const success = variant === 'success';
  useEffect(() => {
    const dialog = dialogRef.current;
    dialog?.showModal();
    return () => { dialog?.close(); };
  }, []);

  return <dialog ref={dialogRef} aria-labelledby={titleId} aria-describedby={descriptionId}
    onCancel={event => { event.preventDefault(); if (!busy) onClose(); }}
    className="fixed inset-0 m-auto w-[calc(100%_-_2rem)] max-w-md rounded-2xl border-0 bg-white p-0 text-gray-900 shadow-2xl backdrop:bg-gray-950/40 backdrop:backdrop-blur-sm">
    <div className="p-6 sm:p-8">
      <div className={`mb-5 flex h-14 w-14 items-center justify-center rounded-2xl ${success ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'}`}>
        {success ? <CheckCircle2 size={30} /> : <TriangleAlert size={30} />}
      </div>
      <h2 id={titleId} className="text-lg font-semibold">{title}</h2>
      <p id={descriptionId} className="mt-2 text-sm leading-relaxed text-gray-500">{description}</p>
      {error && <p role="alert" className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}
      <div className="mt-6 flex justify-end gap-3">
        {!success && <button type="button" disabled={busy} onClick={onClose}
          className="rounded-lg border border-gray-200 px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50">Giữ lô hàng</button>}
        <button type="button" disabled={busy} onClick={success ? onClose : onConfirm}
          className={`flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium text-white disabled:opacity-50 ${success ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-red-600 hover:bg-red-700'}`}>
          {busy && <Loader2 size={16} className="animate-spin" />}
          {success ? 'Đã hiểu' : busy ? 'Đang hủy...' : 'Xác nhận hủy lô'}
        </button>
      </div>
    </div>
  </dialog>;
}
