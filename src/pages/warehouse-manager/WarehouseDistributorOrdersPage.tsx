import './warehouse-orders-v3.css'
import './warehouse-dashboard.css'
import { ChevronRight, MapPin, Phone, MessageSquare, X, Check, PackageCheck, AlertTriangle } from 'lucide-react'
import FormNotification from '@/components/common/FormNotification'
import { AnimatedNumber } from '@/components/common/AnimatedNumber';
import { Link } from 'react-router';
import { ROUTES } from '@/constants/routes';
import { useCallback, useEffect, useRef, useState } from "react";
import AppIcon from "@/components/common/AppIcon";
import {
  approveWarehouseDistributorOrder,
  getWarehouseDistributorOrder,
  getWarehouseDistributorOrders,
  rejectWarehouseDistributorOrder,
  reserveWarehouseDistributorOrder,
} from "@/services/inventoryService";
import type {
  WarehouseDistributorOrderDetail,
  WarehouseDistributorOrderSummary,
} from "@/types/warehouseOrder";

const money = new Intl.NumberFormat("vi-VN", {
  style: "currency",
  currency: "VND",
  maximumFractionDigits: 0,
});
export default function WarehouseDistributorOrdersPage() {
  const [orders, setOrders] = useState<WarehouseDistributorOrderSummary[]>([]);
  const [selected, setSelected] =
    useState<WarehouseDistributorOrderDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [toast, setToast] = useState<{ message: string; tone: "success" | "error" }>({ message: "", tone: "success" });
  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [history, setHistory] = useState<WarehouseDistributorOrderSummary[]>([]);
  const [detailLoading, setDetailLoading] = useState(false);
  const [activeId, setActiveId] = useState<number | null>(null);
  const requestRef = useRef(0);
  const [tab, setTab] = useState<'pending' | 'history'>('pending');
  const [dialog, setDialog] = useState<'approve' | 'reject' | 'reserve' | null>(null);
  const [reason, setReason] = useState('');
  const [reasonError, setReasonError] = useState('');
  const sending = useRef(false);
  const dialogTrigger = useRef<HTMLElement | null>(null);
  const openDialog = (kind: 'approve' | 'reject' | 'reserve') => { dialogTrigger.current = document.activeElement instanceof HTMLElement ? document.activeElement : null; setDialog(kind); };
  useEffect(() => {
    if (!dialog) return;
    const trigger = dialogTrigger.current;
    return () => { if (trigger?.isConnected) trigger.focus(); };
  }, [dialog]);
  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const data = await getWarehouseDistributorOrders("PENDING", page);
      setOrders(data.items);
      setTotalCount(data.totalCount);
      const [approved, rejected, reserved, partial, picked, cancelled] = await Promise.all([
        getWarehouseDistributorOrders("APPROVED", 1, 20),
        getWarehouseDistributorOrders("REJECTED", 1, 20),
        getWarehouseDistributorOrders("RESERVED", 1, 20),
        getWarehouseDistributorOrders("PARTIALLY_PICKED", 1, 20),
        getWarehouseDistributorOrders("PICKED", 1, 20),
        getWarehouseDistributorOrders("CANCELLED", 1, 20),
      ]);
      setHistory(
        [...approved.items, ...rejected.items, ...reserved.items, ...partial.items, ...picked.items, ...cancelled.items].sort(
          (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
        ),
      );
    } catch {
      setError("Không thể tải danh sách đơn hàng.");
    } finally {
      setLoading(false);
    }
  }, [page]);
  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timer);
  }, [load]);
  const open = async (id: number) => {
    const requestId = ++requestRef.current;
    setActiveId(id);
    setDetailLoading(true);
    setSelected(current => current?.id === id ? current : null);
    try {
      const detail = await getWarehouseDistributorOrder(id);
      if (requestId === requestRef.current) {
        setSelected(detail);
      }
    } catch {
      if (requestId === requestRef.current) {
        setActiveId(selected?.id ?? null);
        setError("Không thể tải chi tiết đơn hàng.");
      }
    } finally {
      if (requestId === requestRef.current) setDetailLoading(false);
    }
  };
  const approve = async () => {
    if (!selected || sending.current || selected.status !== "PENDING" || !selected.stockAvailable) return;
    sending.current = true;
    setBusy(true);
    setError("");
    try {
      await approveWarehouseDistributorOrder(selected.id);
      setDialog(null);
      setToast({ message: `Đã phê duyệt đơn ${selected.orderCode}.`, tone: "success" });
      await load();
      setSelected(null);
      setActiveId(null);
    } catch (error: unknown) {
      const message = (error as { response?: { data?: { message?: string } } })
        .response?.data?.message;
      setToast({ message: message ?? "Không thể phê duyệt đơn hàng.", tone: "error" });
    } finally {
      sending.current = false;
      setBusy(false);
    }
  };
  const reject = async () => {
    if (!selected || sending.current || selected.status !== "PENDING") return;
    if (!reason.trim()) { setReasonError("Vui lòng nhập lý do từ chối."); return; }
    sending.current = true;
    setBusy(true);
    try {
      await rejectWarehouseDistributorOrder(selected.id, reason.trim());
      setDialog(null); setReason(""); setReasonError("");
      setToast({ message: `Đã từ chối đơn ${selected.orderCode}.`, tone: "success" });
      await load();
      setSelected(null);
      setActiveId(null);
    } catch (e: unknown) {
      setToast({ message: (e as { response?: { data?: { message?: string } } }).response?.data?.message ?? "Không thể từ chối đơn hàng.", tone: "error" });
    } finally {
      sending.current = false;
      setBusy(false);
    }
  };
  const reserve = async () => {
    if (!selected || sending.current || selected.status !== "APPROVED") return;
    sending.current = true;
    setBusy(true);
    setError("");
    try {
      const detail = await reserveWarehouseDistributorOrder(selected.id);
      setDialog(null);
      setToast({ message: `Đã cập nhật kết quả phân bổ cho đơn ${selected.orderCode}.`, tone: "success" });
      await load();
      setSelected(detail);
    } catch (e: unknown) {
      setToast({ message: (e as { response?: { data?: { message?: string } } }).response?.data?.message ?? "Chưa thể giữ đủ hàng cho đơn. Đơn vẫn chờ phân bổ.", tone: "error" });
    } finally { sending.current = false; setBusy(false); }
  };
  const statusNames: Record<string, string> = { PENDING: 'Chờ duyệt', APPROVED: 'Đã duyệt · chờ phân bổ', RESERVED: 'Đã giữ hàng', PARTIALLY_PICKED: 'Đang soạn một phần', PICKED: 'Đã soạn đủ', REJECTED: 'Đã từ chối', CANCELLED: 'Đã hủy' };
  const visible = tab === 'pending' ? orders : history;
  const date = (value?: string) => value ? new Date(value).toLocaleDateString('vi-VN') : 'Chưa ghi nhận';
  return <div className="saw-order-review">
    <FormNotification warehouse message={toast.message} tone={toast.tone} onDismiss={() => setToast(current => ({ ...current, message: "" }))} />
    <header className="order-header"><div><p>Điều hành kho / Phê duyệt đơn</p><h1>Phê duyệt đơn nhà phân phối</h1><span>Kiểm tra tồn kho và thông tin đơn hàng trước khi xác nhận xuất hàng.</span></div><div className="saw-wm-dashboard"><button type="button" className="wm-refresh" disabled={loading || busy} onClick={() => { if (!loading && !busy) { void load(); if (selected) void open(selected.id); } }}><AppIcon name="refresh" className={loading ? 'wm-spin' : ''} /> Làm mới</button></div></header>
    {error && <div role="alert" className="order-error">{error} <button type="button" onClick={() => void load()}>Thử lại</button></div>}
    <div className="order-layout"><section className="order-list-panel"><div className="order-list-heading"><h2>Danh sách đơn hàng</h2></div><div className="order-tabs" role="tablist" aria-label="Nhóm đơn hàng"><button role="tab" aria-selected={tab === 'pending'} onClick={() => setTab('pending')}>Chờ duyệt <span><AnimatedNumber value={totalCount} /></span></button><button role="tab" aria-selected={tab === 'history'} onClick={() => setTab('history')}>Lịch sử xử lý</button></div>
      {loading && !visible.length ? <p className="order-empty">Đang tải...</p> : !visible.length ? <p className="order-empty">{tab === 'pending' ? 'Không có đơn chờ duyệt.' : 'Chưa có lịch sử xử lý.'}</p> : <div className="order-list">{visible.map(o => <button type="button" key={`${o.id}-${o.status}`} className={`order-row${activeId === o.id ? ' is-selected' : ''}`} aria-pressed={activeId === o.id} onClick={() => void open(o.id)}><span className="order-row-main"><strong>{o.orderCode}</strong><span>{o.distributorName || 'Chưa ghi nhận'}</span><small>Ngày tạo: {date(o.createdAt)} · {statusNames[o.status] ?? o.status}</small></span><span className="order-row-trailing"><span className="order-row-value">{money.format(o.totalAmount)}</span><span className="order-review-action">{activeId === o.id ? 'Đang xem' : 'Xem xét'} {activeId === o.id ? <Check aria-hidden="true" /> : <ChevronRight aria-hidden="true" />}</span></span></button>)}</div>}
      <div className="order-pagination">{tab === 'pending' ? <><span><AnimatedNumber value={totalCount} /> đơn</span><div><button type="button" disabled={page === 1 || loading} onClick={() => setPage(v => v-1)}>Trước</button><b>{page}</b><button type="button" disabled={page*20 >= totalCount || loading} onClick={() => setPage(v => v+1)}>Sau</button></div></> : <span>Đã tải {history.length} đơn lịch sử</span>}</div>
    </section><section className="order-detail-panel" aria-label="Chi tiết đơn hàng">{detailLoading ? <p className="order-empty">Đang tải chi tiết đơn...</p> : !selected ? <div className="order-detail-empty"><PackageCheck /><h2>Chọn đơn hàng để xem chi tiết</h2><p>Thông tin đơn và đối chiếu tồn kho sẽ hiển thị tại đây.</p></div> : <div key={selected.id} className="order-detail-content">
      <div className="order-detail-heading"><div><small>Chi tiết đơn hàng</small><h2>{selected.orderCode}</h2></div><div><span className="order-status">{statusNames[selected.status] ?? selected.status}</span><button type="button" aria-label="Đóng chi tiết đơn" onClick={() => { requestRef.current++; setSelected(null); setActiveId(null) }}><X /></button></div></div>
      <h3 className="order-info-title">Thông tin giao hàng</h3>
      <div className="order-dates"><div><small>Nhà phân phối</small><strong>{selected.distributorName || 'Chưa ghi nhận'}</strong></div><div><small>Ngày tạo</small><strong>{date(selected.createdAt)}</strong></div><div><small>Ngày giao dự kiến</small><strong>{date(selected.expectedDeliveryDate)}</strong></div></div>
      <div className="order-delivery"><div><MapPin /><span>Địa chỉ giao</span><strong>{selected.deliveryAddress?.trim() || 'Chưa ghi nhận'}</strong></div><div><Phone /><span>Liên hệ</span><strong>{selected.contactPhone?.trim() || 'Chưa ghi nhận'}</strong></div><div><MessageSquare /><span>Ghi chú</span><strong>{selected.orderNote?.trim() || 'Chưa ghi nhận'}</strong></div></div>
      {selected.cancellationReason && <p className="order-alert">Lý do hủy: {selected.cancellationReason} Đối soát tiền ngoài hệ thống.</p>}
      {selected.adjustments?.map(a => <Link data-saw-transition="" key={a.id} className="order-adjustment" to={ROUTES.WAREHOUSE_STOCK_ADJUSTMENT_DETAIL.replace(':id', String(a.id))}>{a.code} · Xem tiến độ xử lý điều chỉnh tồn</Link>)}
      <div className="order-stock"><h3>Đối chiếu tồn kho</h3><div className="order-table-wrap"><table><thead><tr><th>Lô hàng</th><th>Yêu cầu</th><th>Khả dụng</th><th>Giá nguyên lô</th><th>Điều kiện</th></tr></thead><tbody>{selected.lines.map(l => <tr key={l.orderDetailId}><td><strong>{l.productName}</strong><small>{l.batchCode || 'Chưa ghi nhận'}</small></td><td>{l.requestedWeightKg} kg</td><td>{l.availableWeightKg} kg</td><td>{money.format(l.unitPrice)}</td><td className={l.stockAvailable ? 'order-good' : 'order-warning'}>{l.stockAvailable ? 'Đủ điều kiện' : `Thiếu ${Math.max(l.requestedWeightKg - l.availableWeightKg, 0)} kg`}</td></tr>)}</tbody></table></div>{!selected.stockAvailable && selected.status === 'PENDING' && <p className="order-alert"><AlertTriangle /> Đơn chưa đủ điều kiện tồn kho để duyệt.</p>}</div>
      <footer className="order-detail-footer"><div><small>Tổng giá trị đơn</small><strong>{money.format(selected.totalAmount)}</strong></div><div className="order-actions">{selected.status === 'APPROVED' && <button type="button" className="order-secondary" disabled={busy} onClick={() => openDialog('reserve')}><PackageCheck /> Thử phân bổ hàng</button>}{selected.status === 'PENDING' && <><button type="button" className="order-reject" disabled={busy} onClick={() => {setReasonError('');openDialog('reject')}}><X /> Từ chối đơn</button><button type="button" className="order-primary" disabled={busy || !selected.stockAvailable} onClick={() => openDialog('approve')}><Check /> Duyệt đơn</button></>}</div></footer>
    </div>}</section></div>
    {dialog && selected && <div className="order-overlay" onMouseDown={e => { if(e.target === e.currentTarget && !busy) setDialog(null) }}><div role="dialog" aria-modal="true" aria-labelledby="order-dialog-title" className="order-modal" onKeyDown={e => { if (e.key === 'Escape' && !busy) setDialog(null); if (e.key === 'Tab') { const controls = [...e.currentTarget.querySelectorAll<HTMLElement>('button:not(:disabled), textarea:not(:disabled)')]; if (!controls.length) return; const first = controls[0], last = controls[controls.length - 1]; if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); } else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); } } }}><div className="order-modal-heading"><div><h2 id="order-dialog-title">{dialog === 'approve' ? 'Xác nhận phê duyệt đơn hàng' : dialog === 'reject' ? 'Từ chối đơn hàng' : 'Xác nhận phân bổ hàng'}</h2><p>{selected.orderCode} · {selected.distributorName}</p></div><button type="button" aria-label="Đóng" disabled={busy} onClick={() => setDialog(null)}><X /></button></div>{dialog === 'reject' ? <label className="order-reason">Lý do từ chối<textarea value={reason} onChange={e => {setReason(e.target.value);setReasonError('')}} placeholder="Nhập lý do từ chối đơn hàng..." aria-invalid={!!reasonError} />{reasonError && <span role="alert">{reasonError}</span>}</label> : <p className="order-modal-copy">{dialog === 'approve' ? `Xác nhận duyệt đơn có tổng giá trị ${money.format(selected.totalAmount)}?` : 'Xác nhận thử phân bổ đủ hàng đã duyệt cho đơn này?'}</p>}<div className="order-modal-actions"><button type="button" autoFocus className="order-secondary" disabled={busy} onClick={() => setDialog(null)}>Hủy</button><button type="button" className={dialog === 'reject' ? 'order-confirm-reject' : 'order-primary'} disabled={busy} onClick={() => void (dialog === 'approve' ? approve() : dialog === 'reject' ? reject() : reserve())}>{busy ? 'Đang xử lý...' : dialog === 'approve' ? 'Xác nhận duyệt' : dialog === 'reject' ? 'Xác nhận từ chối' : 'Xác nhận phân bổ'}</button></div></div></div>}
  </div>;
}
