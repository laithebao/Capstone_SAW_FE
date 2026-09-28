import axios from 'axios'
import { useEffect, useRef, useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router'
import { ArrowLeft, CheckCircle2, Loader2 } from 'lucide-react'
import { ROUTES } from '@/constants/routes'
import { getAuthErrorMessage } from '@/services/authService'
import { getSubmittedDeclaration, getSubmittedDeclarations, getSubmittedSuppliers, rejectProductBatch, verifyProductBatch } from '@/services/batchService'
import type { ProductBatchFilterOption, SubmittedDeclarationDetail, SubmittedDeclarationOption } from '@/types/batch'
import ReceivingDetailsFields from '@/features/operation/components/ReceivingDetailsFields'
import { emptyReceivingDetails, parseReceivingDetails, suggestedReceivingDetails } from '@/features/operation/receivingDetails'

const number = (value: number) => new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 3 }).format(value)
const optionalNumber = (value: number | null, suffix = '') => value === null ? '—' : `${number(value)}${suffix}`
const date = (value: string | null) => value ? new Intl.DateTimeFormat('vi-VN').format(new Date(`${value}T00:00:00`)) : '—'
const inputClass = 'h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 disabled:bg-slate-50 disabled:text-slate-400'

function ReadOnlyField({ label, value }: { label: string; value: string }) {
  return <div className="min-w-0"><dt className="text-xs font-semibold text-slate-500">{label}</dt><dd className="mt-1 break-words text-sm font-medium text-slate-900">{value || '—'}</dd></div>
}

