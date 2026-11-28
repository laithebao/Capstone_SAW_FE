import { useCallback, useEffect, useRef, useState } from "react";
import WarehouseManagement from "@/features/warehouse/WarehouseManagement";
import {
  getProductQualityDistribution,
  getWarehouseCapacity,
  getWarehouseInventoryLevels,
} from "@/services/inventoryService";
import { getAuthErrorMessage } from "@/services/authService";
import type {
  ProductQualityDistributionChart,
  WarehouseCapacityChart,
  WarehouseInventoryLevelChart,
} from "@/types/inventory";
import WarehouseOverview from "./WarehouseOverview";
import WarehouseQualityOverview from "./WarehouseQualityOverview";
import WarehouseInventoryOverview from "./WarehouseInventoryOverview";

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
  const refreshingQuality = useRef(false);
  const load = useCallback(async (signal?: AbortSignal) => {
    setError("");
    try {
      const results = await Promise.allSettled([
        getWarehouseInventoryLevels(signal),
        getWarehouseCapacity(signal),
        getProductQualityDistribution(signal),
      ]);
      if (results[0].status === "fulfilled") setInventory(results[0].value);
      if (results[1].status === "fulfilled") setCapacity(results[1].value);
      if (results[2].status === "fulfilled") setQuality(results[2].value);
      if (
        results.some((result) => result.status === "rejected") &&
        !signal?.aborted
      )
        setError("Một số dữ liệu phân tích chưa tải được. Bạn có thể thử lại.");
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
  const refreshQuality = useCallback(async () => {
    if (refreshingQuality.current) return;
    refreshingQuality.current = true;
    setLoading(true);
    setError("");
    try { setQuality(await getProductQualityDistribution()); }
    catch (cause) { setError(getAuthErrorMessage(cause, "Không thể tải dữ liệu chất lượng. Vui lòng thử lại.")); }
    finally { refreshingQuality.current = false; setLoading(false); }
  }, []);

  if (view === "dashboard") {
    return <WarehouseOverview inventory={inventory} capacity={capacity} quality={quality} loading={loading} error={error} onRefresh={() => { setLoading(true); void load(); }} />;
  }

  if (view === "quality") return <WarehouseQualityOverview quality={quality} loading={loading} error={error} onRefresh={() => { if (!loading) void refreshQuality(); }} />;

  return <div className="mx-auto max-w-[1600px] space-y-5">
    {view === "inventory" && <WarehouseInventoryOverview inventory={inventory} loading={loading} error={error} onRefresh={() => { if (loading) return; setLoading(true); void load(); }} />}
    {view === "capacity" && <WarehouseManagement variant="manager" capacity={capacity} capacityLoading={loading} capacityError={error} onChange={() => void load()} />}
  </div>;
}
