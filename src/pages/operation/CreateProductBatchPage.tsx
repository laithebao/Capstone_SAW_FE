import axios from 'axios'
import { useEffect, useRef, useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router'
import { ArrowLeft, CheckCircle2, Loader2 } from 'lucide-react'
import { ROUTES } from '@/constants/routes'
import { getAuthErrorMessage } from '@/services/authService'
import { getSubmittedDeclaration, getSubmittedDeclarations, getSubmittedSuppliers, verifyProductBatch } from '@/services/batchService'
import type { ProductBatchFilterOption, SubmittedDeclarationDetail, SubmittedDeclarationOption } from '@/types/batch'

const number = (value: number) => new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 3 }).format(value)
const optionalNumber = (value: number | null, suffix = '') => value === null ? '—' : `${number(value)}${suffix}`
const date = (value: string | null) => value ? new Intl.DateTimeFormat('vi-VN').format(new Date(`${value}T00:00:00`)) : '—'
const inputClass = 'h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 disabled:bg-slate-50 disabled:text-slate-400'

function validVerified(value: string): boolean {
  const parsed = Number(value)
  return /^\d+(?:\.\d{1,3})?$/.test(value.trim()) &&
    Number.isFinite(parsed) && parsed > 0 && parsed < 1_000_000_000_000_000
}

function ReadOnlyField({ label, value }: { label: string; value: string }) {
  return <div className="min-w-0"><dt className="text-xs font-semibold text-slate-500">{label}</dt><dd className="mt-1 break-words text-sm font-medium text-slate-900">{value || '—'}</dd></div>
}

function Difference({ declared, verified, unit }: { declared: number; verified: string; unit: string }) {
  const parsed = Number(verified)
  const difference = verified.trim() && Number.isFinite(parsed) ? parsed - declared : null
  return <p className="mt-1 text-xs text-slate-500">Chênh lệch: <span className={`font-semibold ${difference === null ? '' : difference < 0 ? 'text-amber-700' : difference > 0 ? 'text-blue-700' : 'text-emerald-700'}`}>{difference === null ? '—' : `${difference > 0 ? '+' : ''}${number(difference)} ${unit}`}</span></p>
}

