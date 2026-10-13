import { Link } from 'react-router'
import { ROUTES } from '@/constants/routes'
import ProductBatchStatusBadge from './ProductBatchStatusBadge'
import GoodsReceiptStatusBadge from './GoodsReceiptStatusBadge'
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
  STOCK_TRANSFER: 'Chuyển kho', STOCK_ADJUSTMENT: 'Điều chỉnh tồn',
}
const card = 'rounded-xl border border-slate-200 bg-white p-5 shadow-sm'

export default function ProductBatchRelatedInformation({ batch }: { batch: ProductBatchDetail }) {
  const qc = batch.latestQcInspection
  const receipts = batch.goodsReceipts ?? []
  const history = batch.statusHistory ?? []
  const transactions = batch.warehouseTransactions ?? []
  return <>
    <section aria-label="Kết quả kiểm định QC" className={card}>
      <h2 className="text-lg font-bold text-slate-900">Kết quả kiểm định QC</h2>
      {!qc ? <p className="mt-3 text-sm text-slate-500">Chưa có phiếu kiểm định QC.</p> : <>
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

    <section aria-label="Phiếu nhập liên quan" className={card}>
      <h2 className="text-lg font-bold text-slate-900">Phiếu nhập liên quan</h2>
      {!receipts.length ? <p className="mt-3 text-sm text-slate-500">Chưa có phiếu nhập.</p> : <div className="mt-4 overflow-x-auto">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead className="border-b border-slate-200 text-xs uppercase text-slate-500"><tr>
            <th className="p-3">Mã phiếu</th><th className="p-3">Trạng thái</th><th className="p-3">Ngày nhận</th><th className="p-3">Vị trí kho</th><th className="p-3">Người lập</th>
          </tr></thead>
          <tbody>{receipts.map(receipt => <tr key={receipt.id} className="border-b border-slate-100 last:border-0">
            <td className="p-3"><Link aria-label={`Xem phiếu nhập ${receipt.receiptCode}`} className="font-mono font-semibold text-emerald-700 underline hover:text-emerald-900" to={ROUTES.OPERATION_GOODS_RECEIPT_DETAIL.replace(':id', String(receipt.id))}>{receipt.receiptCode}</Link></td>
            <td className="p-3"><GoodsReceiptStatusBadge status={receipt.receiptStatus} /></td>
            <td className="p-3">{receipt.receivedAt.slice(0, 10).split('-').reverse().join('/')}</td>
            <td className="p-3">{text(receipt.locationName)}</td><td className="p-3">{text(receipt.operationStaffName)}</td>
          </tr>)}</tbody>
        </table>
      </div>}
    </section>

    <section aria-label="Lịch sử lô hàng" className={card}>
      <h2 className="text-lg font-bold text-slate-900">Lịch sử lô hàng</h2>
      <h3 className="mt-4 text-sm font-semibold text-slate-700">Thay đổi trạng thái</h3>
      {!history.length ? <p className="mt-2 text-sm text-slate-500">Chưa có lịch sử trạng thái.</p> : <ol className="mt-3 space-y-3">
        {history.map(item => <li key={item.id} className="rounded-lg border border-slate-100 bg-slate-50 p-4">
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <time className="mr-2 text-slate-500">{time(item.changedAt)}</time>
            {item.oldStatus ? <ProductBatchStatusBadge status={item.oldStatus} /> : <span className="text-slate-500">—</span>}
            <span aria-label="chuyển sang">→</span><ProductBatchStatusBadge status={item.newStatus} />
          </div>
          {item.changedByName && <p className="mt-2 text-sm text-slate-700">Người thực hiện: {item.changedByName}</p>}
          {item.changeReason && <p className="mt-2 whitespace-pre-wrap break-words text-sm text-slate-700">{item.changeReason}</p>}
        </li>)}
      </ol>}
      <h3 className="mt-6 text-sm font-semibold text-slate-700">Giao dịch kho đã lưu</h3>
      {!transactions.length ? <p className="mt-2 text-sm text-slate-500">Chưa có giao dịch kho.</p> : <div className="mt-3 space-y-3">
        {transactions.map(item => <div key={`${item.transactionType}:${item.id}`} className="rounded-lg border border-slate-100 p-4 text-sm">
          <div className="flex flex-wrap justify-between gap-2"><p className="font-semibold text-slate-800">{transactionLabels[item.transactionType] ?? item.transactionType} · <span className="break-all font-mono">{item.code}</span></p><time className="text-slate-500">{time(item.recordedAt)}</time></div>
          <p className="mt-2 text-slate-700">{statusLabels[item.status] ?? item.status} · {number(item.quantity)} {item.unit}{item.weightInKg !== null && ` · ${number(item.weightInKg)} kg`}</p>
          {(item.fromLocationName || item.toLocationName) && <p className="mt-2 text-slate-600">{item.fromLocationName && `Từ: ${item.fromLocationName}`}{item.fromLocationName && item.toLocationName && ' → '}{item.toLocationName && `Đến: ${item.toLocationName}`}</p>}
          {item.performedByName && <p className="mt-2 text-slate-600">Người thực hiện / lập phiếu: {item.performedByName}</p>}
          {item.note && <p className="mt-2 whitespace-pre-wrap break-words text-slate-700">{item.note}</p>}
        </div>)}
      </div>}
    </section>
  </>
}

function Field({ label, value }: { label: string; value: string }) {
  return <div><dt className="text-slate-500">{label}</dt><dd className="mt-1 font-medium text-slate-800">{value}</dd></div>
}