export default function CreateProductBatchPage() {
  const navigate = useNavigate()
  const submittingRef = useRef(false)
  const selectionRef = useRef('')
  const [suppliers, setSuppliers] = useState<ProductBatchFilterOption[]>([])
  const [supplierId, setSupplierId] = useState('')
  const [declarations, setDeclarations] = useState<SubmittedDeclarationOption[]>([])
  const [declarationId, setDeclarationId] = useState('')
  const [detail, setDetail] = useState<SubmittedDeclarationDetail | null>(null)
  const [receiving, setReceiving] = useState(emptyReceivingDetails)
  const [rejectOpen, setRejectOpen] = useState(false)
  const [rejectReason, setRejectReason] = useState('')
  const [loadingSuppliers, setLoadingSuppliers] = useState(true)
  const [loadingDeclarations, setLoadingDeclarations] = useState(false)
  const [loadingDetail, setLoadingDetail] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
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
      .then((data) => { if (!controller.signal.aborted && selectionRef.current.startsWith(`${supplierId}:`)) setDeclarations(data) })
      .catch((requestError: unknown) => { if (!controller.signal.aborted) setError(getAuthErrorMessage(requestError, 'Không thể tải các khai báo chờ xử lý.')) })
      .finally(() => { if (!controller.signal.aborted) setLoadingDeclarations(false) })
    return () => controller.abort()
  }, [supplierId, reloadKey])

  useEffect(() => {
    if (!supplierId || !declarationId) return
    const controller = new AbortController()
    getSubmittedDeclaration(Number(declarationId), Number(supplierId), controller.signal)
      .then((data) => {
        if (controller.signal.aborted || selectionRef.current !== `${supplierId}:${declarationId}`) return
        setDetail(data)
        setReceiving(suggestedReceivingDetails(data))
      })
      .catch((requestError: unknown) => { if (!controller.signal.aborted) setError(getAuthErrorMessage(requestError, 'Không thể tải thông tin khai báo.')) })
      .finally(() => { if (!controller.signal.aborted) setLoadingDetail(false) })
    return () => controller.abort()
  }, [supplierId, declarationId])

  function changeSupplier(value: string) {
    selectionRef.current = `${value}:`
    setSupplierId(value)
    setDeclarationId('')
    setDeclarations([])
    setDetail(null)
    setReceiving(emptyReceivingDetails)
    setRejectOpen(false)
    setRejectReason('')
    setError(null)
    setLoadingDeclarations(Boolean(value))
  }

  function changeDeclaration(value: string) {
    selectionRef.current = `${supplierId}:${value}`
    setDeclarationId(value)
    setDetail(null)
    setReceiving(emptyReceivingDetails)
    setRejectOpen(false)
    setRejectReason('')
    setError(null)
    setLoadingDetail(Boolean(value))
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (submittingRef.current || !detail || detail.id !== Number(declarationId) ||
        detail.supplierId !== Number(supplierId)) return
    const parsed = parseReceivingDetails(receiving)
    if (!parsed.data) {
      setError(parsed.error)
      return
    }
    submittingRef.current = true
    setSubmitting(true)
    setError(null)
    try {
      await verifyProductBatch(detail.id, detail.supplierId, parsed.data)
      setSuccess('Đã xác nhận lô hàng và chuyển sang chờ kiểm định QC.')
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

  async function reject() {
    const reason = rejectReason.trim()
    if (!detail || submittingRef.current) return
    if (!reason || reason.length > 1000) {
      setError('Lý do từ chối phải có nội dung và tối đa 1000 ký tự.')
      return
    }
    submittingRef.current = true
    setSubmitting(true)
    setError(null)
    try {
      await rejectProductBatch(detail.id, detail.supplierId, reason)
      setRejectOpen(false)
      setSuccess('Đã từ chối lô hàng.')
      window.setTimeout(() => navigate(ROUTES.OPERATION_PRODUCT_BATCHES, { replace: true }), 1600)
    } catch (requestError) {
      if (axios.isAxiosError(requestError) && requestError.response?.status === 409) {
        setRejectOpen(false)
        changeDeclaration('')
        setError('Khai báo này đã được xử lý. Vui lòng tải lại danh sách.')
        setReloadKey((value) => value + 1)
      } else setError(getAuthErrorMessage(requestError, 'Không thể từ chối lô hàng.'))
    } finally {
      submittingRef.current = false
      setSubmitting(false)
    }
  }

  return <div className="mx-auto max-w-[1200px] space-y-5">
    <header className="flex flex-wrap items-end justify-between gap-3">
      <div><p className="text-xs font-bold uppercase tracking-wider text-emerald-700">VẬN HÀNH · QUẢN LÝ LÔ HÀNG</p><h1 className="mt-1 text-2xl font-bold text-slate-950 sm:text-3xl">XÁC NHẬN LÔ HÀNG</h1><p className="mt-1 text-sm text-slate-500">Đối chiếu khai báo, ghi nhận hàng thực tế rồi xác nhận hoặc từ chối.</p></div>
      <Link to={ROUTES.OPERATION_PRODUCT_BATCHES} className="inline-flex h-10 items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50"><ArrowLeft className="size-4" />Quay lại danh sách</Link>
    </header>

    {success && <div role="status" className="fixed right-5 top-5 z-[100] flex items-center gap-2 rounded-xl bg-emerald-700 px-5 py-3 text-sm font-semibold text-white shadow-lg"><CheckCircle2 className="size-5" />{success}</div>}
    {error && <div role="alert" className="flex items-center justify-between gap-3 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700"><span>{error}</span><button type="button" onClick={() => { setError(null); setLoadingSuppliers(true); setLoadingDeclarations(Boolean(supplierId)); setReloadKey((value) => value + 1) }} className="shrink-0 font-semibold underline">Thử lại</button></div>}

    <form noValidate onSubmit={(event) => void submit(event)} className="space-y-5">
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
          <h2 className="text-lg font-semibold">Staff kiểm nhận tại kho</h2>
          <p className="mt-1 text-xs text-slate-500">Giá trị gợi ý từ khai báo chỉ nằm trong form. Bạn có thể sửa trước khi xác nhận.</p>
          <div className="mt-4"><ReceivingDetailsFields value={receiving} onChange={setReceiving} unit={detail.unit} declaredQuantity={detail.declaredQuantity} declaredWeight={detail.weightInKg} disabled={submitting} /></div>
        </section>
      </>}

      {supplierId && declarationId && detail && !loadingDetail && <div className="flex flex-wrap justify-end gap-3">
        <Link to={ROUTES.OPERATION_PRODUCT_BATCHES} className="inline-flex h-10 items-center rounded-lg border border-slate-300 bg-white px-5 text-sm font-semibold text-slate-700 hover:bg-slate-50">Hủy</Link>
        <button type="button" disabled={!detail || loadingDetail || submitting || Boolean(success)} onClick={() => { setError(null); setRejectOpen(true) }} className="inline-flex h-10 items-center rounded-lg border border-rose-300 bg-white px-5 text-sm font-semibold text-rose-700 hover:bg-rose-50 disabled:opacity-50">Từ chối</button>
        <button type="submit" disabled={!detail || loadingDetail || submitting || Boolean(success)} className="inline-flex h-10 items-center gap-2 rounded-lg bg-emerald-700 px-5 text-sm font-semibold text-white hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-50">{submitting && <Loader2 className="size-4 animate-spin" />}{submitting ? 'Đang xác nhận...' : 'Xác nhận lô hàng'}</button>
      </div>}
    </form>
    {rejectOpen && <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4" role="dialog" aria-modal="true" aria-labelledby="reject-title">
      <div className="w-full max-w-lg rounded-xl bg-white p-6 shadow-xl">
        <h2 id="reject-title" className="text-lg font-bold">Từ chối lô hàng</h2>
        <p className="mt-1 text-sm text-slate-500">Nhập lý do để nhà cung cấp biết vì sao lô không được tiếp nhận.</p>
        <label className="mt-4 block text-sm font-semibold text-slate-700">Lý do từ chối
          <textarea autoFocus aria-label="Lý do từ chối" rows={4} maxLength={1000} value={rejectReason} disabled={submitting} onChange={(event) => setRejectReason(event.target.value)} className={`${inputClass} mt-1.5 h-auto w-full py-2`} />
        </label>
        {error && <p role="alert" className="mt-2 text-sm text-rose-700">{error}</p>}
        <div className="mt-5 flex justify-end gap-3">
          <button type="button" disabled={submitting} onClick={() => setRejectOpen(false)} className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold">Hủy</button>
          <button type="button" disabled={submitting} onClick={() => void reject()} className="rounded-lg bg-rose-700 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">{submitting ? 'Đang từ chối...' : 'Xác nhận từ chối'}</button>
        </div>
      </div>
    </div>}
  </div>
}
