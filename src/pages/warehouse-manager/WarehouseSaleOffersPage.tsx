import { useCallback, useEffect, useState } from "react";
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
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const load = useCallback(async (signal?: AbortSignal) => {
    setLoading(true);
    setError("");
    try {
      const result = await getWarehouseSaleOffers(search, page, signal);
      setItems(result.items);
      setTotalCount(result.totalCount);
      setPrices(
        Object.fromEntries(
          result.items.map((item) => [
            item.batchId,
            item.requiresRepricing ? "" : item.wholeLotPrice?.toString() ?? "",
          ]),
        ),
      );
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

  const save = async (item: WarehouseSaleOfferItem, isPublished: boolean) => {
    if (item.isPendingApproval) {
      setError("Lô hàng đang chờ duyệt đơn mua, không thể thay đổi giá hoặc trạng thái bán.");
      return;
    }
    if (item.isSold) {
      setError("Lô hàng đã bán, không thể thay đổi giá hoặc trạng thái bán.");
      return;
    }
    const price = Number(prices[item.batchId]);
    if (!Number.isFinite(price) || price <= 0) {
      setError("Giá bán nguyên lô phải lớn hơn 0.");
      return;
    }
    if (isPublished && !item.canPublish) {
      setError(item.ineligibilityReason ?? "Lô hàng chưa đủ điều kiện công bố bán.");
      return;
    }
    setBusyId(item.batchId);
    setError("");
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
      setPrices((current) => ({
        ...current,
        [item.batchId]: updated.wholeLotPrice?.toString() ?? "",
      }));
      setMessage(
        isPublished
          ? `Đã công bố lô ${item.batchCode} cho nhà phân phối.`
          : item.isPublished
            ? `Đã ẩn lô ${item.batchCode} khỏi danh mục nhà phân phối.`
            : `Đã lưu giá lô ${item.batchCode}.`,
      );
    } catch (saveError: unknown) {
      setError(apiMessage(saveError, "Không thể cập nhật giá và trạng thái bán."));
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="min-h-full bg-slate-50 p-6">
      <div className="mx-auto max-w-7xl space-y-6">
        <header className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-emerald-700">Điều hành kho</p>
            <h1 className="text-3xl font-bold text-slate-950">Công bố lô hàng đang bán</h1>
            <p className="mt-1 max-w-3xl text-slate-500">
              Đặt giá nguyên lô và công bố các lô đã kiểm định, nhập kho để nhà phân phối nhìn thấy trong danh mục.
            </p>
          </div>
          <button
            type="button"
            onClick={() => void load()}
            className="flex items-center gap-2 rounded-lg bg-emerald-700 px-4 py-2.5 text-sm font-semibold text-white"
          >
            <AppIcon name="refresh" className="size-4" /> Làm mới
          </button>
        </header>

        <form onSubmit={submitSearch} className="flex gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Tìm mã lô, sản phẩm hoặc loại nông sản"
            className="min-w-0 flex-1 rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-emerald-600"
          />
          <button className="rounded-lg bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white">Tìm kiếm</button>
        </form>

        {error && <div className="rounded-lg bg-rose-50 p-3 text-sm text-rose-700">{error}</div>}
        {message && <div className="rounded-lg bg-emerald-50 p-3 text-sm text-emerald-700">{message}</div>}

        <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
            <div>
              <h2 className="font-bold text-slate-900">Lô đã có tồn kho</h2>
              <p className="text-sm text-slate-500">Giá áp dụng cho toàn bộ lô, không phải giá mỗi kg.</p>
            </div>
            <span className="rounded-full bg-slate-100 px-3 py-1 text-sm font-semibold text-slate-600">{totalCount} lô</span>
          </div>
          {loading ? (
            <p className="py-14 text-center text-slate-500">Đang tải dữ liệu...</p>
          ) : items.length === 0 ? (
            <p className="py-14 text-center text-slate-500">Chưa có lô hàng nào đã nhập kho.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[900px] text-left text-sm">
                <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                  <tr>
                    <th className="px-4 py-3">Lô hàng</th>
                    <th className="px-4 py-3">Chất lượng</th>
                    <th className="px-4 py-3">Khối lượng</th>
                    <th className="px-4 py-3">Giá nguyên lô</th>
                    <th className="px-4 py-3">Trạng thái bán</th>
                    <th className="px-4 py-3 text-right">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {items.map((item) => (
                    <tr key={item.batchId} className="align-top">
                      <td className="px-4 py-4">
                        <p className="font-bold text-slate-900">{item.batchCode}</p>
                        <p>{item.productName}</p>
                        <p className="text-xs text-slate-500">{item.cropName}</p>
                      </td>
                      <td className="px-4 py-4">
                        <span className="rounded-full bg-sky-50 px-2.5 py-1 text-xs font-bold text-sky-700">
                          Hạng {item.qualityGrade ?? "—"}
                        </span>
                      </td>
                      <td className="px-4 py-4">
                        <p className="font-semibold">{weight.format(item.availableWeightKg)} kg khả dụng</p>
                        <p className="text-xs text-slate-500">Nhập kho {weight.format(item.verifiedWeightKg)} kg</p>
                      </td>
                      <td className="px-4 py-4">
                        {item.batchStatus === 'DISPOSED' || item.isPendingApproval || item.isSold ? (
                          <p className="font-semibold text-slate-900">
                            {item.wholeLotPrice == null ? "—" : money.format(item.wholeLotPrice)}
                          </p>
                        ) : (
                          <>
                            <input
                              aria-label={`Giá bán lô ${item.batchCode}`}
                              type="number"
                              min="1"
                              step="1"
                              value={prices[item.batchId] ?? ""}
                              onChange={(event) => setPrices((current) => ({ ...current, [item.batchId]: event.target.value }))}
                              className="w-44 rounded-lg border border-slate-300 px-3 py-2 font-semibold outline-none focus:border-emerald-600"
                              placeholder="Nhập giá VND"
                            />
                            {item.requiresRepricing && <p className="mt-1 text-xs font-semibold text-amber-800">Cần định giá lại phần lô đã kiểm đếm. Cần lưu giá mới trước khi công bố.</p>}
                            {item.wholeLotPrice && <p className="mt-1 text-xs text-slate-500">Hiện tại: {money.format(item.wholeLotPrice)}</p>}
                          </>
                        )}
                      </td>
                      <td className="px-4 py-4">
                        <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${item.batchStatus === "DISPOSED" ? "bg-rose-50 text-rose-700" : item.isPendingApproval ? "bg-amber-50 text-amber-700" : item.isSold ? "bg-blue-50 text-blue-700" : item.isPublished ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-600"}`}>
                          {item.batchStatus === "DISPOSED" ? "Đã loại bỏ" : item.isPendingApproval ? "Đang chờ duyệt" : item.isSold ? "Đã bán" : item.isPublished ? "Đã công bố" : "Chưa công bố"}
                        </span>
                      </td>
                      <td className="px-4 py-4">
                        {item.batchStatus === 'DISPOSED' || item.isPendingApproval || item.isSold ? (
                          <p className="text-right text-sm font-semibold text-slate-500">
                            {item.batchStatus === "DISPOSED" ? "Đã loại bỏ khỏi tồn kho" : item.isPendingApproval ? "Chờ xử lý đơn" : "Đã hoàn tất bán"}
                          </p>
                        ) : (
                          <div className="flex justify-end gap-2">
                            <button
                              disabled={busyId === item.batchId}
                              onClick={() => void save(item, item.isPublished)}
                              className="rounded-lg border border-slate-300 px-3 py-2 font-semibold text-slate-700 disabled:opacity-50"
                            >
                              Lưu giá
                            </button>
                            <button
                              disabled={busyId === item.batchId || (!item.isPublished && !item.canPublish)}
                              onClick={() => void save(item, !item.isPublished)}
                              className={`rounded-lg px-3 py-2 font-semibold text-white disabled:cursor-not-allowed disabled:opacity-40 ${item.isPublished ? "bg-slate-600" : "bg-emerald-700"}`}
                            >
                              {item.isPublished ? "Ẩn lô" : "Công bố bán"}
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <div className="flex items-center justify-between border-t border-slate-200 px-5 py-4 text-sm">
            <span>Trang {page}</span>
            <div className="flex gap-2">
              <button disabled={page === 1} onClick={() => setPage((value) => value - 1)} className="rounded border px-3 py-1.5 disabled:opacity-40">Trước</button>
              <button disabled={page * 20 >= totalCount} onClick={() => setPage((value) => value + 1)} className="rounded border px-3 py-1.5 disabled:opacity-40">Sau</button>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
