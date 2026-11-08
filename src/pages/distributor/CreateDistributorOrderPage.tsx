import { useRef, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router'
import { ROUTES } from '@/constants/routes'
import { createDistributorOrder } from '@/services/orderService'
import { getAuthErrorMessage } from '@/services/authService'
import type { CatalogLot } from '@/types/order'
import { DistributorHeader } from '@/features/distributor-orders/shared'
import { field, money, panel, primary, vietnamToday, weight } from '@/features/distributor-orders/format'

export default function CreateDistributorOrderPage() {
  const location = useLocation()
  const navigate = useNavigate()
  const state = location.state as { lots?: CatalogLot[] } | null
  const lots = state?.lots ?? []
  const requestId = useRef<string | null>(null)
  const submission = useRef(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [address, setAddress] = useState('')
  const [phone, setPhone] = useState('')
  const [deliveryDate, setDeliveryDate] = useState('')
  const [note, setNote] = useState('')
  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (submission.current) return
    if (!/^[0-9]{10,30}$/.test(phone)) {
      setError('Số điện thoại phải có từ 10 đến 30 chữ số, không chứa chữ hoặc ký tự khác.')
      return
    }
    submission.current = true; setBusy(true); setError(null)
    requestId.current ??= crypto.randomUUID()
    try {
      const order = await createDistributorOrder({ requestId: requestId.current, lots: lots.map(l => ({ batchId: l.batchId, expectedPrice: l.wholeLotPrice, expectedWeightKg: l.weightKg })), deliveryAddress: address.trim(), contactPhone: phone.trim(), expectedDeliveryDate: deliveryDate || null, note: note.trim() || undefined })
      navigate(ROUTES.DISTRIBUTOR_ORDER_DETAIL.replace(':id', String(order.id)), { replace: true, state: { message: 'Đã gửi đơn mua nguyên lô, đang chờ quản lý kho duyệt.' } })
    } catch (cause) { setError(getAuthErrorMessage(cause, 'Không thể tạo đơn. Vui lòng thử lại.')) }
    finally { submission.current = false; setBusy(false) }
  }
  return <div className="mx-auto max-w-[1100px] space-y-5"><DistributorHeader title="Tạo Đơn Hàng" description="Kiểm tra các lô đã chọn và thông tin nhận hàng trước khi gửi đơn." />
    {!lots.length ? <div className={panel}>Bạn chưa chọn lô hàng. <Link className="text-emerald-700 underline" to={ROUTES.DISTRIBUTOR_CATALOG}>Chọn lô đang bán</Link></div> : <form onSubmit={e => void submit(e)} className="grid gap-5 lg:grid-cols-2">
      <section className={panel}><h2 className="font-bold">Các lô đặt mua ({lots.length})</h2><div className="mt-4 divide-y">{lots.map(l => <div key={l.batchId} className="flex justify-between gap-4 py-3"><div><Link className="font-semibold text-emerald-700 underline" to={ROUTES.DISTRIBUTOR_LOT_DETAIL.replace(':id', String(l.batchId))} state={{ selectedLots: lots }}>{l.productName}</Link><p className="text-xs text-slate-500">{l.batchCode} · 1 lô · {weight(l.weightKg)} kg</p></div><b className="whitespace-nowrap text-sm">{money(l.wholeLotPrice)}</b></div>)}</div><p className="mt-4 flex justify-between border-t pt-4 font-bold"><span>Tổng giá trị đơn</span><span>{money(lots.reduce((sum, l) => sum + l.wholeLotPrice, 0))}</span></p><p className="mt-4 text-sm text-slate-500">Mỗi lô được mua nguyên. Thanh toán thực hiện bên ngoài hệ thống. Đơn chờ duyệt chưa giữ hàng.</p><Link to={ROUTES.DISTRIBUTOR_CATALOG} className="mt-4 inline-block text-sm text-emerald-700 underline">Chọn lại lô</Link></section>
      <section className={`${panel} space-y-4`}><h2 className="font-bold">Thông tin giao hàng</h2>
        <label className="block text-sm">Địa chỉ nhận hàng <span className="text-rose-600">*</span><textarea className={`${field} mt-1`} required maxLength={500} rows={3} value={address} disabled={busy} onChange={e => setAddress(e.target.value)} /></label>
        <label className="block text-sm">Số điện thoại <span className="text-rose-600">*</span><input className={`${field} mt-1`} type="tel" inputMode="numeric" required minLength={10} maxLength={30} pattern="[0-9]{10,30}" title="Nhập từ 10 đến 30 chữ số, không chứa chữ hoặc ký tự khác" value={phone} disabled={busy} onChange={e => setPhone(e.target.value.replace(/[^0-9]/g, ''))} /><span className="mt-1 block text-xs text-slate-500">Ít nhất 10 chữ số.</span></label>
        <label className="block text-sm">Ngày mong muốn nhận hàng <span className="text-slate-500">(không bắt buộc)</span><input className={`${field} mt-1`} type="date" min={vietnamToday()} value={deliveryDate} disabled={busy} onChange={e => setDeliveryDate(e.target.value)} /><span className="mt-1 block text-xs text-slate-500">Đây là đề nghị của bạn. Lịch giao thực tế sẽ được thống nhất sau khi kho duyệt đơn.</span></label>
        <label className="block text-sm">Ghi chú<textarea className={`${field} mt-1`} maxLength={1000} rows={3} value={note} disabled={busy} onChange={e => setNote(e.target.value)} /></label>
        {error && <p role="alert" className="rounded-lg bg-rose-50 p-3 text-sm text-rose-700">{error}</p>}
        <button className={`${primary} w-full`} disabled={busy}>{busy ? 'Đang gửi đơn...' : 'Gửi đơn chờ duyệt'}</button>
      </section>
    </form>}
  </div>
}
