import axios from 'axios'
import { useEffect, useRef, useState, type FormEvent } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import { ArrowLeft, Loader2 } from 'lucide-react'
import { ROUTES } from '@/constants/routes'
import ReceivingDetailsFields from '@/features/operation/components/ReceivingDetailsFields'
import { emptyReceivingDetails, parseReceivingDetails, savedReceivingDetails } from '@/features/operation/receivingDetails'
import { getAuthErrorMessage } from '@/services/authService'
import { getProductBatch, updateProductBatchReceivingDetails } from '@/services/batchService'
import type { ProductBatchDetail } from '@/types/batch'

const number = (value: number) => new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 3 }).format(value)
const optional = (value: number | null, unit = '') => value === null ? '—' : `${number(value)}${unit}`

function Info({ label, value }: { label: string; value: string }) {
  return <div><dt className="text-xs font-semibold text-slate-500">{label}</dt><dd className="mt-1 break-words text-sm font-medium text-slate-900">{value}</dd></div>
}

export default function UpdateProductBatchPage() {
  const { id } = useParams()
  const batchId = Number(id)
  const validId = Number.isSafeInteger(batchId) && batchId > 0
  const navigate = useNavigate()
  const savingRef = useRef(false)
  const [batch, setBatch] = useState<ProductBatchDetail | null>(null)
  const [receiving, setReceiving] = useState(emptyReceivingDetails)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
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
        if (!controller.signal.aborted) {
          setBatch(data)
          setReceiving(savedReceivingDetails(data))
        }
      } catch (requestError) {
        if (!controller.signal.aborted) {
          setBatch(null)
          setError(getAuthErrorMessage(requestError, 'Không thể tải lô hàng.'))
        }
      } finally { if (!controller.signal.aborted) setLoading(false) }
    }, 0)
    return () => { window.clearTimeout(timer); controller.abort() }
  }, [batchId, validId, reloadKey])

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (savingRef.current || !batch || batch.batchStatus !== 'PENDING_QC') return
    const parsed = parseReceivingDetails(receiving)
    if (!parsed.data) { setError(parsed.error); return }
    savingRef.current = true
    setSaving(true)
    setError(null)
    try {
      await updateProductBatchReceivingDetails(batch.id, {
        ...parsed.data, expectedUpdatedAt: batch.updatedAt, expectedCreatedAt: batch.createdAt,
      })
      navigate(ROUTES.OPERATION_PRODUCT_BATCH_DETAIL.replace(':id', String(batch.id)),
        { replace: true, state: { receivingUpdated: true } })
    } catch (requestError) {
      setError(axios.isAxiosError(requestError) && requestError.response?.status === 409
        ? 'Lô hàng đã được người khác thay đổi hoặc không còn chờ QC. Hãy tải lại trước khi sửa tiếp.'
        : getAuthErrorMessage(requestError, 'Không thể cập nhật thông tin kiểm nhận.'))
    } finally {
      savingRef.current = false
      setSaving(false)
    }
  }

  const detailPath = ROUTES.OPERATION_PRODUCT_BATCH_DETAIL.replace(':id', String(batchId))
  return <div className="mx-auto max-w-[1200px] space-y-5">
    <header className="flex flex-wrap items-end justify-between gap-3">
      <div><p className="text-xs font-bold uppercase tracking-wider text-emerald-700">VẬN HÀNH · QUẢN LÝ LÔ HÀNG</p><h1 className="mt-1 text-2xl font-bold text-slate-950 sm:text-3xl">CẬP NHẬT THÔNG TIN LÔ HÀNG</h1></div>
      <Link to={validId ? detailPath : ROUTES.OPERATION_PRODUCT_BATCHES} className="inline-flex h-10 items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-700"><ArrowLeft className="size-4" />Quay lại chi tiết</Link>
    </header>
    {!validId && <p role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-rose-700">Mã lô hàng không hợp lệ.</p>}
    {error && <div role="alert" className="flex justify-between gap-3 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700"><span>{error}</span><button type="button" onClick={() => setReloadKey((key) => key + 1)} className="font-semibold underline">Tải lại</button></div>}
    {validId && loading && <p className="rounded-xl border border-slate-200 bg-white p-5 text-sm text-slate-500">Đang tải thông tin lô hàng...</p>}
    {batch && !loading && batch.batchStatus !== 'PENDING_QC' && <p role="alert" className="rounded-xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-800">Chỉ có thể cập nhật lô đang chờ kiểm định QC.</p>}
    {batch && !loading && batch.batchStatus === 'PENDING_QC' && <form noValidate onSubmit={(event) => void save(event)} className="space-y-5">
      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-lg font-semibold">Nhà cung cấp khai báo · chỉ đọc</h2>
        <dl className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Info label="Mã lô" value={batch.batchCode} />
          <Info label="Nhà cung cấp" value={batch.supplierName} />
          <Info label="Sản phẩm" value={batch.productName} />
          <Info label="Loại nông sản" value={`${batch.cropTypeName} · ${batch.categoryName}`} />
          <Info label="Vùng trồng" value={batch.growingAreaName} />
          <Info label="Ngày thu hoạch" value={batch.harvestDate} />
          <Info label="Số lượng khai báo" value={`${number(batch.quantity)} ${batch.unit}`} />
          <Info label="Khối lượng khai báo" value={`${number(batch.weightInKg)} kg`} />
          <Info label="Quy cách đóng gói" value={batch.packagingType ?? '—'} />
          <Info label="Số kiện" value={optional(batch.packageCount)} />
          <Info label="Khối lượng mỗi kiện" value={optional(batch.packageUnitWeightKg, ' kg')} />
          <Info label="Ghi chú nhà cung cấp" value={batch.note?.trim() || '—'} />
          <Info label="Nhiệt độ bảo quản dự kiến" value={`${optional(batch.expectedMinTempC)} – ${optional(batch.expectedMaxTempC)} °C`} />
          <Info label="Độ ẩm bảo quản dự kiến" value={`${optional(batch.expectedMinHumidityPct)} – ${optional(batch.expectedMaxHumidityPct)} %`} />
          <Info label="Thời hạn bảo quản" value={optional(batch.shelfLifeDaysSnapshot, ' ngày')} />
          <Info label="Ngày giao dự kiến" value={batch.expectedDeliveryDate ?? '—'} />
          <Info label="Ngày hết hạn" value={batch.expiryDate ?? '—'} />
        </dl>
      </section>
      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-lg font-semibold">Staff kiểm nhận · có thể sửa</h2>
        <p className="mt-1 text-xs text-slate-500">Trường chưa ghi nhận sẽ để trống. Để trống trường tùy chọn để xóa giá trị đã lưu.</p>
        <div className="mt-4"><ReceivingDetailsFields value={receiving} onChange={setReceiving} unit={batch.unit} declaredQuantity={batch.quantity} declaredWeight={batch.weightInKg} disabled={saving} /></div>
      </section>
      <div className="flex justify-end gap-3">
        <Link to={detailPath} className="inline-flex h-10 items-center rounded-lg border border-slate-300 bg-white px-5 text-sm font-semibold text-slate-700">Hủy</Link>
        <button type="submit" disabled={saving} className="inline-flex h-10 items-center gap-2 rounded-lg bg-emerald-700 px-5 text-sm font-semibold text-white disabled:opacity-50">{saving && <Loader2 className="size-4 animate-spin" />}{saving ? 'Đang lưu...' : 'Lưu thay đổi'}</button>
      </div>
    </form>}
  </div>
}
