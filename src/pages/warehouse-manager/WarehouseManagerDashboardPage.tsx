import { useCallback, useEffect, useMemo, useState } from "react";
import AppIcon from "@/components/common/AppIcon";
import {
  getProductQualityDistribution,
  getWarehouseCapacity,
  getWarehouseInventoryLevels,
} from "@/services/inventoryService";
import { getAuthErrorMessage } from "@/services/authService";
import type {
  InventoryLocationLevel,
  ProductQualityDistributionChart,
  WarehouseCapacityChart,
  WarehouseInventoryLevelChart,
} from "@/types/inventory";

const kg = new Intl.NumberFormat("vi-VN", { maximumFractionDigits: 1 });
const time = new Intl.DateTimeFormat("vi-VN", {
  dateStyle: "short",
  timeStyle: "medium",
});
const qualityColors = [
  "#059669",
  "#0ea5e9",
  "#f59e0b",
  "#f43f5e",
  "#8b5cf6",
  "#94a3b8",
];

function locationName(item: InventoryLocationLevel) {
  return [item.locationCode, item.zoneName, item.rackName, item.binName]
    .filter(Boolean)
    .join(" · ");
}
function inventoryLevel(item: InventoryLocationLevel) {
  if (item.lowStockItemCount > 0)
    return {
      label: "Cần bổ sung",
      bar: "bg-rose-500",
      text: "text-rose-700",
      badge: "bg-rose-50",
    };
  if ((item.utilizationPercent ?? 0) >= 90)
    return {
      label: "Gần đầy",
      bar: "bg-amber-500",
      text: "text-amber-700",
      badge: "bg-amber-50",
    };
  return {
    label: "Bình thường",
    bar: "bg-emerald-600",
    text: "text-emerald-700",
    badge: "bg-emerald-50",
  };
}
function capacityLevel(status: string) {
  if (status === "OVERCROWDED")
    return {
      label: "Quá tải",
      bar: "bg-rose-500",
      text: "text-rose-700",
      badge: "bg-rose-50",
    };
  if (status === "NEAR_CAPACITY")
    return {
      label: "Gần đầy",
      bar: "bg-amber-500",
      text: "text-amber-700",
      badge: "bg-amber-50",
    };
  return {
    label: "Còn chỗ",
    bar: "bg-emerald-600",
    text: "text-emerald-700",
    badge: "bg-emerald-50",
  };
}
function StatCard({
  label,
  value,
  note,
  icon,
  tone,
}: {
  label: string;
  value: string | number;
  note: string;
  icon:
    | "database"
    | "pending"
    | "dashboard"
    | "alert"
    | "package"
    | "clipboard";
  tone: string;
}) {
  return (
    <article className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <span className={`grid size-10 place-items-center rounded-lg ${tone}`}>
        <AppIcon name={icon} className="size-5" />
      </span>
      <p className="mt-4 text-[11px] font-bold uppercase text-slate-500">
        {label}
      </p>
      <p className="mt-1 text-2xl font-bold text-slate-950">{value}</p>
      <p className="mt-1 text-xs text-slate-500">{note}</p>
    </article>
  );
}

type WarehouseView = "dashboard" | "inventory" | "capacity" | "quality";