export default function CreateProductBatchPage() {
  const navigate = useNavigate()
  const submittingRef = useRef(false)
  const [suppliers, setSuppliers] = useState<ProductBatchFilterOption[]>([])
  const [supplierId, setSupplierId] = useState('')
  const [declarations, setDeclarations] = useState<SubmittedDeclarationOption[]>([])
  const [declarationId, setDeclarationId] = useState('')
  const [detail, setDetail] = useState<SubmittedDeclarationDetail | null>(null)
  const [verifiedQuantity, setVerifiedQuantity] = useState('')
  const [verifiedWeight, setVerifiedWeight] = useState('')
  const [loadingSuppliers, setLoadingSuppliers] = useState(true)
  const [loadingDeclarations, setLoadingDeclarations] = useState(false)
  const [loadingDetail, setLoadingDetail] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [reloadKey, setReloadKey] = useState(0)

  useEffect(() => {
    const controller = new AbortController()
    getSubmittedSuppliers(controller.signal)
      .then(setSuppliers)
      .catch((requestError: unknown) => { if (!controller.signal.aborted) setError(getAuthErrorMessage(requestError, 'Không thể tải danh sách nhà cung cấp.')) })
      .finally(() => { if (!controller.signal.aborted) setLoadingSuppliers(false) })
    return () => controller.abort()
  }, [reloadKey])

  useEffect(() => {
    if (!supplierId) return
    const controller = new AbortController()
    getSubmittedDeclarations(Number(supplierId), controller.signal)
      .then(setDeclarations)
      .catch((requestError: unknown) => { if (!controller.signal.aborted) setError(getAuthErrorMessage(requestError, 'Không thể tải các khai báo chờ xử lý.')) })
      .finally(() => { if (!controller.signal.aborted) setLoadingDeclarations(false) })
    return () => controller.abort()
  }, [supplierId, reloadKey])

  useEffect(() => {
    if (!supplierId || !declarationId) return
    const controller = new AbortController()
    getSubmittedDeclaration(Number(declarationId), Number(supplierId), controller.signal)
      .then((data) => {
        if (controller.signal.aborted) return
        setDetail(data)
        setVerifiedQuantity(String(data.declaredQuantity))
        setVerifiedWeight(String(data.weightInKg))
      })
      .catch((requestError: unknown) => { if (!controller.signal.aborted) setError(getAuthErrorMessage(requestError, 'Không thể tải thông tin khai báo.')) })
      .finally(() => { if (!controller.signal.aborted) setLoadingDetail(false) })
    return () => controller.abort()
  }, [supplierId, declarationId])

  function changeSupplier(value: string) {
    setSupplierId(value)
    setDeclarationId('')
    setDeclarations([])
    setDetail(null)
    setVerifiedQuantity('')
    setVerifiedWeight('')
    setError(null)
    setLoadingDeclarations(Boolean(value))
  }

  function changeDeclaration(value: string) {
    setDeclarationId(value)
    setDetail(null)
    setVerifiedQuantity('')
    setVerifiedWeight('')
    setError(null)
    setLoadingDetail(Boolean(value))
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (submittingRef.current || !detail || detail.id !== Number(declarationId) ||
        detail.supplierId !== Number(supplierId)) return
    if (!validVerified(verifiedQuantity) || !validVerified(verifiedWeight)) {
      setError('Số lượng và khối lượng kiểm nhận phải lớn hơn 0 và có tối đa 3 chữ số thập phân.')
      return
    }
    submittingRef.current = true
    setSubmitting(true)
    setError(null)
    try {
      await verifyProductBatch(detail.id, detail.supplierId, {
        verifiedQuantity: Number(verifiedQuantity),
        verifiedWeightInKg: Number(verifiedWeight),
      })
      setSuccess(true)
      window.setTimeout(() => navigate(ROUTES.OPERATION_PRODUCT_BATCHES, { replace: true }), 1600)
    } catch (requestError) {
      if (axios.isAxiosError(requestError) && requestError.response?.status === 409) {
        changeDeclaration('')
        setError('Khai báo này đã được xử lý. Vui lòng chọn lô khác.')
        setReloadKey((value) => value + 1)
      } else {
        setError(getAuthErrorMessage(requestError, 'Không thể xác nhận lô hàng. Vui lòng thử lại.'))
      }
    } finally {
      submittingRef.current = false
      setSubmitting(false)
    }
  }

  return <div className="mx-auto max-w-[1200px] space-y-5">
    <header className="flex flex-wrap items-end justify-between gap-3">
      <div><p className="text-xs font-bold uppercase tracking-wider text-emerald-700">VẬN HÀNH · QUẢN LÝ LÔ HÀNG</p><h1 className="mt-1 text-2xl font-bold text-slate-950 sm:text-3xl">TẠO LÔ HÀNG</h1><p className="mt-1 text-sm text-slate-500">Kiểm nhận hàng thực tế từ khai báo của nhà cung cấp và chuyển lô sang QC.</p></div>
      <Link to={ROUTES.OPERATION_PRODUCT_BATCHES} className="inline-flex h-10 items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50"><ArrowLeft className="size-4" />Quay lại danh sách</Link>
    </header>

    {success && <div role="status" className="fixed right-5 top-5 z-[100] flex items-center gap-2 rounded-xl bg-emerald-700 px-5 py-3 text-sm font-semibold text-white shadow-lg"><CheckCircle2 className="size-5" />Product batch created successfully.</div>}
    {error && <div role="alert" className="flex items-center justify-between gap-3 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700"><span>{error}</span><button type="button" onClick={() => { setError(null); setLoadingSuppliers(true); setLoadingDeclarations(Boolean(supplierId)); setReloadKey((value) => value + 1) }} className="shrink-0 font-semibold underline">Thử lại</button></div>}

    <form onSubmit={(event) => void submit(event)} className="space-y-5">
      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-lg font-semibold">Nhà cung cấp và khai báo</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <label className="space-y-1.5 text-sm font-semibold text-slate-700">Nhà cung cấp
            <select aria-label="Nhà cung cấp" value={supplierId} disabled={loadingSuppliers || submitting} onChange={(event) => changeSupplier(event.target.value)} className={inputClass}><option value="">{loadingSuppliers ? 'Đang tải nhà cung cấp...' : 'Chọn nhà cung cấp'}</option>{suppliers.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select>
          </label>
          <label className="space-y-1.5 text-sm font-semibold text-slate-700">Khai báo chờ xử lý
            <select aria-label="Khai báo chờ xử lý" value={declarationId} disabled={!supplierId || loadingDeclarations || submitting} onChange={(event) => changeDeclaration(event.target.value)} className={inputClass}><option value="">{loadingDeclarations ? 'Đang tải khai báo...' : 'Chọn khai báo'}</option>{declarations.map((item) => <option key={item.id} value={item.id}>{item.batchCode} · {item.productName} · {number(item.declaredQuantity)} {item.unit}</option>)}</select>
          </label>
        </div>
        {!loadingSuppliers && suppliers.length === 0 && !error && <p className="mt-4 text-sm text-slate-500">Không có nhà cung cấp nào có khai báo đang chờ xử lý.</p>}
        {supplierId && !loadingDeclarations && declarations.length === 0 && !error && <p className="mt-4 text-sm text-slate-500">Nhà cung cấp này không còn khai báo ở trạng thái chờ xử lý.</p>}
      </section>

      {loadingDetail && <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white p-5 text-sm text-slate-500"><Loader2 className="size-4 animate-spin" />Đang tải chi tiết khai báo...</div>}
      {detail && !loadingDetail && <>
        <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold">Thông tin nhà cung cấp đã khai báo</h2>
          <p className="mt-1 text-xs text-slate-500">Chỉ để đối chiếu; các thông tin này không được thay đổi tại đây.</p>
          <dl className="mt-5 grid gap-x-6 gap-y-5 sm:grid-cols-2 lg:grid-cols-3">
            <ReadOnlyField label="Mã lô" value={detail.batchCode} />
            <ReadOnlyField label="Nhà cung cấp" value={detail.supplierName} />
            <ReadOnlyField label="Sản phẩm" value={detail.productName} />
            <ReadOnlyField label="Loại nông sản" value={detail.cropTypeName} />
            <ReadOnlyField label="Vùng trồng" value={detail.growingAreaName} />
            <ReadOnlyField label="Ngày thu hoạch" value={date(detail.harvestDate)} />
            <ReadOnlyField label="Số lượng khai báo" value={`${number(detail.declaredQuantity)} ${detail.unit}`} />
            <ReadOnlyField label="Khối lượng khai báo" value={`${number(detail.weightInKg)} kg`} />
            <ReadOnlyField label="Quy cách đóng gói" value={detail.packagingType ?? '—'} />
            <ReadOnlyField label="Số kiện" value={optionalNumber(detail.packageCount)} />
            <ReadOnlyField label="Khối lượng mỗi kiện" value={optionalNumber(detail.packageUnitWeightKg, ' kg')} />
            <ReadOnlyField label="Nhiệt độ bảo quản dự kiến" value={`${optionalNumber(detail.expectedMinTempC)} – ${optionalNumber(detail.expectedMaxTempC)} °C`} />
            <ReadOnlyField label="Độ ẩm bảo quản dự kiến" value={`${optionalNumber(detail.expectedMinHumidityPct)} – ${optionalNumber(detail.expectedMaxHumidityPct)} %`} />
            <ReadOnlyField label="Thời hạn bảo quản" value={optionalNumber(detail.shelfLifeDaysSnapshot, ' ngày')} />
            <ReadOnlyField label="Ngày giao dự kiến" value={date(detail.expectedDeliveryDate)} />
            <ReadOnlyField label="Ngày hết hạn" value={date(detail.expiryDate)} />
          </dl>
          {detail.note && <div className="mt-5 border-t border-slate-100 pt-4"><p className="text-xs font-semibold text-slate-500">Mô tả / ghi chú</p><p className="mt-1 whitespace-pre-wrap break-words text-sm text-slate-800">{detail.note}</p></div>}
        </section>

        <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold">Kiểm nhận thực tế</h2>
          <p className="mt-1 text-xs text-slate-500">Nhập số lượng và khối lượng thực tế sau khi kiểm tra hàng tại kho. Có thể khác với khai báo.</p>
          <div className="mt-4 grid gap-5 sm:grid-cols-2">
            <label className="text-sm font-semibold text-slate-700">Số lượng kiểm nhận ({detail.unit})
              <input type="number" inputMode="decimal" min="0.001" step="0.001" required value={verifiedQuantity} disabled={submitting} onChange={(event) => setVerifiedQuantity(event.target.value)} className={`mt-1.5 ${inputClass}`} />
              <Difference declared={detail.declaredQuantity} verified={verifiedQuantity} unit={detail.unit} />
            </label>
            <label className="text-sm font-semibold text-slate-700">Khối lượng kiểm nhận (kg)
              <input type="number" inputMode="decimal" min="0.001" step="0.001" required value={verifiedWeight} disabled={submitting} onChange={(event) => setVerifiedWeight(event.target.value)} className={`mt-1.5 ${inputClass}`} />
              <Difference declared={detail.weightInKg} verified={verifiedWeight} unit="kg" />
            </label>
          </div>
        </section>
      </>}

      <div className="flex flex-wrap justify-end gap-3">
        <Link to={ROUTES.OPERATION_PRODUCT_BATCHES} className="inline-flex h-10 items-center rounded-lg border border-slate-300 bg-white px-5 text-sm font-semibold text-slate-700 hover:bg-slate-50">Hủy</Link>
        <button type="submit" disabled={!detail || loadingDetail || submitting || success} className="inline-flex h-10 items-center gap-2 rounded-lg bg-emerald-700 px-5 text-sm font-semibold text-white hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-50">{submitting && <Loader2 className="size-4 animate-spin" />}{submitting ? 'Đang tạo...' : 'Tạo lô hàng'}</button>
      </div>
    </form>
  </div>
}
