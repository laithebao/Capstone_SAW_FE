import { useEffect, useState } from "react";
import AppIcon from "@/components/common/AppIcon";
import {
  approveWarehouseDistributorOrder,
  getWarehouseDistributorOrder,
  getWarehouseDistributorOrders,
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
  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const data = await getWarehouseDistributorOrders();
      setOrders(data.items);
    } catch {
      setError("Không thể tải danh sách đơn hàng.");
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    void load();
  }, []);
  const open = async (id: number) => {
    try {
      setSelected(await getWarehouseDistributorOrder(id));
    } catch {
      setError("Không thể tải chi tiết đơn hàng.");
    }
  };
  const approve = async () => {
    if (!selected || !window.confirm(`Duyệt đơn ${selected.orderCode}?`))
      return;
    setBusy(true);
    setError("");
    try {
      setSelected(await approveWarehouseDistributorOrder(selected.id));
      await load();
    } catch (e: any) {
      setError(e?.response?.data?.message ?? "Không thể phê duyệt đơn hàng.");
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
            <AppIcon name="refresh" />
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
            </div>
          )}
        </div>
        {selected && (
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-xl font-bold">{selected.orderCode}</h2>
                <p className="text-slate-500">
                  {selected.distributorName} ·{" "}
                  {money.format(selected.totalAmount)}
                </p>
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
                  <span
                    className={
                      l.stockAvailable ? "text-emerald-700" : "text-rose-700"
                    }
                  >
                    {l.requestedWeightKg} kg / có {l.availableWeightKg} kg
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
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
