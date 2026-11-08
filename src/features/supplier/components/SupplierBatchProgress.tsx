import { AlertCircle, Check, Circle, Clock3, History, Route } from 'lucide-react';
import type { getSupplierBatchProgress, ProgressState } from '../batchProgress';
import { supplierBatchStatusLabel } from '../batchStatus';

type Progress = ReturnType<typeof getSupplierBatchProgress>;
const tones: Record<ProgressState, string> = {
  complete: 'border-emerald-600 bg-emerald-600 text-white',
  current: 'border-emerald-600 bg-emerald-50 text-emerald-700 ring-4 ring-emerald-50',
  pending: 'border-gray-200 bg-white text-gray-300',
  stopped: 'border-red-500 bg-red-50 text-red-600',
  warning: 'border-amber-500 bg-amber-50 text-amber-600',
};

export function SupplierBatchProgress({ progress, formatTime }: { progress: Progress; formatTime: (value: string) => string }) {
  return <aside className="min-w-0 space-y-6">
    <section className="rounded-2xl border border-gray-200 bg-white p-5 sm:p-6" aria-labelledby="batch-progress-heading">
      <div className="mb-5 flex items-center gap-3">
        <span className="rounded-xl bg-emerald-50 p-2 text-emerald-700"><Route size={20} /></span>
        <h2 id="batch-progress-heading" className="font-semibold text-gray-900">Lịch sử xử lý lô hàng</h2>
      </div>
      <ol>
        {progress.steps.map((step, index) => {
          const active = step.state !== 'pending';
          const Icon = step.state === 'complete' ? Check : step.state === 'current' ? Clock3 : ['stopped', 'warning'].includes(step.state) ? AlertCircle : Circle;
          return <li key={step.id} aria-current={step.state === 'current' ? 'step' : undefined}>
            {(index === 0 || step.phase !== progress.steps[index - 1].phase) &&
              <p className={`mb-3 text-xs font-semibold uppercase tracking-wide text-gray-500 ${index > 0 ? 'mt-3' : ''}`}>{step.phase}</p>}
            {index === 1 && progress.fallbackRejection &&
              <p className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{progress.fallbackRejection}</p>}
            <div className="relative flex gap-3 pb-5">
              {index < progress.steps.length - 1 && <span aria-hidden="true" className={`absolute bottom-0 left-[13px] top-7 w-0.5 ${step.state === 'complete' ? 'bg-emerald-200' : 'bg-gray-200'}`} />}
              <span aria-hidden="true" className={`relative z-10 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-2 ${tones[step.state]}`}><Icon size={14} /></span>
              <div className="min-w-0 pt-0.5">
                <p className={`text-sm font-semibold ${step.state === 'stopped' ? 'text-red-700' : step.state === 'warning' ? 'text-amber-700' : active ? 'text-gray-900' : 'text-gray-400'}`}>{step.label}</p>
                <p className={`mt-1 text-xs ${step.state === 'stopped' ? 'text-red-600' : step.state === 'warning' ? 'text-amber-700' : step.state === 'current' ? 'text-emerald-700' : 'text-gray-500'}`}>
                  {step.state === 'complete' ? 'Hoàn tất' : step.state === 'current' ? 'Giai đoạn hiện tại' : step.state === 'stopped' ? 'Đã dừng xử lý' : step.state === 'warning' ? 'Đang cách ly' : 'Chưa đến giai đoạn'}
                </p>
                {active && step.at && <p className="mt-1 text-xs text-gray-500">{formatTime(step.at)}</p>}
                {active && step.note && <p className={`mt-2 whitespace-pre-wrap break-words rounded-lg p-2.5 text-xs leading-relaxed ${step.state === 'stopped' ? 'bg-red-50 text-red-700' : step.state === 'warning' ? 'bg-amber-50 text-amber-800' : 'bg-emerald-50 text-emerald-800'}`}>{step.note}</p>}
              </div>
            </div>
          </li>;
        })}
      </ol>
    </section>
    <section className="rounded-2xl border border-gray-200 bg-white p-5 sm:p-6" aria-labelledby="batch-status-history-heading">
      <div className="mb-4 flex items-center gap-3">
        <span className="rounded-xl bg-emerald-50 p-2 text-emerald-700"><History size={20} /></span>
        <h2 id="batch-status-history-heading" className="font-semibold text-gray-900">Lịch sử trạng thái</h2>
      </div>
      {progress.history.length > 0 ? <div role="region" aria-labelledby="batch-status-history-heading" tabIndex={0} className="max-h-[360px] overflow-y-auto rounded-lg pr-2 focus-visible:outline-2 focus-visible:outline-emerald-600">
        <ol className="space-y-4">{progress.history.map((item, index) => <li key={`${index}-${item.changedAt}`} className="border-l-2 border-emerald-200 pl-3">
          <p className="break-words text-sm font-medium text-gray-900">{item.oldStatus ? `${supplierBatchStatusLabel(item.oldStatus)} → ` : ''}{supplierBatchStatusLabel(item.newStatus)}</p>
          <p className="mt-1 text-xs text-gray-500">{formatTime(item.changedAt)}</p>
          {item.changedBy && <p className="mt-1 break-words text-xs text-gray-600">{item.changedBy}</p>}
          {item.changeReason && <p className="mt-2 whitespace-pre-wrap break-words text-sm text-gray-600">{item.changeReason}</p>}
        </li>)}</ol>
      </div> : <p className="rounded-lg bg-gray-50 p-3 text-sm text-gray-500">Chưa có lịch sử trạng thái.</p>}
    </section>
  </aside>;
}
