import { AnimatedNumber } from '@/components/common/AnimatedNumber'
import './batch-detail-v7.css'
import { ArrowLeft, AlertCircle, FileText, Thermometer, Droplets, Clock3, MessageSquareText } from 'lucide-react'
import './warehouse-batches.css'
import { parseApiTimestamp } from '@/utils/vietnamTime'
import axios from 'axios'
import { useEffect, useState } from 'react'
import { Link, useLocation, useParams } from 'react-router'
import { ROUTES } from '@/constants/routes'
import { getProductBatch } from '@/services/batchService'
import { getAuthErrorMessage } from '@/services/authService'
import ProductBatchStatusBadge from '@/features/operation/components/ProductBatchStatusBadge'
import ProductBatchQrCodeCard from '@/features/operation/components/ProductBatchQrCodeCard'
import ProductBatchRelatedInformation from '@/features/operation/components/ProductBatchRelatedInformation'
import type { ProductBatchDetail } from '@/types/batch'
import { useAuth } from '@/hooks/useAuth'
import { ROLES } from '@/constants/roles'

const dateTime = (value: string) => new Intl.DateTimeFormat('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh',  dateStyle: 'medium', timeStyle: 'short' }).format(parseApiTimestamp(value))
const dateOnly = (value: string | null) => value ? new Intl.DateTimeFormat('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh',  dateStyle: 'medium' }).format(parseApiTimestamp(`${value}T00:00:00`)) : '—'
const quantity = (value: number) => new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 3 }).format(value)
const optional = (value: number | null, unit = '') => value === null ? 'Chưa ghi nhận' : `${quantity(value)}${unit}`
const difference = (declared: number, verified: number | null, unit: string) =>
  verified === null ? 'Chưa ghi nhận' : `${verified - declared > 0 ? '+' : ''}${quantity(verified - declared)} ${unit}`

