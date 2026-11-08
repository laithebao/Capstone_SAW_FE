import { useEffect, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router'
import { ROUTES } from '@/constants/routes'
import { createGoodsIssue, getIssueOrder, getIssueOrders } from '@/services/goodsIssueService'
import { getAuthErrorMessage } from '@/services/authService'
import GoodsIssueForm, { issueInput } from '@/features/operation/components/GoodsIssueForm'
import type { GoodsIssueOrder } from '@/types/goodsIssue'
import type { PagedResponse } from '@/types/api'

export default function CreateGoodsIssuePage() {
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const [selected, setSelected] = useState(Number(params.get('orderId')) || 0)
  const [search, setSearch] = useState('')
  const [query, setQuery] = useState({ search: '', page: 1 })
  const [orders, setOrders] = useState<PagedResponse<GoodsIssueOrder> | null>(null)
  const [order, setOrder] = useState<GoodsIssueOrder | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [reload, setReload] = useState(0)
  useEffect(() => {
    const controller = new AbortController()
    const timer = window.setTimeout(async () => {
      setLoading(true); setError(''); setOrder(null)
      try { const [rows, detail] = await Promise.all([getIssueOrders(query.search, query.page, controller.signal), selected > 0 ? getIssueOrder(selected, controller.signal) : Promise.resolve(null)]); if (!controller.signal.aborted) { setOrders(rows); setOrder(detail) } }
      catch (e) { if (!controller.signal.aborted) setError(getAuthErrorMessage(e, 'Không thể tải đơn đã soạn.')) }
      finally { if (!controller.signal.aborted) setLoading(false) }
    }, 0)
    return () => { controller.abort(); window.clearTimeout(timer) }
  }, [query, selected, reload])
  return <div className="space-y-6"><header className="flex flex-wrap items-center justify-between gap-4"><div><p className="text-sm font-semibold text-emerald-700">VẬN HÀNH · XUẤT KHO</p><h1 className="mt-2 text-3xl font-bold">Tạo phiếu xuất kho</h1></div><Link to={ROUTES.OPERATION_GOODS_ISSUES} className="rounded-lg border bg-white px-4 py-2">Quay lại danh sách</Link></header>
    <section className="space-y-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm"><h2 className="text-lg font-bold">Chọn đơn có hàng đã soạn</h2><form className="flex gap-2" onSubmit={e => { e.preventDefault(); setQuery({ search, page: 1 }) }}><input aria-label="Tìm đơn đã soạn" className={issueInput} maxLength={100} value={search} onChange={e => setSearch(e.target.value)} placeholder="Mã đơn / nhà phân phối" /><button className="shrink-0 rounded-lg border px-4">Tìm kiếm</button></form>
      <label className="block space-y-2 text-sm">Đơn hàng<select aria-label="Đơn hàng xuất kho" className={issueInput} value={selected || ''} disabled={loading} onChange={e => setSelected(Number(e.target.value))}><option value="">Chọn đơn hàng</option>{selected > 0 && order && !orders?.items.some(o => o.id === selected) && <option value={selected}>{order.orderCode} · {order.distributorName}</option>}{orders?.items.map(o => <option key={o.id} value={o.id}>{o.orderCode} · {o.distributorName}</option>)}</select></label>
      {!loading && !orders?.items.length && <p className="text-sm text-slate-500">Không có đơn còn lượng đã soạn được phép xuất.</p>}
      {orders && <div className="flex gap-3 text-sm"><button disabled={query.page <= 1 || loading} onClick={() => setQuery(old => ({ ...old, page: old.page - 1 }))}>Trang trước</button><span>{query.page}/{Math.max(1, Math.ceil(orders.totalCount / orders.pageSize))}</span><button disabled={query.page * orders.pageSize >= orders.totalCount || loading} onClick={() => setQuery(old => ({ ...old, page: old.page + 1 }))}>Trang sau</button></div>}
    </section>
    {loading && <p role="status">Đang tải đơn hàng...</p>}{error && <p role="alert" className="rounded-lg bg-rose-50 p-4 text-rose-700">{error}<button className="ml-3 underline" onClick={() => setReload(x => x + 1)}>Thử lại</button></p>}
    {!loading && !error && order && <GoodsIssueForm key={order.id} order={order} onSave={async (draft, requestId) => { const saved = await createGoodsIssue({ ...draft, requestId, purchaseOrderId: order.id }); navigate(ROUTES.OPERATION_GOODS_ISSUE_DETAIL.replace(':id', String(saved.summary.id))) }} />}
  </div>
}
