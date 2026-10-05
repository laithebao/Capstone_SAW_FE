import axios from 'axios'
import { useEffect, useState } from 'react'
import { Link, useLocation, useParams } from 'react-router'
import { ROUTES } from '@/constants/routes'
import { getProductBatch } from '@/services/batchService'
import { getAuthErrorMessage } from '@/services/authService'
import ProductBatchStatusBadge from '@/features/operation/components/ProductBatchStatusBadge'
import ProductBatchQrCodeCard from '@/features/operation/components/ProductBatchQrCodeCard'
import type { ProductBatchDetail } from '@/types/batch'

const dateTime = (value: string) => new Intl.DateTimeFormat('vi-VN', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value))
const dateOnly = (value: string | null) => value ? new Intl.DateTimeFormat('vi-VN', { dateStyle: 'medium' }).format(new Date(`${value}T00:00:00`)) : '—'
const quantity = (value: number) => new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 3 }).format(value)
const optional = (value: number | null, unit = '') => value === null ? 'Chưa ghi nhận' : `${quantity(value)}${unit}`
const difference = (declared: number, verified: number | null, unit: string) =>
  verified === null ? 'Chưa ghi nhận' : `${verified - declared > 0 ? '+' : ''}${quantity(verified - declared)} ${unit}`

export default function ProductBatchDetailPage() {
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

  return <div className="mx-auto max-w-[1200px] space-y-5">
    <header className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
      <div><p className="text-xs font-bold uppercase tracking-wider text-emerald-700">Vận hành · Quản lý lô hàng · Chi tiết</p><h1 className="mt-1 text-2xl font-bold text-slate-950 sm:text-3xl">CHI TIẾT LÔ HÀNG</h1></div>
      <div className="flex flex-wrap gap-2">
        {!loading && !error && batch?.canUpdateReceivingInformation && <Link to={ROUTES.OPERATION_PRODUCT_BATCH_UPDATE.replace(':id', String(batchId))} className="inline-flex h-10 items-center rounded-lg bg-emerald-700 px-4 text-sm font-semibold text-white hover:bg-emerald-800">Chỉnh sửa kiểm nhận</Link>}
        <Link to={ROUTES.OPERATION_PRODUCT_BATCHES} className="inline-flex h-10 items-center rounded-lg border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50">← Quay lại danh sách</Link>
      </div>
    </header>

    {!loading && !error && batch?.receivingUpdateLockReason && <p role="status" className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">{batch.receivingUpdateLockReason}</p>}

    {location.state?.receivingUpdated && <p role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-semibold text-emerald-800">Đã cập nhật thông tin kiểm nhận.</p>}

    {!validId ? <p role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-5 text-sm text-rose-700">Mã lô hàng không hợp lệ.</p>
      : loading ? <p className="rounded-xl border border-slate-200 bg-white p-5 text-sm text-slate-500">Đang tải chi tiết lô hàng...</p>
        : error ? <div role="alert" className="flex items-center justify-between rounded-xl border border-rose-200 bg-rose-50 p-5 text-sm text-rose-700"><span>{error}</span><button type="button" onClick={() => setReloadKey((value) => value + 1)} className="font-semibold underline">Thử lại</button></div>
          : batch && <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
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
          </section>}
    {validId && !loading && !error && batch && <ProductBatchQrCodeCard key={batchId} batchId={batchId} />}
  </div>
}

function Info({ label, value }: { label: string; value: string }) {
  return <div><p className="text-xs font-bold uppercase tracking-wide text-slate-400">{label}</p><p className="mt-1 text-sm font-medium text-slate-800">{value}</p></div>
}