export default function ProductBatchDetailPage() {
  const { user } = useAuth()
  const { id } = useParams()
  const location = useLocation()
  const batchId = Number(id)
  const validId = Number.isSafeInteger(batchId) && batchId > 0
  const [batch, setBatch] = useState<ProductBatchDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [reloadKey, setReloadKey] = useState(0)

  useEffect(() => {
    if (!validId) return
    const controller = new AbortController()
    const timer = window.setTimeout(async () => {
      setLoading(true)
      setError(null)
      try {
        const data = await getProductBatch(batchId, controller.signal)
        if (!controller.signal.aborted) setBatch(data)
      } catch (requestError) {
        if (!controller.signal.aborted) {
          setBatch(null)
          setError(axios.isAxiosError(requestError) && requestError.response?.status === 403
            ? 'You are not allowed to access this page.'
            : getAuthErrorMessage(requestError, 'Failed to load product batch detail.'))
        }
      } finally {
        if (!controller.signal.aborted) setLoading(false)
      }
    }, 0)
    return () => { window.clearTimeout(timer); controller.abort() }
  }, [batchId, validId, reloadKey])

  useEffect(() => {
    const refresh = () => { if (document.visibilityState === 'visible') setReloadKey((key) => key + 1) }
    window.addEventListener('focus', refresh)
    document.addEventListener('visibilitychange', refresh)
    return () => {
      window.removeEventListener('focus', refresh)
      document.removeEventListener('visibilitychange', refresh)
    }
  }, [])

  return <div className={user?.role === ROLES.WAREHOUSE_MANAGER ? "saw-wm-batch-detail space-y-5" : "mx-auto max-w-[1200px] space-y-5"}>
    <header className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
      <div>
        <p className="text-xs font-bold uppercase tracking-wider text-emerald-700">
          {user?.role === ROLES.WAREHOUSE_MANAGER ? 'Điều hành kho / Quản lý lô hàng / Chi tiết' : 'Vận hành · Quản lý lô hàng · Chi tiết'}
        </p>
        <h1 className="mt-1 text-2xl font-bold text-slate-950 sm:text-3xl">Chi tiết lô hàng</h1>
      </div>
      <div className="flex flex-wrap gap-2">
        {!loading && !error && batch && user?.role === ROLES.OPERATION_STAFF && <Link to={`${ROUTES.OPERATION_STOCK_ADJUSTMENT_CREATE}?batchId=${batchId}&kind=DISPOSAL`} className="inline-flex h-10 items-center rounded-lg border border-rose-300 bg-white px-4 text-sm font-semibold text-rose-700">Yêu cầu loại bỏ lô</Link>}
        {!loading && !error && user?.role === ROLES.OPERATION_STAFF && batch?.canUpdateReceivingInformation && <Link to={ROUTES.OPERATION_PRODUCT_BATCH_UPDATE.replace(':id', String(batchId))} className="inline-flex h-10 items-center rounded-lg bg-emerald-700 px-4 text-sm font-semibold text-white hover:bg-emerald-800">Chỉnh sửa kiểm nhận</Link>}
        <Link data-saw-transition="" to={ROUTES.OPERATION_PRODUCT_BATCHES} className="inline-flex h-10 items-center rounded-lg border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50"><ArrowLeft size={16} aria-hidden="true" /> Quay lại danh sách</Link>
      </div>
    </header>

    {!loading && !error && batch?.receivingUpdateLockReason && <p role="status" className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800"><AlertCircle size={16} aria-hidden="true" /> {batch.receivingUpdateLockReason}</p>}

    {location.state?.receivingUpdated && <p role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-semibold text-emerald-800">Đã cập nhật thông tin kiểm nhận.</p>}

    {!validId ? <p role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-5 text-sm text-rose-700">Mã lô hàng không hợp lệ.</p>
      : loading ? <p className="rounded-xl border border-slate-200 bg-white p-5 text-sm text-slate-500">Đang tải chi tiết lô hàng...</p>
        : error ? <div role="alert" className="flex items-center justify-between rounded-xl border border-rose-200 bg-rose-50 p-5 text-sm text-rose-700"><span>{error}</span><button type="button" onClick={() => setReloadKey((value) => value + 1)} className="font-semibold underline">Thử lại</button></div>
          : batch && (user?.role === ROLES.WAREHOUSE_MANAGER ? <ManagerBatchOverview batch={batch} /> : <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-100 pb-5"><div><p className="text-xs text-slate-500">Mã lô hàng</p><p className="mt-1 font-mono text-lg font-bold text-emerald-700">{batch.batchCode}</p><h2 className="mt-2 text-xl font-bold">{batch.productName}</h2></div><ProductBatchStatusBadge status={batch.batchStatus} /></div>
            <div className="mt-5 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              <Info label="Nhà cung cấp" value={batch.supplierName} />
              <Info label="Loại nông sản" value={`${batch.cropTypeName} · ${batch.categoryName}`} />
              <Info label="Vùng trồng" value={batch.growingAreaName} />
              <Info label="Ngày thu hoạch" value={dateOnly(batch.harvestDate)} />
              <Info label="Ngày giao dự kiến" value={dateOnly(batch.expectedDeliveryDate)} />
              <Info label="Ngày hết hạn" value={dateOnly(batch.expiryDate)} />
              <Info label="Nhiệt độ bảo quản dự kiến" value={`${optional(batch.expectedMinTempC)} – ${optional(batch.expectedMaxTempC)} °C`} />
              <Info label="Độ ẩm bảo quản dự kiến" value={`${optional(batch.expectedMinHumidityPct)} – ${optional(batch.expectedMaxHumidityPct)} %`} />
              <Info label="Thời hạn bảo quản" value={optional(batch.shelfLifeDaysSnapshot, ' ngày')} />
              <Info label="Ngày tạo" value={dateTime(batch.createdAt)} />
              <Info label="Cập nhật lần cuối" value={batch.updatedAt ? dateTime(batch.updatedAt) : '—'} />
            </div>
            <div className="mt-6 grid gap-4 border-t border-slate-100 pt-5 lg:grid-cols-2">
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <h3 className="text-sm font-bold text-slate-900">Nhà cung cấp khai báo</h3>
                <div className="mt-4 grid gap-4 sm:grid-cols-2">
                  <Info label="Số lượng ban đầu" value={`${quantity(batch.quantity)} ${batch.unit}`} />
                  <Info label="Khối lượng ban đầu" value={`${quantity(batch.weightInKg)} kg`} />
                  <Info label="Quy cách đóng gói" value={batch.packagingType ?? '—'} />
                  <Info label="Số kiện" value={optional(batch.packageCount)} />
                  <Info label="Khối lượng mỗi kiện" value={optional(batch.packageUnitWeightKg, ' kg')} />
                </div>
              </div>
              <div className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-4">
                <h3 className="text-sm font-bold text-slate-900">Staff kiểm nhận tại kho</h3>
                <div className="mt-4 grid gap-4 sm:grid-cols-2">
                  <Info label="Số lượng sau kiểm nhận" value={batch.verifiedQuantity === null ? 'Chưa kiểm nhận' : `${quantity(batch.verifiedQuantity)} ${batch.unit}`} />
                  <Info label="Khối lượng sau kiểm nhận" value={batch.verifiedWeightInKg === null ? 'Chưa kiểm nhận' : `${quantity(batch.verifiedWeightInKg)} kg`} />
                  <Info label="Chênh lệch số lượng" value={difference(batch.quantity, batch.verifiedQuantity, batch.unit)} />
                  <Info label="Chênh lệch khối lượng" value={difference(batch.weightInKg, batch.verifiedWeightInKg, 'kg')} />
                  <Info label="Quy cách đóng gói kiểm nhận" value={batch.verifiedPackagingType ?? 'Chưa ghi nhận'} />
                  <Info label="Số kiện kiểm nhận" value={optional(batch.verifiedPackageCount)} />
                  <Info label="Khối lượng mỗi kiện kiểm nhận" value={optional(batch.verifiedPackageUnitWeightKg, ' kg')} />
                </div>
              </div>
            </div>
            <div className="mt-5 border-t border-slate-100 pt-5">
              <h3 className="text-xs font-bold uppercase tracking-wide text-slate-400">Ghi chú nhà cung cấp</h3>
              <p className="mt-2 whitespace-pre-wrap break-words text-sm text-slate-800">{batch.note?.trim() || 'Không có ghi chú.'}</p>
              <h3 className="mt-5 text-xs font-bold uppercase tracking-wide text-slate-400">Ghi chú tiếp nhận của staff</h3>
              <p className="mt-2 whitespace-pre-wrap break-words text-sm text-slate-800">{batch.receivingNote?.trim() || 'Chưa ghi nhận.'}</p>
              {batch.batchStatus === 'REJECTED' && batch.rejectionReason && <div className="mt-5 rounded-lg border border-rose-200 bg-rose-50 p-4"><h3 className="text-xs font-bold uppercase tracking-wide text-rose-700">Lý do từ chối</h3><p className="mt-2 whitespace-pre-wrap break-words text-sm text-rose-900">{batch.rejectionReason}</p></div>}
            </div>
          </section>)}
    {validId && !loading && !error && batch && <>
      <div className={user?.role === ROLES.WAREHOUSE_MANAGER ? 'batch-detail-records' : 'space-y-5'}>
        <ProductBatchRelatedInformation batch={batch} compactHistory={user?.role === ROLES.WAREHOUSE_MANAGER} />
        <ProductBatchQrCodeCard key={batchId} batchId={batchId} />
      </div>
    </>}
  </div>
}

function Info({ label, value }: { label: string; value: string }) {
  return <div><p className="text-xs font-bold uppercase tracking-wide text-slate-400">{label}</p><p className="mt-1 text-sm font-medium text-slate-800">{value}</p></div>
}


const recorded = (value: string | null | undefined) => value?.trim() || 'Chưa ghi nhận'
const displayDate = (value: string | null) => value ? new Intl.DateTimeFormat('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh',  day: '2-digit', month: '2-digit', year: 'numeric' }).format(parseApiTimestamp(`${value}T00:00:00`)) : 'Chưa ghi nhận'
const range = (min: number | null, max: number | null, unit: string) => min == null && max == null ? 'Chưa ghi nhận' : min == null ? `Tối đa ${quantity(max!)} ${unit}` : max == null ? `Tối thiểu ${quantity(min)} ${unit}` : `${quantity(min)} – ${quantity(max)} ${unit}`
function Metric({ value, unit, animate = false }: { value: number | null; unit?: string; animate?: boolean }) {
  return value == null ? <span className="saw-v7-empty">Chưa ghi nhận</span> : <span className="saw-v7-metric">{animate ? <AnimatedNumber value={quantity(value)} /> : quantity(value)}{unit && <> <small>{unit}</small></>}</span>
}
function ManagerBatchOverview({ batch }: { batch: ProductBatchDetail }) {
  const rows = [
    { label: 'Số lượng', declared: <Metric value={batch.quantity} unit={batch.unit} animate />, actual: <Metric value={batch.verifiedQuantity} unit={batch.unit} animate />, delta: difference(batch.quantity, batch.verifiedQuantity, batch.unit), difference: batch.verifiedQuantity === null ? null : batch.verifiedQuantity - batch.quantity },
    { label: 'Khối lượng', declared: <Metric value={batch.weightInKg} unit="kg" animate />, actual: <Metric value={batch.verifiedWeightInKg} unit="kg" animate />, delta: difference(batch.weightInKg, batch.verifiedWeightInKg, 'kg'), difference: batch.verifiedWeightInKg === null ? null : batch.verifiedWeightInKg - batch.weightInKg },
    { label: 'Quy cách đóng gói', declared: recorded(batch.packagingType), actual: recorded(batch.verifiedPackagingType), delta: 'Không áp dụng', difference: null },
    { label: 'Số kiện', declared: <Metric value={batch.packageCount} />, actual: <Metric value={batch.verifiedPackageCount} />, delta: 'Không áp dụng', difference: null },
    { label: 'Khối lượng mỗi kiện', declared: <Metric value={batch.packageUnitWeightKg} unit="kg" />, actual: <Metric value={batch.verifiedPackageUnitWeightKg} unit="kg" />, delta: 'Không áp dụng', difference: null },
  ]
  const facts = [ ['Nhà cung cấp', recorded(batch.supplierName)], ['Loại nông sản', [batch.cropTypeName, batch.categoryName].filter(Boolean).join(' · ') || 'Chưa ghi nhận'], ['Vùng trồng', recorded(batch.growingAreaName)], ['Ngày thu hoạch', displayDate(batch.harvestDate)], ['Ngày giao dự kiến', displayDate(batch.expectedDeliveryDate)], ['Ngày hết hạn', displayDate(batch.expiryDate)], ['Ngày tạo', dateTime(batch.createdAt)], ['Cập nhật lần cuối', batch.updatedAt ? dateTime(batch.updatedAt) : 'Chưa ghi nhận'] ]
  return <div className="saw-v7-overview">
    <section className="saw-v7-card saw-v7-hero"><div><span>Thông tin lô hàng</span><h2>{recorded(batch.productName)}</h2><strong>{batch.batchCode}</strong></div><ProductBatchStatusBadge status={batch.batchStatus} /></section>
    <div className="saw-v7-columns"><section className="saw-v7-card"><h2><FileText /> Thông tin chung</h2><dl className="saw-v7-facts">{facts.map(([label,value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl></section>
    <section className="saw-v7-card"><h2><Thermometer /> Điều kiện bảo quản</h2><div className="saw-v7-storage">{[[Thermometer,'Nhiệt độ dự kiến',range(batch.expectedMinTempC,batch.expectedMaxTempC,'°C')],[Droplets,'Độ ẩm dự kiến',range(batch.expectedMinHumidityPct,batch.expectedMaxHumidityPct,'%')],[Clock3,'Thời hạn bảo quản',optional(batch.shelfLifeDaysSnapshot,' ngày')]].map(([Icon,label,value]) => {const Symbol = Icon as typeof Thermometer; return <div key={label as string}><span><Symbol /></span><div><small>{label as string}</small><strong>{value as string}</strong></div></div>})}</div></section></div>
    <section className="saw-v7-card saw-v7-comparison"><h2>Đối chiếu thông tin kiểm nhận</h2><p>So sánh dữ liệu khai báo và kiểm nhận thực tế.</p><div className="saw-v7-table-wrap"><table><thead><tr><th>Thông tin</th><th>Nhà cung cấp khai báo</th><th>Nhân viên kho kiểm nhận</th><th>Chênh lệch</th></tr></thead><tbody>{rows.map(row=><tr key={row.label}><th scope="row">{row.label}</th><td>{row.declared}</td><td>{row.actual}</td><td className={row.difference === 0 ? 'saw-v7-delta-zero' : row.difference !== null ? 'saw-v7-delta-diff' : 'saw-v7-empty'}>{row.delta}</td></tr>)}</tbody></table></div></section>
    <section className="saw-v7-card"><h2><MessageSquareText /> Ghi chú</h2><div className="saw-v7-notes"><div><small>Ghi chú nhà cung cấp</small><p>{recorded(batch.note)}</p></div><div><small>Ghi chú tiếp nhận của nhân viên kho</small><p>{recorded(batch.receivingNote)}</p></div></div>{batch.batchStatus === 'REJECTED' && batch.rejectionReason && <div className="saw-v7-rejection"><strong>Lý do từ chối</strong><p>{batch.rejectionReason}</p></div>}</section>
  </div>
}
