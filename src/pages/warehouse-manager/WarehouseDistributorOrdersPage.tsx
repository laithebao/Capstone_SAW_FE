import { useEffect, useRef, useState } from "react";
import AppIcon from "@/components/common/AppIcon";
import {
  approveWarehouseDistributorOrder,
  getWarehouseDistributorOrder,
  getWarehouseDistributorOrders,
  rejectWarehouseDistributorOrder,
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
  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [detailLoading, setDetailLoading] = useState(false);
  const [editedLines, setEditedLines] = useState<
    Record<number, { weight: number; price: number }>
  >({});
  const requestRef = useRef(0);
  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const data = await getWarehouseDistributorOrders("PENDING", page);
      setOrders(data.items);
      setTotalCount(data.totalCount);
    } catch {
      setError("Không thể tải danh sách đơn hàng.");
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    void load();
  }, [page]);
  const open = async (id: number) => {
    const requestId = ++requestRef.current;
    setDetailLoading(true);
    setSelected(null);
    try {
      const detail = await getWarehouseDistributorOrder(id);
      if (requestId === requestRef.current) {
        setSelected(detail);
        setEditedLines(
          Object.fromEntries(
            detail.lines.map((line) => [
              line.orderDetailId,
              {
                weight: line.approvedWeightKg || line.requestedWeightKg,
                price: line.unitPrice,
              },
            ]),
          ),
        );
      }
    } catch {
      if (requestId === requestRef.current)
        setError("Không thể tải chi tiết đơn hàng.");
    } finally {
      if (requestId === requestRef.current) setDetailLoading(false);
    }
  };
  const approve = async () => {
    if (!selected || !window.confirm(`Duyệt đơn ${selected.orderCode}?`))
      return;
    setBusy(true);
    setError("");
    try {
      const lines = selected.lines.map((line) => ({
        orderDetailId: line.orderDetailId,
        approvedWeightKg:
          editedLines[line.orderDetailId]?.weight ?? line.requestedWeightKg,
        unitPrice: editedLines[line.orderDetailId]?.price ?? line.unitPrice,
      }));
      setSelected(await approveWarehouseDistributorOrder(selected.id, lines));
      await load();
    } catch (error: unknown) {
      const message = (error as { response?: { data?: { message?: string } } })
        .response?.data?.message;
      setError(message ?? "Không thể phê duyệt đơn hàng.");
    } finally {
      setBusy(false);
    }
  };
  const reject = async () => {
    if (!selected) return;
    const reason = window.prompt("Nhập lý do từ chối đơn:");
    if (!reason?.trim()) return;
    setBusy(true);
    try {
      setSelected(await rejectWarehouseDistributorOrder(selected.id, reason));
      await load();
    } catch {
      setError("Không thể từ chối đơn hàng.");
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="min-h-full bg-slate-50 p-6">
      <div className="mx-auto max-w-7xl space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold text-emerald-700">
              Điều hành kho
            </p>
            <h1 className="text-3xl font-bold text-slate-950">
              Phê duyệt đơn nhà phân phối
            </h1>
            <p className="mt-1 text-slate-500">
              Kiểm tra tồn kho trước khi xác nhận đơn xuất hàng.
            </p>
          </div>
          <button
            onClick={() => void load()}
            className="flex items-center gap-2 rounded-lg bg-emerald-700 px-4 py-2 text-sm font-semibold text-white"
          >
            <AppIcon name="pending" />
            Làm mới
          </button>
        </div>
        {error && (
          <div className="rounded-lg bg-rose-50 p-3 text-sm text-rose-700">
            {error}
          </div>
        )}
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-bold text-slate-900">Đơn chờ duyệt</h2>
            <span className="rounded-full bg-amber-50 px-3 py-1 text-sm font-semibold text-amber-700">
              {orders.length} đơn
            </span>
          </div>
          {loading ? (
            <p className="py-10 text-center text-slate-500">Đang tải...</p>
          ) : orders.length === 0 ? (
            <p className="py-10 text-center text-slate-500">
              Không có đơn chờ duyệt.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-slate-200 text-xs uppercase text-slate-500">
                  <tr>
                    <th className="p-3">Mã đơn</th>
                    <th className="p-3">Nhà phân phối</th>
                    <th className="p-3">Ngày tạo</th>
                    <th className="p-3">Giá trị</th>
                    <th className="p-3">Thao tác</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.map((o) => (
                    <tr key={o.id} className="border-b border-slate-100">
                      <td className="p-3 font-semibold text-slate-900">
                        {o.orderCode}
                      </td>
                      <td className="p-3">{o.distributorName}</td>
                      <td className="p-3">
                        {new Date(o.createdAt).toLocaleDateString("vi-VN")}
                      </td>
                      <td className="p-3">{money.format(o.totalAmount)}</td>
                      <td className="p-3">
                        <button
                          onClick={() => void open(o.id)}
                          className="rounded-lg border border-emerald-200 px-3 py-1.5 font-semibold text-emerald-700 hover:bg-emerald-50"
                        >
                          Xem xét
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="mt-4 flex items-center justify-between text-sm text-slate-500">
                <span>{totalCount} đơn tất cả</span>
                <div className="flex gap-2">
                  <button
                    disabled={page === 1}
                    onClick={() => setPage((value) => value - 1)}
                    className="rounded border px-3 py-1 disabled:opacity-40"
                  >
                    Trang trước
                  </button>
                  <span className="px-2 py-1">{page}</span>
                  <button
                    disabled={page * 20 >= totalCount}
                    onClick={() => setPage((value) => value + 1)}
                    className="rounded border px-3 py-1 disabled:opacity-40"
                  >
                    Trang sau
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
        {detailLoading && (
          <div className="rounded-xl border border-slate-200 bg-white p-5 text-sm text-slate-500">
            Đang tải chi tiết đơn...
          </div>
        )}
        {selected && !detailLoading && (
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-xl font-bold">{selected.orderCode}</h2>
                <p className="text-slate-500">
                  {selected.distributorName} ·{" "}
                  {money.format(selected.totalAmount)}
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  Ngày tạo:{" "}
                  {new Date(selected.createdAt).toLocaleDateString("vi-VN")} ·
                  Giao dự kiến:{" "}
                  {selected.expectedDeliveryDate
                    ? new Date(
                        selected.expectedDeliveryDate,
                      ).toLocaleDateString("vi-VN")
                    : "Chưa xác định"}
                </p>
                <div className="mt-3 rounded-lg bg-slate-50 p-3 text-sm text-slate-600">
                  <p>
                    <strong>Địa chỉ giao:</strong> {selected.deliveryAddress}
                  </p>
                  <p>
                    <strong>Liên hệ:</strong>{" "}
                    {selected.contactPhone || "Chưa có"}
                  </p>
                  <p>
                    <strong>Ghi chú:</strong> {selected.orderNote || "Không có"}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelected(null)}
                className="text-slate-400"
              >
                ✕
              </button>
            </div>
            <div className="mt-4 space-y-2">
              {selected.lines.map((l) => (
                <div
                  key={l.orderDetailId}
                  className="flex justify-between rounded-lg bg-slate-50 p-3"
                >
                  <span>
                    {l.productName}
                    {l.batchCode ? ` · ${l.batchCode}` : ""}
                  </span>
                  <div className="flex flex-wrap items-center gap-2 text-sm">
                    <label>
                      Kg duyệt{" "}
                      <input
                        type="number"
                        min="0"
                        max={l.requestedWeightKg}
                        value={
                          editedLines[l.orderDetailId]?.weight ??
                          l.requestedWeightKg
                        }
                        onChange={(event) =>
                          setEditedLines((current) => ({
                            ...current,
                            [l.orderDetailId]: {
                              weight: Number(event.target.value),
                              price:
                                current[l.orderDetailId]?.price ?? l.unitPrice,
                            },
                          }))
                        }
                        className="w-24 rounded border px-2 py-1"
                      />
                    </label>
                    <label>
                      Đơn giá{" "}
                      <input
                        type="number"
                        min="0"
                        value={
                          editedLines[l.orderDetailId]?.price ?? l.unitPrice
                        }
                        onChange={(event) =>
                          setEditedLines((current) => ({
                            ...current,
                            [l.orderDetailId]: {
                              weight:
                                current[l.orderDetailId]?.weight ??
                                l.requestedWeightKg,
                              price: Number(event.target.value),
                            },
                          }))
                        }
                        className="w-28 rounded border px-2 py-1"
                      />
                    </label>
                  </div>
                  <span
                    className={
                      l.stockAvailable ? "text-emerald-700" : "text-rose-700"
                    }
                  >
                    Yêu cầu {l.requestedWeightKg} kg · Khả dụng{" "}
                    {l.availableWeightKg} kg ·{" "}
                    {l.stockAvailable
                      ? "Đủ điều kiện"
                      : `Thiếu ${Math.max(l.requestedWeightKg - l.availableWeightKg, 0)} kg`}
                  </span>
                </div>
              ))}
            </div>
            <div className="mt-5 flex justify-end">
              <button
                disabled={
                  busy ||
                  selected.status !== "PENDING" ||
                  !selected.stockAvailable
                }
                onClick={() => void approve()}
                className="rounded-lg bg-emerald-700 px-5 py-2.5 font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
              >
                {busy
                  ? "Đang duyệt..."
                  : selected.status === "PENDING"
                    ? "Duyệt đơn"
                    : "Đã xử lý"}
              </button>
              <button
                disabled={busy || selected.status !== "PENDING"}
                onClick={() => void reject()}
                className="ml-2 rounded-lg border border-rose-200 px-5 py-2.5 font-semibold text-rose-700 disabled:opacity-50"
              >
                Từ chối đơn
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
