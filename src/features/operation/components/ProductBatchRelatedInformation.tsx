import './batch-history.css'
import { useState } from 'react'
import { ArrowDownToLine, ArrowUpFromLine, ArrowRightLeft, Check, ChevronDown, Clock3, UserRound, X, FileClock, ScanSearch, ClipboardCheck, PackageCheck, Lock, Truck, ClipboardX, PackageX, PackageOpen, ShieldCheck, AlertTriangle, CircleCheck, FileSearch } from 'lucide-react'
import { getProductBatchStatusPresentation } from '../productBatchStatus'
import ProductBatchStatusBadge from './ProductBatchStatusBadge'
import type { ProductBatchDetail } from '@/types/batch'

const time = (value: string | null) => {
  if (!value) return 'Chưa ghi nhận'
  const date = new Date(/(Z|[+-]\d{2}:\d{2})$/.test(value) ? value : `${value}Z`)
  return Number.isNaN(date.getTime()) ? 'Chưa ghi nhận' : date.toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' })
}
const number = (value: number) => value.toLocaleString('vi-VN', { maximumFractionDigits: 3 })
const text = (value: string | null) => value?.trim() || 'Chưa ghi nhận'
const statusLabels: Record<string, string> = {
  DRAFT: 'Phiếu nháp', IN_PROGRESS: 'Đang kiểm định', COMPLETED: 'Đã hoàn tất',
  COMMITTED: 'Đã xác nhận', PENDING: 'Chờ xử lý', APPROVED: 'Đã duyệt', REJECTED: 'Bị từ chối', CANCELLED: 'Đã hủy',
}
const transactionLabels: Record<string, string> = {
  GOODS_RECEIPT: 'Phiếu nhập kho', GOODS_ISSUE: 'Phiếu xuất kho',
  STOCK_TRANSFER: 'Chuyển kho', STOCK_ADJUSTMENT: 'Điều chỉnh tồn', STOCK_DISPOSAL: 'Loại bỏ toàn lô',
}
const card = 'rounded-xl border border-slate-200 bg-white p-5 shadow-sm'

