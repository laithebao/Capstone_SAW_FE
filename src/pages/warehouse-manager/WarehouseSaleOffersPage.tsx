import './warehouse-sale-offers.css'
import './warehouse-dashboard.css'
import FormNotification from '@/components/common/FormNotification'
import { Search, Save, Eye, EyeOff, Lock, AlertTriangle } from 'lucide-react'
import { AnimatedNumber } from '@/components/common/AnimatedNumber';
import { useCallback, useEffect, useRef, useState } from "react";
import type { FormEvent } from "react";
import AppIcon from "@/components/common/AppIcon";
import {
  getWarehouseSaleOffers,
  updateWarehouseSaleOffer,
} from "@/services/inventoryService";
import type { WarehouseSaleOfferItem } from "@/types/warehouseSaleOffer";

const money = new Intl.NumberFormat("vi-VN", {
  style: "currency",
  currency: "VND",
  maximumFractionDigits: 0,
});
const weight = new Intl.NumberFormat("vi-VN", { maximumFractionDigits: 2 });

function apiMessage(error: unknown, fallback: string) {
  return (
    (error as { response?: { data?: { message?: string } } }).response?.data
      ?.message ?? fallback
  );
}

export default function WarehouseSaleOffersPage() {
  const [items, setItems] = useState<WarehouseSaleOfferItem[]>([]);
  const [prices, setPrices] = useState<Record<number, string>>({});
  const [query, setQuery] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [busyAction, setBusyAction] = useState<"price" | "visibility" | null>(null);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [actionError, setActionError] = useState("");
  const [invalidPriceId, setInvalidPriceId] = useState<number | null>(null);
  const dirtyPrices = useRef(new Set<number>());
  const pendingAction = useRef(false);

  const load = useCallback(async (signal?: AbortSignal) => {
    setLoading(true);
    setError("");
    try {
      const result = await getWarehouseSaleOffers(search, page, signal);
      setItems(result.items);
      setTotalCount(result.totalCount);
      setPrices(current => Object.fromEntries(result.items.map(item => [item.batchId, dirtyPrices.current.has(item.batchId) ? current[item.batchId] ?? '' : (item.requiresRepricing ? '' : item.wholeLotPrice?.toString() ?? '')])));
    } catch (loadError: unknown) {
      if ((loadError as { name?: string }).name !== "CanceledError")
        setError(apiMessage(loadError, "Không thể tải danh sách lô trong kho."));
    } finally {
      if (!signal?.aborted) setLoading(false);
    }
  }, [page, search]);

  useEffect(() => {
    const controller = new AbortController();
    // The request lifecycle intentionally starts when the route/search page changes.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load(controller.signal);
    return () => controller.abort();
  }, [load]);

  const submitSearch = (event: FormEvent) => {
    event.preventDefault();
    setPage(1);
    setSearch(query.trim());
  };

  const save = async (item: WarehouseSaleOfferItem, isPublished: boolean, action: "price" | "visibility") => {
    if (pendingAction.current) return;
    setMessage(""); setActionError("");
    if (item.isPendingApproval) {
      setActionError("Lô hàng đang chờ duyệt đơn mua, không thể thay đổi giá hoặc trạng thái bán.");
      return;
    }
    if (item.isSold) {
      setActionError("Lô hàng đã bán, không thể thay đổi giá hoặc trạng thái bán.");
      return;
    }
    const price = Number(prices[item.batchId]);
    if (!Number.isFinite(price) || price <= 0) {
      setInvalidPriceId(item.batchId);
      setActionError("Giá bán nguyên lô phải lớn hơn 0.");
      return;
    }
    setInvalidPriceId(null);
    if (isPublished && !item.canPublish) {
      setActionError(item.ineligibilityReason ?? "Lô hàng chưa đủ điều kiện công bố bán.");
      return;
    }
    pendingAction.current = true;
    setBusyId(item.batchId);
    setBusyAction(action);
    setActionError("");
    setMessage("");
    try {
      const updated = await updateWarehouseSaleOffer(item.batchId, {
        expectedSnapshot: item.publicationSnapshot,
        wholeLotPrice: price,
        isPublished,
      });
      setItems((current) =>
        current.map((row) => (row.batchId === item.batchId ? updated : row)),
      );
      dirtyPrices.current.delete(item.batchId);
      setPrices((current) => ({
        ...current,
        [item.batchId]: updated.wholeLotPrice?.toString() ?? "",
      }));
      setMessage(action === "price" ? `Đã lưu giá lô ${item.batchCode}.` : isPublished ? `Đã công bố lô ${item.batchCode} cho nhà phân phối.` : `Đã ẩn lô ${item.batchCode} khỏi danh mục nhà phân phối.`);
    } catch (saveError: unknown) {
      setActionError(apiMessage(saveError, "Không thể cập nhật giá và trạng thái bán."));
    } finally {
      pendingAction.current = false;
      setBusyId(null);
      setBusyAction(null);
    }
  };

  return <div className="saw-sale-offers-page">
    <header className="sale-header"><div><p>Điều hành kho / Công bố lô bán</p><h1>Công bố lô bán</h1><span>Quản lý giá bán nguyên lô và công bố lô hàng cho nhà phân phối.</span></div><div className="saw-wm-dashboard"><button type="button" className="wm-refresh" disabled={loading || busyId !== null} onClick={() => void load()}><AppIcon name="refresh" className={loading ? 'wm-spin' : ''} /> Làm mới</button></div></header>
    {error && <div role="alert" className="sale-load-error">{error} <button onClick={() => void load()} type="button">Thử lại</button></div>}
    <FormNotification warehouse message={actionError || message} tone={actionError ? 'error' : 'success'} onDismiss={() => { setActionError(''); setMessage('') }} />
    <section className="sale-panel"><div className="sale-panel-head"><div><h2>Danh sách lô đã có tồn kho</h2><p>Giá áp dụng cho toàn bộ lô, không phải giá mỗi kg.</p></div><span><AnimatedNumber value={totalCount} /> lô hàng</span></div>
      <form className="sale-search" onSubmit={submitSearch}><label><Search size={16} /><input aria-label="Tìm lô hàng" value={query} onChange={e => setQuery(e.target.value)} placeholder="Tìm mã lô, sản phẩm hoặc loại nông sản" /></label><button type="submit" className="sale-primary">Tìm kiếm</button><button type="button" className="sale-secondary" onClick={() => { setQuery(''); setSearch(''); setPage(1) }}>Đặt lại</button></form>
      {loading && !items.length ? <p className="sale-empty">Đang tải dữ liệu...</p> : !items.length ? <p className="sale-empty">Chưa có lô hàng nào đã nhập kho.</p> : <div className="sale-table-wrap"><table className="sale-table"><thead><tr><th>Lô hàng</th><th>Chất lượng</th><th>Khối lượng</th><th>Giá nguyên lô</th><th>Trạng thái bán</th><th>Thao tác</th></tr></thead><tbody>{items.map(item => {const locked = item.batchStatus === 'DISPOSED' || item.isPendingApproval || item.isSold; const status = item.batchStatus === 'DISPOSED' ? 'Đã loại bỏ' : item.isPendingApproval ? 'Đang chờ duyệt' : item.isSold ? 'Đã bán' : item.isPublished ? 'Đã công bố' : 'Chưa công bố'; return <tr key={item.batchId}>
        <td><strong>{item.productName}</strong><small className="sale-code">{item.batchCode}</small><small>{item.cropName}</small></td>
        <td><span className="sale-grade">{item.qualityGrade ? `Hạng ${item.qualityGrade}` : 'Chưa ghi nhận'}</span></td>
        <td><strong>{weight.format(item.availableWeightKg)} kg</strong><small>Nhập kho {weight.format(item.verifiedWeightKg)} kg</small></td>
        <td>{locked ? <strong>{item.wholeLotPrice == null ? 'Chưa ghi nhận' : money.format(item.wholeLotPrice)}</strong> : <><div className="sale-price-editor"><input aria-label={`Giá bán lô ${item.batchCode}`} type="number" aria-invalid={invalidPriceId === item.batchId} min="1" step="1" value={prices[item.batchId] ?? ''} onChange={e => { dirtyPrices.current.add(item.batchId); setInvalidPriceId(null); setPrices(current => ({...current,[item.batchId]:e.target.value})) }} placeholder="Nhập giá VND" /><button type="button" className={`sale-secondary${busyAction === "visibility" ? " sale-save--held" : ""}`} disabled={busyId !== null} onClick={() => void save(item,item.isPublished,'price')}><Save size={15} /> {busyId === item.batchId && busyAction === "price" ? 'Đang lưu' : 'Lưu'}</button></div>{invalidPriceId === item.batchId && <small className="sale-price-error">Giá bán nguyên lô phải lớn hơn 0.</small>}{item.wholeLotPrice != null && <small>Hiện tại: {money.format(item.wholeLotPrice)}</small>}{item.requiresRepricing && <small className="sale-warning"><AlertTriangle size={14} /> Cần định giá lại phần lô đã kiểm đếm. Cần lưu giá mới trước khi công bố.</small>}</>}</td>
        <td><span className={`sale-status ${item.batchStatus === 'DISPOSED' ? 'is-danger' : item.isPendingApproval ? 'is-waiting' : item.isSold ? 'is-sold' : item.isPublished ? 'is-published' : ''}`}>{status}</span></td>
        <td>{locked ? <span className="sale-locked"><Lock size={14} /> {item.batchStatus === 'DISPOSED' ? 'Đã loại bỏ khỏi tồn kho' : item.isPendingApproval ? 'Chờ xử lý đơn' : 'Đã hoàn tất bán'}</span> : <><button type="button" disabled={busyId !== null || (!item.isPublished && !item.canPublish)} onClick={() => void save(item,!item.isPublished,'visibility')} className={item.isPublished ? 'sale-secondary' : 'sale-primary'}>{item.isPublished ? <EyeOff size={15} /> : <Eye size={15} />}{item.isPublished ? 'Ẩn lô' : 'Công bố bán'}</button>{!item.isPublished && !item.canPublish && item.ineligibilityReason && <small>{item.ineligibilityReason}</small>}</>}</td>
      </tr>})}</tbody></table></div>}
      <div className="sale-pagination"><span>Hiển thị {totalCount ? (page-1)*20+1 : 0}–{Math.min(page*20,totalCount)} / {totalCount} lô</span><div><button className="sale-secondary" type="button" disabled={page === 1 || loading} onClick={() => setPage(v => v-1)}>Trước</button><b>{page}</b><button className="sale-secondary" type="button" disabled={page*20 >= totalCount || loading} onClick={() => setPage(v => v+1)}>Sau</button></div></div>
    </section>
  </div>
}