export default function WarehouseManagerDashboardPage({
  view = "dashboard",
}: {
  view?: WarehouseView;
}) {
  const [inventory, setInventory] =
    useState<WarehouseInventoryLevelChart | null>(null);
  const [capacity, setCapacity] = useState<WarehouseCapacityChart | null>(null);
  const [quality, setQuality] =
    useState<ProductQualityDistributionChart | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState("ALL");
  const load = useCallback(async (signal?: AbortSignal) => {
    setError("");
    try {
      const [inventoryData, capacityData, qualityData] = await Promise.all([
        getWarehouseInventoryLevels(signal),
        getWarehouseCapacity(signal),
        getProductQualityDistribution(signal),
      ]);
      setInventory(inventoryData);
      setCapacity(capacityData);
      setQuality(qualityData);
    } catch (cause) {
      if (!signal?.aborted)
        setError(
          getAuthErrorMessage(
            cause,
            "Không thể tải dữ liệu phân tích kho. Vui lòng thử lại.",
          ),
        );
    } finally {
      if (!signal?.aborted) setLoading(false);
    }
  }, []);
  useEffect(() => {
    const controller = new AbortController();
    const initialLoad = window.setTimeout(
      () => void load(controller.signal),
      0,
    );
    const timer = window.setInterval(
      () => void load(controller.signal),
      30_000,
    );
    return () => {
      controller.abort();
      window.clearTimeout(initialLoad);
      window.clearInterval(timer);
    };
  }, [load]);
  const zones = useMemo(
    () =>
      [
        ...new Set(inventory?.locations.map((item) => item.zoneName) ?? []),
      ].sort(),
    [inventory],
  );
  const locations = useMemo(
    () =>
      inventory?.locations.filter(
        (item) => filter === "ALL" || item.zoneName === filter,
      ) ?? [],
    [inventory, filter],
  );
  const donut = useMemo(() => {
    if (!quality?.grades.length) return "#e2e8f0 0 100%";
    let cursor = 0;
    return quality.grades
      .map((grade, index) => {
        const start = cursor;
        cursor += grade.percentage;
        return `${qualityColors[index % qualityColors.length]} ${start}% ${cursor}%`;
      })
      .join(", ");
  }, [quality]);

  return (
    <div className="mx-auto max-w-[1600px] space-y-5">
      <header className="flex flex-col justify-between gap-4 xl:flex-row xl:items-end">
        <div>
          <p className="text-sm font-medium text-emerald-700">Quản lý kho</p>
          <h1 className="mt-1 text-2xl font-bold sm:text-3xl">
            Phân tích kho hàng
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Theo dõi tồn kho, sức chứa và chất lượng sản phẩm theo dữ liệu thời
            gian thực.
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            setLoading(true);
            void load();
          }}
          disabled={loading}
          className="inline-flex h-10 w-fit items-center gap-2 rounded-lg bg-emerald-700 px-4 text-sm font-semibold text-white hover:bg-emerald-800 disabled:opacity-60"
        >
          <AppIcon
            name="pending"
            className={`size-4 ${loading ? "animate-spin" : ""}`}
          />
          Làm mới dữ liệu
        </button>
      </header>
      <nav aria-label="Điều hướng biểu đồ kho" className="flex flex-wrap gap-2">
        <a
          href="/warehouse-manager/inventory"
          className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm font-semibold text-emerald-700"
        >
          Mức tồn kho
        </a>
        <a
          href="/warehouse-manager/capacity"
          className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-600 hover:text-emerald-700"
        >
          Sức chứa kho
        </a>
        <a
          href="/warehouse-manager/quality"
          className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-600 hover:text-emerald-700"
        >
          Phân bố chất lượng
        </a>
      </nav>
      {error && (
        <div
          role="alert"
          className="flex items-center justify-between rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700"
        >
          <span>{error}</span>
          <button
            onClick={() => void load()}
            className="font-semibold underline"
          >
            Thử lại
          </button>
        </div>
      )}
      {loading && !inventory && (
        <div className="rounded-xl border border-slate-200 bg-white p-12 text-center text-sm text-slate-500">
          Đang tải dữ liệu phân tích kho…
        </div>
      )}

      {view === "dashboard" && inventory && capacity && quality && (
        <section className="space-y-5">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-emerald-700">
              TỔNG QUAN
            </p>
            <h2 className="mt-1 text-xl font-bold">Điều hành kho hàng</h2>
            <p className="mt-1 text-sm text-slate-500">
              Chọn một phân hệ để xem chi tiết theo nghiệp vụ.
            </p>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            <a
              href="/warehouse-manager/inventory"
              className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-emerald-300"
            >
              <p className="text-xs font-bold uppercase text-emerald-700"></p>
              <h3 className="mt-2 font-bold">Mức tồn kho</h3>
              <p className="mt-1 text-sm text-slate-500">
                {kg.format(inventory.totalOnHandKg)} kg tại{" "}
                {inventory.activeLocationCount} vị trí.
              </p>
              <span className="mt-4 inline-block text-xs font-semibold text-emerald-700">
                Mở biểu đồ →
              </span>
            </a>
            <a
              href="/warehouse-manager/capacity"
              className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-emerald-300"
            >
              <p className="text-xs font-bold uppercase text-emerald-700"></p>
              <h3 className="mt-2 font-bold">Sức chứa kho</h3>
              <p className="mt-1 text-sm text-slate-500">
                {kg.format(capacity.utilizationPercent)}% công suất,{" "}
                {capacity.nearCapacityCount + capacity.overcrowdedCount} cảnh
                báo.
              </p>
              <span className="mt-4 inline-block text-xs font-semibold text-emerald-700">
                Mở biểu đồ →
              </span>
            </a>
            <a
              href="/warehouse-manager/quality"
              className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-emerald-300"
            >
              <p className="text-xs font-bold uppercase text-emerald-700"></p>
              <h3 className="mt-2 font-bold">Phân bố chất lượng</h3>
              <p className="mt-1 text-sm text-slate-500">
                {quality.totalBatchCount} lô đang tồn, hạng chủ đạo{" "}
                {quality.leadingGrade ? ` ${quality.leadingGrade}` : "—"}.
              </p>
              <span className="mt-4 inline-block text-xs font-semibold text-emerald-700">
                Mở biểu đồ →
              </span>
            </a>
          </div>
        </section>
      )}

      {view === "inventory" && inventory && (
        <section id="inventory-levels" className="scroll-mt-24 space-y-5">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-emerald-700"></p>
            <h2 className="mt-1 text-xl font-bold">Biểu đồ mức tồn kho</h2>
            <p className="mt-1 text-sm text-slate-500">
              Nhận biết lượng tồn theo vị trí và nhu cầu bổ sung.
            </p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard
              label="Tổng tồn kho"
              value={`${kg.format(inventory.totalOnHandKg)} kg`}
              note={`${kg.format(inventory.totalAvailableKg)} kg khả dụng`}
              icon="database"
              tone="bg-emerald-50 text-emerald-700"
            />
            <StatCard
              label="Đã giữ chỗ"
              value={`${kg.format(inventory.totalReservedKg)} kg`}
              note="Chờ xuất kho"
              icon="pending"
              tone="bg-sky-50 text-sky-700"
            />
            <StatCard
              label="Vị trí hoạt động"
              value={inventory.activeLocationCount}
              note={`${inventory.locations.length} tổng vị trí`}
              icon="dashboard"
              tone="bg-violet-50 text-violet-700"
            />
            <StatCard
              label="Cần bổ sung"
              value={inventory.lowStockItemCount}
              note="Mặt hàng dưới tồn an toàn"
              icon="alert"
              tone="bg-rose-50 text-rose-700"
            />
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex flex-col justify-between gap-4 border-b border-slate-100 pb-5 sm:flex-row sm:items-end">
              <div>
                <h3 className="font-bold">Tồn kho theo vị trí</h3>
                <p className="mt-1 text-xs text-slate-500">
                  Cập nhật {time.format(new Date(inventory.generatedAt))} · tự
                  động làm mới mỗi 30 giây
                </p>
              </div>
              <label className="text-xs font-semibold text-slate-600">
                Khu vực
                <select
                  id="warehouse-zone-filter"
                  name="warehouseZone"
                  value={filter}
                  onChange={(event) => setFilter(event.target.value)}
                  className="mt-1 block min-w-52 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-normal text-slate-900"
                >
                  <option value="ALL">Tất cả khu vực</option>
                  {zones.map((zone) => (
                    <option key={zone}>{zone}</option>
                  ))}
                </select>
              </label>
            </div>
            <div className="mt-5 flex flex-wrap gap-4 text-xs text-slate-500">
              <span className="flex items-center gap-2">
                <i className="size-2.5 rounded-full bg-emerald-600" />
                Bình thường
              </span>
              <span className="flex items-center gap-2">
                <i className="size-2.5 rounded-full bg-amber-500" />
                Gần đầy (≥90%)
              </span>
              <span className="flex items-center gap-2">
                <i className="size-2.5 rounded-full bg-rose-500" />
                Cần bổ sung
              </span>
            </div>
            <div className="mt-6 space-y-6">
              {locations.length ? (
                locations.map((item) => {
                  const state = inventoryLevel(item);
                  return (
                    <article key={item.locationId}>
                      <div className="mb-2 flex flex-col justify-between gap-2 sm:flex-row sm:items-end">
                        <div>
                          <h4 className="text-sm font-semibold">
                            {locationName(item)}
                          </h4>
                          <p className="text-xs text-slate-500">
                            {item.batchCount} lô ·{" "}
                            {kg.format(item.availableQuantityKg)} kg khả dụng ·{" "}
                            {kg.format(item.reservedQuantityKg)} kg giữ chỗ
                          </p>
                        </div>
                        <div className="flex items-center gap-3">
                          <span
                            className={`rounded-full px-2.5 py-1 text-[10px] font-bold ${state.badge} ${state.text}`}
                          >
                            {state.label}
                          </span>
                          <strong className="text-sm">
                            {kg.format(item.quantityOnHandKg)}
                            {item.maxWeightKg
                              ? ` / ${kg.format(item.maxWeightKg)}`
                              : ""}{" "}
                            kg
                          </strong>
                        </div>
                      </div>
                      <div
                        role="progressbar"
                        aria-label={`Mức tồn ${locationName(item)}`}
                        aria-valuemin={0}
                        aria-valuemax={
                          item.maxWeightKg ?? item.quantityOnHandKg
                        }
                        aria-valuenow={item.quantityOnHandKg}
                        className="h-4 overflow-hidden rounded-full bg-slate-100"
                      >
                        <div
                          className={`h-full rounded-full ${state.bar}`}
                          style={{
                            width: item.maxWeightKg
                              ? `${Math.min(item.utilizationPercent ?? 0, 100)}%`
                              : item.quantityOnHandKg > 0
                                ? "100%"
                                : "0%",
                          }}
                        />
                      </div>
                      <div className="mt-1 flex justify-between text-[11px] text-slate-400">
                        <span>
                          {item.utilizationPercent == null
                            ? "Chưa thiết lập sức chứa"
                            : `${kg.format(item.utilizationPercent)}% sức chứa`}
                        </span>
                        <span>
                          {item.lastUpdatedAt
                            ? `Dữ liệu tồn: ${time.format(new Date(item.lastUpdatedAt))}`
                            : "Chưa có giao dịch tồn kho"}
                        </span>
                      </div>
                    </article>
                  );
                })
              ) : (
                <p className="py-12 text-center text-sm text-slate-500">
                  Không có vị trí kho trong khu vực đã chọn.
                </p>
              )}
            </div>
          </div>
        </section>
      )}

      {view === "capacity" && capacity && (
        <section
          id="warehouse-capacity"
          className="scroll-mt-24 space-y-5 pt-3"
        >
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-emerald-700"></p>
            <h2 className="mt-1 text-xl font-bold">Biểu đồ sức chứa kho</h2>
            <p className="mt-1 text-sm text-slate-500">
              Theo dõi mật độ lưu trữ, tối ưu vị trí và ngăn ngừa quá tải.
            </p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard
              label="Mức sử dụng chung"
              value={`${kg.format(capacity.utilizationPercent)}%`}
              note="Theo sức chứa đã cấu hình"
              icon="dashboard"
              tone="bg-emerald-50 text-emerald-700"
            />
            <StatCard
              label="Đang sử dụng"
              value={`${kg.format(capacity.usedWeightKg)} kg`}
              note={`${kg.format(capacity.configuredCapacityKg)} kg sức chứa`}
              icon="database"
              tone="bg-sky-50 text-sky-700"
            />
            <StatCard
              label="Còn khả dụng"
              value={`${kg.format(capacity.availableWeightKg)} kg`}
              note="Không tính phần quá tải"
              icon="package"
              tone="bg-violet-50 text-violet-700"
            />
            <StatCard
              label="Cảnh báo sức chứa"
              value={capacity.nearCapacityCount + capacity.overcrowdedCount}
              note={`${capacity.overcrowdedCount} vị trí quá tải`}
              icon="alert"
              tone="bg-rose-50 text-rose-700"
            />
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex justify-between gap-3 border-b border-slate-100 pb-5">
              <div>
                <h3 className="font-bold">Mức sử dụng theo vị trí</h3>
                <p className="mt-1 text-xs text-slate-500">
                  Ngưỡng cảnh báo gần đầy từ 90%
                </p>
              </div>
              <p className="text-xs text-slate-400">
                Cập nhật {time.format(new Date(capacity.generatedAt))}
              </p>
            </div>
            <div className="mt-5 grid gap-4 xl:grid-cols-2">
              {capacity.locations.map((item) => {
                const state = capacityLevel(item.status);
                return (
                  <article
                    key={item.locationId}
                    className="rounded-xl border border-slate-200 p-4"
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <h4 className="text-sm font-semibold">
                          {item.locationCode}
                        </h4>
                        <p className="text-xs text-slate-500">
                          {item.zoneName}
                        </p>
                      </div>
                      <span
                        className={`rounded-full px-2.5 py-1 text-[10px] font-bold ${state.badge} ${state.text}`}
                      >
                        {state.label}
                      </span>
                    </div>
                    <div className="mt-4 flex items-end justify-between">
                      <strong className="text-lg">
                        {item.utilizationPercent == null
                          ? "—"
                          : `${kg.format(item.utilizationPercent)}%`}
                      </strong>
                      <span className="text-xs text-slate-500">
                        {kg.format(item.usedWeightKg)} /{" "}
                        {item.maxWeightKg == null
                          ? "—"
                          : kg.format(item.maxWeightKg)}{" "}
                        kg
                      </span>
                    </div>
                    <div className="relative mt-2 h-4 overflow-hidden rounded-full bg-slate-100">
                      <div
                        className={`h-full rounded-full ${state.bar}`}
                        style={{
                          width: `${Math.min(item.utilizationPercent ?? 0, 100)}%`,
                        }}
                      />
                      <i className="absolute inset-y-0 left-[90%] w-px bg-slate-700/50" />
                    </div>
                    <p className="mt-2 text-[11px] text-slate-400">
                      {item.availableWeightKg == null
                        ? "Chưa thiết lập sức chứa tối đa"
                        : `Còn ${kg.format(item.availableWeightKg)} kg khả dụng`}
                    </p>
                  </article>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {view === "quality" && quality && (
        <section
          id="quality-distribution"
          className="scroll-mt-24 space-y-5 pt-3"
        >
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-emerald-700"></p>
            <h2 className="mt-1 text-xl font-bold">
              Biểu đồ phân bố chất lượng sản phẩm
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Phân tích cấp chất lượng của các lô đang tồn kho để duy trì tiêu
              chuẩn.
            </p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard
              label="Lô đang tồn"
              value={quality.totalBatchCount}
              note={`${kg.format(quality.totalQuantityOnHandKg)} kg`}
              icon="package"
              tone="bg-emerald-50 text-emerald-700"
            />
            <StatCard
              label="Đã phân hạng"
              value={quality.gradedBatchCount}
              note="Có kết quả chất lượng"
              icon="clipboard"
              tone="bg-sky-50 text-sky-700"
            />
            <StatCard
              label="Chưa phân hạng"
              value={quality.ungradedBatchCount}
              note="Cần theo dõi kết quả"
              icon="pending"
              tone="bg-amber-50 text-amber-700"
            />
            <StatCard
              label="Hạng chủ đạo"
              value={
                quality.leadingGrade ? `Hạng ${quality.leadingGrade}` : "—"
              }
              note="Theo khối lượng tồn"
              icon="dashboard"
              tone="bg-violet-50 text-violet-700"
            />
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex justify-between gap-3 border-b border-slate-100 pb-5">
              <div>
                <h3 className="font-bold">Tỷ trọng chất lượng trong tồn kho</h3>
                <p className="mt-1 text-xs text-slate-500">
                  Tỷ lệ tính theo khối lượng đang lưu trữ
                </p>
              </div>
              <p className="text-xs text-slate-400">
                Cập nhật {time.format(new Date(quality.generatedAt))}
              </p>
            </div>
            {quality.grades.length ? (
              <div className="mt-6 grid items-center gap-8 lg:grid-cols-[minmax(240px,0.7fr)_minmax(0,1.3fr)]">
                <div
                  className="relative mx-auto aspect-square w-full max-w-64 rounded-full"
                  style={{ background: `conic-gradient(${donut})` }}
                >
                  <div className="absolute inset-[24%] grid place-items-center rounded-full bg-white text-center">
                    <span>
                      <b className="block text-2xl">
                        {quality.totalBatchCount}
                      </b>
                      <small className="text-slate-500">lô hàng</small>
                    </span>
                  </div>
                </div>
                <div className="divide-y divide-slate-100">
                  {quality.grades.map((item, index) => (
                    <article
                      key={item.grade}
                      className="grid grid-cols-[12px_1fr_auto] items-center gap-3 py-4"
                    >
                      <i
                        className="h-9 w-2.5 rounded-full"
                        style={{
                          background:
                            qualityColors[index % qualityColors.length],
                        }}
                      />
                      <div>
                        <h4 className="text-sm font-semibold">
                          {item.grade === "UNGRADED"
                            ? "Chưa phân hạng"
                            : `Hạng ${item.grade}`}
                        </h4>
                        <p className="text-xs text-slate-500">
                          {item.batchCount} lô ·{" "}
                          {kg.format(item.quantityOnHandKg)} kg
                        </p>
                      </div>
                      <strong>{kg.format(item.percentage)}%</strong>
                    </article>
                  ))}
                </div>
              </div>
            ) : (
              <p className="py-12 text-center text-sm text-slate-500">
                Chưa có tồn kho để phân tích chất lượng.
              </p>
            )}
          </div>
        </section>
      )}
    </div>
  );
}