export default function ProductBatchRelatedInformation({ batch, compactHistory = false }: { batch: ProductBatchDetail; compactHistory?: boolean }) {
  const qc = batch.latestQcInspection
  const history = batch.statusHistory ?? []
  const transactions = batch.warehouseTransactions ?? []
  return <>
    <section aria-label="Kết quả kiểm định QC" className={card}>
      <h2 className="text-lg font-bold text-slate-900">Kết quả kiểm định QC</h2>
      {!qc ? <p className="mt-3 text-sm text-slate-500">{compactHistory ? 'Chưa ghi nhận' : 'Chưa có phiếu kiểm định QC.'}</p> : <>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <span className="break-all font-mono font-semibold text-emerald-700">{qc.inspectionCode}</span>
          <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">{statusLabels[qc.inspectionStatus] ?? qc.inspectionStatus}</span>
          {qc.qcResult && <span className={`rounded-full px-3 py-1 text-xs font-semibold ${qc.qcResult === 'PASS' ? 'bg-emerald-50 text-emerald-700' : qc.qcResult === 'FAIL' ? 'bg-rose-50 text-rose-700' : 'bg-slate-100 text-slate-700'}`}>
            {qc.qcResult === 'PASS' ? 'Đạt (PASS)' : qc.qcResult === 'FAIL' ? 'Không đạt (FAIL)' : qc.qcResult}
          </span>}
        </div>
        {(qc.inspectionStatus !== 'COMPLETED' || !qc.qcResult) && <p className="mt-3 text-sm text-amber-700">Phiếu QC mới nhất chưa có kết quả cuối cùng.</p>}
        <dl className="mt-4 grid gap-4 text-sm sm:grid-cols-2 lg:grid-cols-3">
          <Field label="Hạng chất lượng đã lưu" value={text(qc.qualityGrade)} />
          <Field label="Nhân viên QC" value={text(qc.qcStaffName)} />
          <Field label="Thời điểm phiếu QC" value={time(qc.startedAt)} />
          <Field label="Hoàn tất kiểm định" value={time(qc.completedAt)} />
        </dl>
        {qc.note?.trim() && <p className="mt-4 whitespace-pre-wrap break-words text-sm text-slate-700">Ghi chú QC: {qc.note}</p>}
      </>}
    </section>

    <section aria-label="Lịch sử lô hàng" className={`${card} saw-batch-history`}>
      <div className="saw-history-title"><h2>Lịch sử lô hàng</h2><span>{history.length} hoạt động</span></div>
      {!compactHistory && <h3>Thay đổi trạng thái</h3>}
      {compactHistory ? <HistoryTimeline history={history} /> : !history.length ? <p className="saw-history-empty">Chưa có lịch sử trạng thái.</p> : <ol className="saw-history-timeline">
        {history.map(item => {
          const presentation = getProductBatchStatusPresentation(item.newStatus)
          return <li key={item.id} className="saw-timeline-item">
            <span className={`saw-timeline-icon saw-timeline-icon--${presentation.tone}`} aria-hidden="true">{presentation.tone === 'red' ? <X /> : presentation.tone === 'green' ? <Check /> : <Clock3 />}</span>
            <div className="saw-timeline-content">
              <div className="saw-timeline-heading"><strong>{presentation.label}</strong><time>{time(item.changedAt)}</time></div>
              <div className="saw-timeline-status">{item.oldStatus ? <ProductBatchStatusBadge status={item.oldStatus} /> : <span>—</span>}<span aria-label="chuyển sang">→</span><ProductBatchStatusBadge status={item.newStatus} /></div>
              {item.changedByName && <p className="saw-timeline-person"><UserRound aria-hidden="true" /> Người thực hiện: {item.changedByName}</p>}
              {item.changeReason && <p className="saw-history-note">{item.changeReason}</p>}
            </div>
          </li>
        })}
      </ol>}
      <h3 className="saw-transactions-title">Giao dịch kho đã lưu</h3>
      {!transactions.length ? <p className="saw-history-empty">Chưa có giao dịch kho.</p> : <div className="saw-transaction-list">
        {transactions.map(item => <Transaction key={`${item.transactionType}:${item.id}`} item={item} />)}
      </div>}
    </section>
  </>
}

function Field({ label, value }: { label: string; value: string }) {
  return <div><dt className="text-slate-500">{label}</dt><dd className="mt-1 font-medium text-slate-800">{value}</dd></div>
}

function Transaction({ item }: { item: NonNullable<ProductBatchDetail['warehouseTransactions']>[number] }) {
  const [open, setOpen] = useState(false)
  const Icon = item.transactionType === 'GOODS_RECEIPT' ? ArrowDownToLine : item.transactionType === 'GOODS_ISSUE' ? ArrowUpFromLine : ArrowRightLeft
  return <div className={`saw-transaction-item${open ? ' is-open' : ''}`}>
    <button type="button" className="saw-transaction-header" aria-expanded={open} onClick={() => setOpen(value => !value)}>
      <span className={`saw-transaction-icon${item.transactionType === 'GOODS_ISSUE' ? ' is-issue' : ''}`}><Icon aria-hidden="true" /></span>
      <span className="saw-transaction-main"><strong>{transactionLabels[item.transactionType] ?? item.transactionType}</strong><span className="saw-transaction-code">{item.code}</span><time>{time(item.recordedAt)}</time></span>
      <span className="saw-transaction-meta"><strong>{number(item.quantity)} {item.unit}</strong><span>{statusLabels[item.status] ?? item.status}</span></span>
      <ChevronDown className="saw-transaction-chevron" aria-hidden="true" />
    </button>
    <div className="saw-transaction-collapse" inert={!open}><div><dl className="saw-transaction-content">
      <Field label="Số lượng" value={`${number(item.quantity)} ${item.unit}`} />
      {item.weightInKg !== null && <Field label="Khối lượng" value={`${number(item.weightInKg)} kg`} />}
      {item.fromLocationName && <Field label="Từ vị trí" value={item.fromLocationName} />}
      {item.toLocationName && <Field label="Đến vị trí" value={item.toLocationName} />}
      {item.performedByName && <Field label="Người thực hiện / lập phiếu" value={item.performedByName} />}
      {item.note && <Field label="Ghi chú" value={item.note} />}
    </dl></div></div>
  </div>
}

const historyIcons: Record<string, typeof FileClock> = {
  PENDING_PREDECLARATION: FileClock, SUBMITTED: FileClock, PENDING_APPROVAL: FileClock,
  PENDING_QC: ScanSearch, IN_QC: ScanSearch, APPROVED: ClipboardCheck, APPROVED_FOR_STORAGE: ClipboardCheck,
  COMMITTED: PackageCheck, IN_STOCK: PackageCheck, STORED: PackageCheck, RESERVED: Lock,
  ISSUED: Truck, RELEASED: Truck, PARTIALLY_ISSUED: Truck, PARTIALLY_RELEASED: Truck,
  QC_FAILED: ClipboardX, REJECTED: ClipboardX, DISPOSED: PackageX, CANCELLED: PackageX, CANCELED: PackageX,
  RECEIVING: PackageOpen, RECEIVED: PackageCheck, QC_PASSED: ShieldCheck, QUARANTINE: AlertTriangle,
  EXPIRED: AlertTriangle, AVAILABLE: CircleCheck,
}
function historyDate(value: string) {
  const date = new Date(/(Z|[+-]\d{2}:\d{2})$/.test(value) ? value : `${value}Z`)
  if (Number.isNaN(date.getTime())) return { day: 'Chưa ghi nhận ngày', clock: '—' }
  return { day: date.toLocaleDateString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh', day: 'numeric', month: 'long', year: 'numeric' }), clock: date.toLocaleTimeString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false }) }
}
function HistoryTimeline({ history }: { history: ProductBatchDetail['statusHistory'] }) {
  if (!history?.length) return <p className="saw-history-empty">Chưa có lịch sử trạng thái.</p>
  const groups: { day: string; items: typeof history }[] = []
  for (const item of history) {
    const day = historyDate(item.changedAt).day
    const last = groups[groups.length - 1]
    if (last?.day === day) last.items.push(item)
    else groups.push({ day, items: [item] })
  }
  return <div className="saw-timeline-groups">{groups.map((group, index) => <div className="saw-timeline-group" key={`${group.day}-${index}`}>
    <h3 className="saw-timeline-date">{group.day}</h3>
    <ol className="saw-history-timeline">{group.items.map(item => <HistoryItem key={item.id} item={item} />)}</ol>
  </div>)}</div>
}
function HistoryItem({ item }: { item: NonNullable<ProductBatchDetail['statusHistory']>[number] }) {
  const [open, setOpen] = useState(false)
  const presentation = getProductBatchStatusPresentation(item.newStatus)
  const Icon = historyIcons[item.newStatus.trim().toUpperCase()] ?? FileSearch
  return <li className="saw-timeline-item saw-timeline-compact">
    <span className={`saw-timeline-icon saw-timeline-icon--${presentation.tone}`}><Icon aria-hidden="true" /></span>
    <div className="saw-timeline-content"><button type="button" className="saw-timeline-toggle" aria-expanded={open} onClick={() => setOpen(value => !value)}>
      <span className="saw-timeline-primary"><strong>{presentation.label}</strong><span className="saw-timeline-actor"><UserRound aria-hidden="true" />{item.changedByName?.trim() || 'Chưa ghi nhận người thực hiện'}</span></span>
      <time className="saw-timeline-time">{historyDate(item.changedAt).clock}</time><ChevronDown className="saw-timeline-chevron" aria-hidden="true" />
    </button><div className={`saw-timeline-collapse${open ? ' is-open' : ''}`} inert={!open}><div><dl className="saw-timeline-details">
      <Field label="Trạng thái trước" value={item.oldStatus ? getProductBatchStatusPresentation(item.oldStatus).label : 'Chưa có'} />
      <Field label="Trạng thái sau" value={presentation.label} />
      <Field label="Người thực hiện" value={item.changedByName?.trim() || 'Chưa ghi nhận người thực hiện'} />
      <Field label="Thời gian" value={time(item.changedAt)} />
      {item.changeReason && <Field label="Ghi chú / lý do" value={item.changeReason} />}
    </dl></div></div></div>
  </li>
}
