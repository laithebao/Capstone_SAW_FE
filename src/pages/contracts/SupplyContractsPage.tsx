import { useCallback, useEffect, useState } from "react";
import type { FormEvent } from "react";
import AppIcon from "@/components/common/AppIcon";
import { getAuthErrorMessage } from "@/services/authService";
import {
  approveSupplyContractByAdmin,
  cancelSupplyContractByWarehouse,
  confirmSupplyContractBySupplier,
  createSupplyContract,
  getSupplyContract,
  getSupplyContractOptions,
  getSupplyContracts,
  rejectSupplyContractByAdmin,
  rejectSupplyContractBySupplier,
  requestSupplyContractCancellation,
  updateSupplyContract,
} from "@/services/supplyContractService";
import type {
  CreateSupplyContractRequest,
  DeliveryPeriod,
  SupplyContractDetail,
  SupplyContractOptions,
  SupplyContractStatus,
  SupplyContractSummary,
  UpdateSupplyContractRequest,
} from "@/types/supplyContract";

type ContractMode = "warehouse" | "supplier" | "admin";

interface SupplyContractsPageProps {
  mode: ContractMode;
}

interface ContractFormState {
  supplierId: string;
  cropTypeId: string;
  qualityGrade: string;
  deliveryQuantityKg: string;
  deliveryPeriod: DeliveryPeriod;
  unitPriceVndPerKg: string;
  startDate: string;
  endDate: string;
  terms: string;
}

const statusItems: ReadonlyArray<{
  value: SupplyContractStatus;
  label: string;
}> = [
  { value: "PENDING_SUPPLIER", label: "Chờ nhà cung cấp xác nhận" },
  { value: "SUPPLIER_REJECTED", label: "Nhà cung cấp từ chối" },
  { value: "PENDING_ADMIN", label: "Chờ Admin duyệt" },
  { value: "ADMIN_REJECTED", label: "Admin từ chối" },
  { value: "APPROVED", label: "Đã duyệt" },
  { value: "CANCELLATION_REQUESTED", label: "Nhà cung cấp yêu cầu hủy" },
  { value: "CANCELLED", label: "Đã hủy" },
];

const statusStyle: Record<SupplyContractStatus, string> = {
  PENDING_SUPPLIER: "bg-amber-50 text-amber-700",
  SUPPLIER_REJECTED: "bg-rose-50 text-rose-700",
  PENDING_ADMIN: "bg-sky-50 text-sky-700",
  ADMIN_REJECTED: "bg-rose-50 text-rose-700",
  APPROVED: "bg-emerald-50 text-emerald-700",
  CANCELLATION_REQUESTED: "bg-orange-50 text-orange-700",
  CANCELLED: "bg-slate-200 text-slate-700",
};

const pageCopy: Record<
  ContractMode,
  { eyebrow: string; title: string; description: string }
> = {
  warehouse: {
    eyebrow: "Điều hành thu mua",
    title: "Hợp đồng nhà cung cấp",
    description:
      "Tạo, cập nhật hoặc hủy hợp đồng và gửi nội dung mới đến nhà cung cấp xác nhận.",
  },
  supplier: {
    eyebrow: "Cổng nhà cung cấp",
    title: "Hợp đồng thu mua",
    description:
      "Kiểm tra nội dung, đơn giá và xác nhận trước khi hợp đồng được chuyển đến Admin.",
  },
  admin: {
    eyebrow: "Quản trị hệ thống",
    title: "Duyệt hợp đồng thu mua",
    description:
      "Kiểm tra hợp đồng đã được nhà cung cấp xác nhận và thực hiện bước duyệt cuối cùng.",
  },
};

const money = new Intl.NumberFormat("vi-VN", {
  style: "currency",
  currency: "VND",
  maximumFractionDigits: 0,
});

const weight = new Intl.NumberFormat("vi-VN", { maximumFractionDigits: 2 });

const dateFormatter = new Intl.DateTimeFormat("vi-VN", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
});

const dateTimeFormatter = new Intl.DateTimeFormat("vi-VN", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

function localIsoDate(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function initialForm(): ContractFormState {
  const today = new Date();
  const end = new Date(today);
  end.setMonth(end.getMonth() + 3);
  return {
    supplierId: "",
    cropTypeId: "",
    qualityGrade: "A",
    deliveryQuantityKg: "",
    deliveryPeriod: "WEEK",
    unitPriceVndPerKg: "",
    startDate: localIsoDate(today),
    endDate: localIsoDate(end),
    terms: "",
  };
}

function formatDate(value: string) {
  return dateFormatter.format(new Date(`${value}T00:00:00`));
}

function formatDateTime(value: string) {
  return dateTimeFormatter.format(new Date(value));
}

function statusLabel(status: SupplyContractStatus) {
  return statusItems.find((item) => item.value === status)?.label ?? status;
}

function deliveryPeriodLabel(period: DeliveryPeriod) {
  return period === "MONTH" ? "tháng" : "tuần";
}

function ContractStatusBadge({ status }: { status: SupplyContractStatus }) {
  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-1 text-xs font-bold ${statusStyle[status]}`}
    >
      {statusLabel(status)}
    </span>
  );
}

export default function SupplyContractsPage({ mode }: SupplyContractsPageProps) {
  const [items, setItems] = useState<SupplyContractSummary[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [query, setQuery] = useState("");
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<SupplyContractStatus | "">("");
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [selected, setSelected] = useState<SupplyContractDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [actionBusy, setActionBusy] = useState(false);
  const [showFinalConfirmation, setShowFinalConfirmation] = useState(false);
  const [showCancelConfirmation, setShowCancelConfirmation] = useState(false);
  const [rejectionReason, setRejectionReason] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [options, setOptions] = useState<SupplyContractOptions | null>(null);
  const [optionsLoading, setOptionsLoading] = useState(false);
  const [createBusy, setCreateBusy] = useState(false);
  const [form, setForm] = useState<ContractFormState>(initialForm);

  const copy = pageCopy[mode];

  const load = useCallback(
    async (signal?: AbortSignal) => {
      setLoading(true);
      setError("");
      try {
        const result = await getSupplyContracts(search, status, page, signal);
        setItems(result.items);
        setTotalCount(result.totalCount);
      } catch (loadError: unknown) {
        if ((loadError as { name?: string }).name !== "CanceledError") {
          setError(
            getAuthErrorMessage(loadError, "Không thể tải danh sách hợp đồng."),
          );
        }
      } finally {
        if (!signal?.aborted) setLoading(false);
      }
    },
    [page, search, status],
  );

  useEffect(() => {
    const controller = new AbortController();
    // The request lifecycle intentionally follows the active filters and page.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load(controller.signal);
    return () => controller.abort();
  }, [load]);

  const submitSearch = (event: FormEvent) => {
    event.preventDefault();
    setPage(1);
    setSearch(query.trim());
  };

  const openDetail = async (id: number) => {
    setDetailLoading(true);
    setError("");
    setRejectionReason("");
    try {
      const detail = await getSupplyContract(id);
      setSelected(detail);
      if (mode === "warehouse" && detail.status === "CANCELLATION_REQUESTED")
        setRejectionReason(detail.cancellationRequestReason ?? "");
    } catch (loadError: unknown) {
      setError(getAuthErrorMessage(loadError, "Không thể tải chi tiết hợp đồng."));
    } finally {
      setDetailLoading(false);
    }
  };

  const closeDetail = () => {
    if (actionBusy) return;
    setShowFinalConfirmation(false);
    setShowCancelConfirmation(false);
    setSelected(null);
    setRejectionReason("");
  };

  const openCreate = async () => {
    setEditingId(null);
    setForm(initialForm());
    setShowCreate(true);
    setError("");
    setMessage("");
    if (options) return;
    setOptionsLoading(true);
    try {
      setOptions(await getSupplyContractOptions());
    } catch (loadError: unknown) {
      setError(
        getAuthErrorMessage(
          loadError,
          "Không thể tải nhà cung cấp và loại nông sản.",
        ),
      );
    } finally {
      setOptionsLoading(false);
    }
  };

  const openEdit = () => {
    if (!selected) return;
    setEditingId(selected.id);
    setForm({
      supplierId: String(selected.supplierId),
      cropTypeId: String(selected.cropTypeId),
      qualityGrade: selected.qualityGrade,
      deliveryQuantityKg: String(selected.deliveryQuantityKg),
      deliveryPeriod: selected.deliveryPeriod,
      unitPriceVndPerKg: String(selected.unitPriceVndPerKg),
      startDate: selected.startDate,
      endDate: selected.endDate,
      terms: selected.terms ?? "",
    });
    setError("");
    setMessage("");
    setShowCreate(true);
  };

  const closeContractForm = () => {
    if (createBusy) return;
    setShowCreate(false);
    setEditingId(null);
  };

  const submitCreate = async (event: FormEvent) => {
    event.preventDefault();
    const supplierId = Number(form.supplierId);
    const cropTypeId = Number(form.cropTypeId);
    const deliveryQuantityKg = Number(form.deliveryQuantityKg);
    const unitPriceVndPerKg = Number(form.unitPriceVndPerKg);

    if (!supplierId || !cropTypeId) {
      setError("Vui lòng chọn nhà cung cấp và loại rau củ.");
      return;
    }
    if (!Number.isFinite(deliveryQuantityKg) || deliveryQuantityKg <= 0) {
      setError("Sản lượng giao theo chu kỳ phải lớn hơn 0 kg.");
      return;
    }
    if (!Number.isFinite(unitPriceVndPerKg) || unitPriceVndPerKg <= 0) {
      setError("Đơn giá thu mua phải lớn hơn 0.");
      return;
    }
    if (!form.startDate || !form.endDate || form.endDate < form.startDate) {
      setError("Ngày hết hạn phải bằng hoặc sau ngày bắt đầu.");
      return;
    }

    const request: CreateSupplyContractRequest = {
      supplierId,
      cropTypeId,
      qualityGrade: form.qualityGrade,
      deliveryQuantityKg,
      deliveryPeriod: form.deliveryPeriod,
      unitPriceVndPerKg,
      startDate: form.startDate,
      endDate: form.endDate,
      terms: form.terms.trim() || null,
    };

    setCreateBusy(true);
    setError("");
    setMessage("");
    try {
      const saved = editingId
        ? await updateSupplyContract(editingId, {
            qualityGrade: request.qualityGrade,
            deliveryQuantityKg: request.deliveryQuantityKg,
            deliveryPeriod: request.deliveryPeriod,
            unitPriceVndPerKg: request.unitPriceVndPerKg,
            startDate: request.startDate,
            endDate: request.endDate,
            terms: request.terms,
          } satisfies UpdateSupplyContractRequest)
        : await createSupplyContract(request);
      setShowCreate(false);
      setEditingId(null);
      setForm(initialForm());
      setSelected(saved);
      setMessage(
        editingId
          ? `Đã cập nhật hợp đồng ${saved.contractCode}. Supplier cần xác nhận lại trước khi Admin duyệt.`
          : `Đã gửi hợp đồng ${saved.contractCode} đến nhà cung cấp xác nhận.`,
      );
      setPage(1);
      await load();
    } catch (createError: unknown) {
      setError(
        getAuthErrorMessage(
          createError,
          editingId ? "Không thể cập nhật hợp đồng." : "Không thể tạo hợp đồng.",
        ),
      );
    } finally {
      setCreateBusy(false);
    }
  };

  const runAction = async (action: "confirm" | "approve" | "reject") => {
    if (!selected) return;
    const reason = rejectionReason.trim();
    if (action === "reject" && reason.length < 5) {
      setError("Lý do từ chối phải có ít nhất 5 ký tự.");
      return;
    }

    setActionBusy(true);
    setError("");
    setMessage("");
    try {
      let updated: SupplyContractDetail;
      if (action === "confirm") {
        updated = await confirmSupplyContractBySupplier(selected.id);
        setMessage("Đã xác nhận và chuyển hợp đồng đến Admin duyệt.");
      } else if (action === "approve") {
        updated = await approveSupplyContractByAdmin(selected.id);
        setMessage(`Đã duyệt hợp đồng ${selected.contractCode}.`);
      } else if (mode === "supplier") {
        updated = await rejectSupplyContractBySupplier(selected.id, reason);
        setMessage(`Đã từ chối hợp đồng ${selected.contractCode}.`);
      } else {
        updated = await rejectSupplyContractByAdmin(selected.id, reason);
        setMessage(`Đã từ chối hợp đồng ${selected.contractCode}.`);
      }
      setSelected(updated);
      setRejectionReason("");
      await load();
    } catch (actionError: unknown) {
      setError(
        getAuthErrorMessage(actionError, "Không thể cập nhật trạng thái hợp đồng."),
      );
    } finally {
      setActionBusy(false);
    }
  };

  const requestCancellation = async () => {
    if (!selected) return;
    const reason = rejectionReason.trim();
    if (reason.length < 5) {
      setError("Lý do yêu cầu hủy phải có ít nhất 5 ký tự.");
      return;
    }
    setActionBusy(true);
    setError("");
    setMessage("");
    try {
      const updated = await requestSupplyContractCancellation(selected.id, reason);
      setSelected(updated);
      setRejectionReason("");
      setMessage(`Đã gửi yêu cầu hủy hợp đồng ${selected.contractCode} đến quản lý kho.`);
      await load();
    } catch (actionError: unknown) {
      setError(getAuthErrorMessage(actionError, "Không thể gửi yêu cầu hủy hợp đồng."));
    } finally {
      setActionBusy(false);
    }
  };

  const cancelByWarehouse = async () => {
    if (!selected) return;
    const reason = rejectionReason.trim();
    if (reason.length < 5) {
      setError("Lý do hủy phải có ít nhất 5 ký tự.");
      return;
    }
    setActionBusy(true);
    setError("");
    setMessage("");
    try {
      const updated = await cancelSupplyContractByWarehouse(selected.id, reason);
      setSelected(updated);
      setRejectionReason("");
      setMessage(`Đã hủy hợp đồng ${selected.contractCode}.`);
      await load();
    } catch (actionError: unknown) {
      setError(getAuthErrorMessage(actionError, "Không thể hủy hợp đồng."));
    } finally {
      setActionBusy(false);
    }
  };

  return (
    <div className="min-h-full bg-slate-50 p-4 sm:p-6">
      <div className="mx-auto max-w-7xl space-y-6">
        <header className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-emerald-700">{copy.eyebrow}</p>
            <h1 className="text-3xl font-bold text-slate-950">{copy.title}</h1>
            <p className="mt-1 max-w-3xl text-slate-500">{copy.description}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => void load()}
              className="flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700"
            >
              <AppIcon name="refresh" className="size-4" /> Làm mới
            </button>
            {mode === "warehouse" && (
              <button
                type="button"
                onClick={() => void openCreate()}
                className="flex items-center gap-2 rounded-lg bg-emerald-700 px-4 py-2.5 text-sm font-semibold text-white"
              >
                <AppIcon name="plus" className="size-4" /> Tạo và gửi hợp đồng
              </button>
            )}
          </div>
        </header>

        <form
          onSubmit={submitSearch}
          className="grid gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:grid-cols-[1fr_260px_auto]"
        >
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Tìm mã hợp đồng, nhà cung cấp hoặc rau củ"
            className="min-w-0 rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-emerald-600"
          />
          <select
            value={status}
            onChange={(event) => {
              setStatus(event.target.value as SupplyContractStatus | "");
              setPage(1);
            }}
            className="rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-emerald-600"
          >
            <option value="">Tất cả trạng thái</option>
            {statusItems.map((item) => (
              <option key={item.value} value={item.value}>
                {item.label}
              </option>
            ))}
          </select>
          <button className="rounded-lg bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white">
            Tìm kiếm
          </button>
        </form>

        {error && (
          <div className="flex items-start gap-2 rounded-lg bg-rose-50 p-3 text-sm text-rose-700">
            <AppIcon name="alert" className="mt-0.5 size-4 shrink-0" /> {error}
          </div>
        )}
        {message && (
          <div className="rounded-lg bg-emerald-50 p-3 text-sm font-medium text-emerald-700">
            {message}
          </div>
        )}

        <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
            <div>
              <h2 className="font-bold text-slate-900">Danh sách hợp đồng</h2>
              <p className="text-sm text-slate-500">
                Đơn giá là giá thu mua cho mỗi kilogram rau củ.
              </p>
            </div>
            <span className="rounded-full bg-slate-100 px-3 py-1 text-sm font-semibold text-slate-600">
              {totalCount} hợp đồng
            </span>
          </div>
          {loading ? (
            <p className="py-14 text-center text-slate-500">Đang tải dữ liệu...</p>
          ) : items.length === 0 ? (
            <div className="py-14 text-center text-slate-500">
              <AppIcon name="clipboard" className="mx-auto mb-3 size-10 text-slate-300" />
              Chưa có hợp đồng phù hợp.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[980px] text-left text-sm">
                <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                  <tr>
                    <th className="px-4 py-3">Hợp đồng</th>
                    <th className="px-4 py-3">Nhà cung cấp</th>
                    <th className="px-4 py-3">Rau củ</th>
                    <th className="px-4 py-3">Sản lượng định kỳ</th>
                    <th className="px-4 py-3">Đơn giá</th>
                    <th className="px-4 py-3">Thời hạn</th>
                    <th className="px-4 py-3">Trạng thái</th>
                    <th className="px-4 py-3 text-right">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {items.map((item) => (
                    <tr key={item.id} className="align-top hover:bg-slate-50/70">
                      <td className="px-4 py-4">
                        <p className="font-bold text-slate-900">{item.contractCode}</p>
                        <p className="text-xs text-slate-500">
                          Tạo {formatDateTime(item.createdAt)}
                        </p>
                      </td>
                      <td className="px-4 py-4 font-medium text-slate-800">
                        {item.supplierName}
                      </td>
                      <td className="px-4 py-4">
                        <p className="font-semibold text-slate-900">{item.cropTypeName}</p>
                        <p className="text-xs font-bold text-sky-700">
                          Hạng {item.qualityGrade}
                        </p>
                      </td>
                      <td className="px-4 py-4">
                        <span className="font-semibold text-slate-900">
                          {weight.format(item.deliveryQuantityKg)} kg
                        </span>
                        <span className="block text-xs text-slate-500">
                          mỗi {deliveryPeriodLabel(item.deliveryPeriod)}
                        </span>
                      </td>
                      <td className="px-4 py-4 font-bold text-slate-900">
                        {money.format(item.unitPriceVndPerKg)}
                        <span className="block text-xs font-normal text-slate-500">mỗi kg</span>
                      </td>
                      <td className="px-4 py-4 text-slate-600">
                        <p>{formatDate(item.startDate)}</p>
                        <p>đến {formatDate(item.endDate)}</p>
                      </td>
                      <td className="px-4 py-4">
                        <ContractStatusBadge status={item.status} />
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex justify-end">
                          <button
                            type="button"
                            onClick={() => void openDetail(item.id)}
                            className={
                              (mode === "supplier" && item.status === "PENDING_SUPPLIER")
                                || (mode === "admin" && item.status === "PENDING_ADMIN")
                                || (mode === "warehouse" && item.status === "CANCELLATION_REQUESTED")
                                ? "rounded-lg bg-emerald-700 px-3 py-2 font-semibold text-white hover:bg-emerald-800"
                                : "rounded-lg border border-slate-300 px-3 py-2 font-semibold text-slate-700 hover:border-emerald-600 hover:text-emerald-700"
                            }
                          >
                            {(mode === "supplier" && item.status === "PENDING_SUPPLIER")
                              || (mode === "admin" && item.status === "PENDING_ADMIN")
                              ? "Xác nhận"
                              : mode === "warehouse" && item.status === "CANCELLATION_REQUESTED"
                                ? "Xử lý yêu cầu"
                                : "Xem chi tiết"}
                          </button>
                        </div>
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
              <button
                type="button"
                disabled={page === 1}
                onClick={() => setPage((value) => value - 1)}
                className="rounded border px-3 py-1.5 disabled:opacity-40"
              >
                Trước
              </button>
              <button
                type="button"
                disabled={page * 20 >= totalCount}
                onClick={() => setPage((value) => value + 1)}
                className="rounded border px-3 py-1.5 disabled:opacity-40"
              >
                Sau
              </button>
            </div>
          </div>
        </section>
      </div>

      {showCreate && mode === "warehouse" && (
        <div className="fixed inset-0 z-[80] flex items-start justify-center overflow-y-auto bg-slate-950/55 p-4 sm:p-8">
          <form
            onSubmit={submitCreate}
            className="my-auto w-full max-w-3xl overflow-hidden rounded-2xl bg-white shadow-2xl"
          >
            <div className="flex items-start justify-between border-b border-slate-200 px-6 py-5">
              <div>
                <h2 className="text-xl font-bold text-slate-950">
                  {editingId ? "Cập nhật hợp đồng thu mua" : "Tạo hợp đồng thu mua"}
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  {editingId
                    ? "Nội dung mới sẽ được gửi lại để Supplier xác nhận và Admin duyệt cuối cùng."
                    : "Hợp đồng sẽ được gửi ngay đến nhà cung cấp sau khi tạo."}
                </p>
              </div>
              <button
                type="button"
                disabled={createBusy}
                onClick={closeContractForm}
                className="rounded-lg px-3 py-2 text-sm font-semibold text-slate-500 hover:bg-slate-100"
              >
                Đóng
              </button>
            </div>

            {optionsLoading ? (
              <p className="p-10 text-center text-slate-500">Đang tải biểu mẫu...</p>
            ) : (
              <div className="grid gap-5 p-6 sm:grid-cols-2">
                <label className="space-y-1.5 text-sm font-semibold text-slate-700">
                  Nhà cung cấp <span className="text-rose-600">*</span>
                  {editingId ? (
                    <input
                      value={selected?.supplierName ?? ""}
                      disabled
                      className="w-full rounded-lg border border-slate-200 bg-slate-100 px-3 py-2.5 font-normal text-slate-600"
                    />
                  ) : (
                    <select
                      required
                      value={form.supplierId}
                      onChange={(event) =>
                        setForm((current) => ({ ...current, supplierId: event.target.value }))
                      }
                      className="w-full rounded-lg border border-slate-300 px-3 py-2.5 font-normal outline-none focus:border-emerald-600"
                    >
                      <option value="">Chọn nhà cung cấp</option>
                      {options?.suppliers.map((supplier) => (
                        <option key={supplier.id} value={supplier.id}>
                          {supplier.code} - {supplier.name}
                        </option>
                      ))}
                    </select>
                  )}
                </label>

                <label className="space-y-1.5 text-sm font-semibold text-slate-700">
                  Loại rau củ <span className="text-rose-600">*</span>
                  {editingId ? (
                    <input
                      value={selected?.cropTypeName ?? ""}
                      disabled
                      className="w-full rounded-lg border border-slate-200 bg-slate-100 px-3 py-2.5 font-normal text-slate-600"
                    />
                  ) : (
                    <select
                      required
                      value={form.cropTypeId}
                      onChange={(event) =>
                        setForm((current) => ({ ...current, cropTypeId: event.target.value }))
                      }
                      className="w-full rounded-lg border border-slate-300 px-3 py-2.5 font-normal outline-none focus:border-emerald-600"
                    >
                      <option value="">Chọn loại rau củ</option>
                      {options?.cropTypes.map((crop) => (
                        <option key={crop.id} value={crop.id}>
                          {crop.code} - {crop.name} ({crop.categoryName})
                        </option>
                      ))}
                    </select>
                  )}
                </label>

                <label className="space-y-1.5 text-sm font-semibold text-slate-700">
                  Hạng rau củ <span className="text-rose-600">*</span>
                  <select
                    required
                    value={form.qualityGrade}
                    onChange={(event) =>
                      setForm((current) => ({ ...current, qualityGrade: event.target.value }))
                    }
                    className="w-full rounded-lg border border-slate-300 px-3 py-2.5 font-normal outline-none focus:border-emerald-600"
                  >
                    {(options?.qualityGrades ?? ["A", "B", "C", "D", "E"]).map(
                      (grade) => (
                        <option key={grade} value={grade}>
                          Hạng {grade}
                        </option>
                      ),
                    )}
                  </select>
                </label>

                <label className="space-y-1.5 text-sm font-semibold text-slate-700">
                  Sản lượng cam kết <span className="text-rose-600">*</span>
                  <div className="relative">
                    <input
                      required
                      type="number"
                      min="0.01"
                      step="0.01"
                      value={form.deliveryQuantityKg}
                      onChange={(event) =>
                        setForm((current) => ({
                          ...current,
                          deliveryQuantityKg: event.target.value,
                        }))
                      }
                      placeholder="Ví dụ: 500"
                      className="w-full rounded-lg border border-slate-300 px-3 py-2.5 pr-16 font-normal outline-none focus:border-emerald-600"
                    />
                    <span className="pointer-events-none absolute right-3 top-2.5 font-normal text-slate-500">
                      kg
                    </span>
                  </div>
                </label>

                <label className="space-y-1.5 text-sm font-semibold text-slate-700">
                  Chu kỳ giao <span className="text-rose-600">*</span>
                  <select
                    required
                    value={form.deliveryPeriod}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        deliveryPeriod: event.target.value as DeliveryPeriod,
                      }))
                    }
                    className="w-full rounded-lg border border-slate-300 px-3 py-2.5 font-normal outline-none focus:border-emerald-600"
                  >
                    <option value="WEEK">Mỗi tuần</option>
                    <option value="MONTH">Mỗi tháng</option>
                  </select>
                </label>

                <label className="space-y-1.5 text-sm font-semibold text-slate-700 sm:col-span-2">
                  Đơn giá thu mua <span className="text-rose-600">*</span>
                  <div className="relative">
                    <input
                      required
                      type="number"
                      min="1"
                      step="1"
                      value={form.unitPriceVndPerKg}
                      onChange={(event) =>
                        setForm((current) => ({
                          ...current,
                          unitPriceVndPerKg: event.target.value,
                        }))
                      }
                      placeholder="Ví dụ: 25000"
                      className="w-full rounded-lg border border-slate-300 px-3 py-2.5 pr-28 font-normal outline-none focus:border-emerald-600"
                    />
                    <span className="pointer-events-none absolute right-3 top-2.5 font-normal text-slate-500">
                      VNĐ/kg
                    </span>
                  </div>
                  {Number(form.unitPriceVndPerKg) > 0 && (
                    <span className="block font-normal text-emerald-700">
                      {money.format(Number(form.unitPriceVndPerKg))} mỗi kg
                    </span>
                  )}
                </label>

                <label className="space-y-1.5 text-sm font-semibold text-slate-700">
                  Ngày bắt đầu <span className="text-rose-600">*</span>
                  <input
                    required
                    type="date"
                    min={editingId ? undefined : localIsoDate(new Date())}
                    value={form.startDate}
                    onChange={(event) =>
                      setForm((current) => ({ ...current, startDate: event.target.value }))
                    }
                    className="w-full rounded-lg border border-slate-300 px-3 py-2.5 font-normal outline-none focus:border-emerald-600"
                  />
                </label>

                <label className="space-y-1.5 text-sm font-semibold text-slate-700">
                  Ngày hết hạn <span className="text-rose-600">*</span>
                  <input
                    required
                    type="date"
                    min={form.startDate}
                    value={form.endDate}
                    onChange={(event) =>
                      setForm((current) => ({ ...current, endDate: event.target.value }))
                    }
                    className="w-full rounded-lg border border-slate-300 px-3 py-2.5 font-normal outline-none focus:border-emerald-600"
                  />
                </label>

                <label className="space-y-1.5 text-sm font-semibold text-slate-700 sm:col-span-2">
                  Điều khoản bổ sung
                  <textarea
                    rows={4}
                    maxLength={2000}
                    value={form.terms}
                    onChange={(event) =>
                      setForm((current) => ({ ...current, terms: event.target.value }))
                    }
                    placeholder="Quy cách đóng gói, thời gian giao trong ngày, điều kiện thanh toán..."
                    className="w-full resize-y rounded-lg border border-slate-300 px-3 py-2.5 font-normal outline-none focus:border-emerald-600"
                  />
                  <span className="block text-right font-normal text-slate-400">
                    {form.terms.length}/2000
                  </span>
                </label>
              </div>
            )}

            <div className="flex justify-end gap-3 border-t border-slate-200 bg-slate-50 px-6 py-4">
              <button
                type="button"
                disabled={createBusy}
                onClick={closeContractForm}
                className="rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 disabled:opacity-50"
              >
                Hủy
              </button>
              <button
                disabled={createBusy || optionsLoading || (!editingId && !options)}
                className="rounded-lg bg-emerald-700 px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
              >
                {createBusy
                  ? "Đang gửi..."
                  : editingId
                    ? "Lưu và gửi Supplier xác nhận lại"
                    : "Tạo và gửi nhà cung cấp"}
              </button>
            </div>
          </form>
        </div>
      )}

      {(selected || detailLoading) && (
        <div className="fixed inset-0 z-[70] flex justify-end bg-slate-950/55">
          <button
            type="button"
            className="min-w-0 flex-1"
            aria-label="Đóng chi tiết hợp đồng"
            onClick={closeDetail}
          />
          <aside className="h-full w-full max-w-xl overflow-y-auto bg-white shadow-2xl">
            {detailLoading && !selected ? (
              <p className="p-10 text-center text-slate-500">Đang tải chi tiết...</p>
            ) : selected ? (
              <>
                <div className="sticky top-0 z-10 flex items-start justify-between border-b border-slate-200 bg-white px-6 py-5">
                  <div>
                    <p className="text-sm font-semibold text-emerald-700">Chi tiết hợp đồng</p>
                    <h2 className="text-xl font-bold text-slate-950">
                      {selected.contractCode}
                    </h2>
                  </div>
                  <button
                    type="button"
                    disabled={actionBusy}
                    onClick={closeDetail}
                    className="rounded-lg px-3 py-2 text-sm font-semibold text-slate-500 hover:bg-slate-100"
                  >
                    Đóng
                  </button>
                </div>

                <div className="space-y-6 p-6">
                  <ContractStatusBadge status={selected.status} />

                  {selected.status === "CANCELLATION_REQUESTED" && (
                    <section className="rounded-xl border border-orange-200 bg-orange-50 p-4">
                      <h3 className="font-bold text-orange-900">Supplier yêu cầu hủy hợp đồng</h3>
                      <p className="mt-1 whitespace-pre-wrap text-sm text-orange-800">
                        {selected.cancellationRequestReason}
                      </p>
                      {selected.cancellationRequestedAt && (
                        <p className="mt-2 text-xs text-orange-700">
                          Gửi lúc {formatDateTime(selected.cancellationRequestedAt)}
                        </p>
                      )}
                    </section>
                  )}

                  {selected.status === "CANCELLED" && selected.cancellationReason && (
                    <section className="rounded-xl border border-slate-300 bg-slate-100 p-4">
                      <h3 className="font-bold text-slate-900">Hợp đồng đã bị hủy</h3>
                      <p className="mt-1 whitespace-pre-wrap text-sm text-slate-700">
                        {selected.cancellationReason}
                      </p>
                    </section>
                  )}

                  <section className="grid gap-4 rounded-xl border border-slate-200 p-5 sm:grid-cols-2">
                    <DetailField label="Nhà cung cấp" value={selected.supplierName} />
                    <DetailField
                      label="Quản lý kho tạo"
                      value={selected.warehouseManagerName}
                    />
                    <DetailField label="Loại rau củ" value={selected.cropTypeName} />
                    <DetailField label="Hạng chất lượng" value={`Hạng ${selected.qualityGrade}`} />
                    <DetailField
                      label="Sản lượng cam kết"
                      value={`${weight.format(selected.deliveryQuantityKg)} kg/${deliveryPeriodLabel(selected.deliveryPeriod)}`}
                    />
                    <DetailField
                      label="Đơn giá thu mua"
                      value={`${money.format(selected.unitPriceVndPerKg)} / kg`}
                      important
                    />
                    <DetailField label="Ngày bắt đầu" value={formatDate(selected.startDate)} />
                    <DetailField label="Ngày hết hạn" value={formatDate(selected.endDate)} />
                    <DetailField label="Phiên bản hợp đồng" value={`Lần ${selected.revision}`} />
                  </section>

                  <section>
                    <h3 className="text-sm font-bold uppercase tracking-wide text-slate-500">
                      Điều khoản bổ sung
                    </h3>
                    <p className="mt-2 whitespace-pre-wrap rounded-xl bg-slate-50 p-4 text-sm leading-6 text-slate-700">
                      {selected.terms || "Không có điều khoản bổ sung."}
                    </p>
                  </section>

                  <section className="space-y-3 border-t border-slate-200 pt-5">
                    <h3 className="font-bold text-slate-900">Lịch sử xử lý</h3>
                    <HistoryItem
                      title="Quản lý kho đã tạo và gửi hợp đồng"
                      detail={formatDateTime(selected.createdAt)}
                      complete
                    />
                    {selected.revision > 1 && (
                      <HistoryItem
                        title={`Quản lý kho đã cập nhật hợp đồng (phiên bản ${selected.revision})`}
                        detail="Mọi xác nhận cũ đã hết hiệu lực; hợp đồng phải được duyệt lại."
                        complete
                      />
                    )}
                    <HistoryItem
                      title={
                        selected.status === "SUPPLIER_REJECTED"
                          ? "Nhà cung cấp đã từ chối"
                          : "Nhà cung cấp xác nhận"
                      }
                      detail={
                        selected.supplierRejectionReason ??
                        (selected.supplierRespondedAt
                          ? formatDateTime(selected.supplierRespondedAt)
                          : "Đang chờ xử lý")
                      }
                      complete={Boolean(selected.supplierRespondedAt)}
                      rejected={Boolean(selected.supplierRejectionReason)}
                    />
                    <HistoryItem
                      title={
                        selected.status === "ADMIN_REJECTED"
                          ? "Admin đã từ chối"
                          : "Admin duyệt cuối cùng"
                      }
                      detail={
                        selected.adminRejectionReason ??
                        (selected.adminReviewedAt
                          ? `${selected.adminName ?? "Admin"} · ${formatDateTime(selected.adminReviewedAt)}`
                          : "Đang chờ xử lý")
                      }
                      complete={Boolean(selected.adminReviewedAt)}
                      rejected={Boolean(selected.adminRejectionReason)}
                    />
                    {selected.cancellationRequestedAt && (
                      <HistoryItem
                        title="Supplier đã gửi yêu cầu hủy"
                        detail={`${selected.cancellationRequestReason ?? "Không có lý do"} · ${formatDateTime(selected.cancellationRequestedAt)}`}
                        complete
                        rejected
                      />
                    )}
                    {selected.cancelledAt && (
                      <HistoryItem
                        title="Quản lý kho đã hủy hợp đồng"
                        detail={`${selected.cancellationReason ?? "Không có lý do"} · ${formatDateTime(selected.cancelledAt)}`}
                        complete
                        rejected
                      />
                    )}
                  </section>

                  {((mode === "supplier" && selected.status === "PENDING_SUPPLIER") ||
                    (mode === "admin" && selected.status === "PENDING_ADMIN")) && (
                    <section className="space-y-4 rounded-xl border border-amber-200 bg-amber-50/60 p-5">
                      <div>
                        <h3 className="font-bold text-slate-900">
                          {mode === "supplier"
                            ? "Xác nhận của nhà cung cấp"
                            : "Phê duyệt của Admin"}
                        </h3>
                        <p className="mt-1 text-sm text-slate-600">
                          Hãy kiểm tra kỹ loại rau củ, hạng, sản lượng định kỳ, thời hạn và đơn giá trước khi xử lý.
                        </p>
                      </div>
                      <label className="block space-y-1.5 text-sm font-semibold text-slate-700">
                        Lý do nếu từ chối
                        <textarea
                          rows={3}
                          maxLength={1000}
                          value={rejectionReason}
                          onChange={(event) => setRejectionReason(event.target.value)}
                          placeholder="Nhập ít nhất 5 ký tự"
                          className="w-full resize-y rounded-lg border border-slate-300 bg-white px-3 py-2.5 font-normal outline-none focus:border-emerald-600"
                        />
                      </label>
                      <div className="flex flex-wrap justify-end gap-2">
                        <button
                          type="button"
                          disabled={actionBusy}
                          onClick={() => void runAction("reject")}
                          className="rounded-lg border border-rose-300 bg-white px-4 py-2.5 text-sm font-semibold text-rose-700 disabled:opacity-50"
                        >
                          {actionBusy ? "Đang xử lý..." : "Từ chối"}
                        </button>
                        <button
                          type="button"
                          disabled={actionBusy}
                          onClick={() => {
                            setError("");
                            setShowFinalConfirmation(true);
                          }}
                          className="rounded-lg bg-emerald-700 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
                        >
                          {actionBusy
                            ? "Đang xử lý..."
                            : mode === "supplier"
                              ? "Xác nhận và gửi Admin"
                              : "Xác nhận duyệt"}
                        </button>
                      </div>
                    </section>
                  )}

                  {mode === "supplier" &&
                    (selected.status === "APPROVED" || selected.status === "PENDING_ADMIN") && (
                      <section className="space-y-4 rounded-xl border border-orange-200 bg-orange-50/60 p-5">
                        <div>
                          <h3 className="font-bold text-slate-900">Yêu cầu hủy hợp đồng</h3>
                          <p className="mt-1 text-sm text-slate-600">
                            Gửi lý do đến quản lý kho. Trong lúc chờ xử lý, hợp đồng sẽ không thể dùng để tạo lô hàng mới.
                          </p>
                        </div>
                        <label className="block space-y-1.5 text-sm font-semibold text-slate-700">
                          Lý do yêu cầu hủy <span className="text-rose-600">*</span>
                          <textarea
                            rows={3}
                            maxLength={1000}
                            value={rejectionReason}
                            onChange={(event) => setRejectionReason(event.target.value)}
                            placeholder="Ví dụ: Không thể tiếp tục cung ứng theo sản lượng đã cam kết"
                            className="w-full resize-y rounded-lg border border-slate-300 bg-white px-3 py-2.5 font-normal outline-none focus:border-orange-600"
                          />
                        </label>
                        <div className="flex justify-end">
                          <button
                            type="button"
                            disabled={actionBusy}
                            onClick={() => void requestCancellation()}
                            className="rounded-lg bg-orange-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-orange-700 disabled:opacity-50"
                          >
                            {actionBusy ? "Đang gửi..." : "Gửi yêu cầu hủy"}
                          </button>
                        </div>
                      </section>
                    )}

                  {mode === "warehouse" && selected.status !== "CANCELLED" && (
                    <section className="space-y-4 rounded-xl border border-slate-200 bg-slate-50 p-5">
                      <div>
                        <h3 className="font-bold text-slate-900">Quản lý hợp đồng</h3>
                        <p className="mt-1 text-sm text-slate-600">
                          Khi cập nhật, hợp đồng tự động quay về bước Supplier xác nhận, sau đó Admin duyệt cuối cùng.
                        </p>
                      </div>
                      <label className="block space-y-1.5 text-sm font-semibold text-slate-700">
                        Lý do nếu hủy <span className="text-rose-600">*</span>
                        <textarea
                          rows={3}
                          maxLength={1000}
                          value={rejectionReason}
                          onChange={(event) => setRejectionReason(event.target.value)}
                          placeholder="Nhập ít nhất 5 ký tự"
                          className="w-full resize-y rounded-lg border border-slate-300 bg-white px-3 py-2.5 font-normal outline-none focus:border-rose-600"
                        />
                      </label>
                      <div className="flex flex-wrap justify-end gap-2">
                        <button
                          type="button"
                          disabled={actionBusy}
                          onClick={openEdit}
                          className="rounded-lg border border-emerald-300 bg-white px-4 py-2.5 text-sm font-semibold text-emerald-700 hover:bg-emerald-50 disabled:opacity-50"
                        >
                          Cập nhật hợp đồng
                        </button>
                        <button
                          type="button"
                          disabled={actionBusy}
                          onClick={() => {
                            if (rejectionReason.trim().length < 5) {
                              setError("Lý do hủy phải có ít nhất 5 ký tự.");
                              return;
                            }
                            setError("");
                            setShowCancelConfirmation(true);
                          }}
                          className="rounded-lg bg-rose-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-rose-800 disabled:opacity-50"
                        >
                          Hủy hợp đồng
                        </button>
                      </div>
                    </section>
                  )}
                </div>
              </>
            ) : null}
          </aside>
        </div>
      )}

      {showFinalConfirmation && selected && (mode === "supplier" || mode === "admin") && (
        <div
          className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-950/60 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="final-confirmation-title"
        >
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
            <div className="flex size-11 items-center justify-center rounded-full bg-amber-100 text-amber-700">
              <AppIcon name="alert" className="size-5" />
            </div>
            <h2 id="final-confirmation-title" className="mt-4 text-xl font-bold text-slate-950">
              {mode === "supplier"
                ? "Xác nhận hợp đồng lần cuối?"
                : "Xác nhận duyệt hợp đồng lần cuối?"}
            </h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              {mode === "supplier" ? (
                <>Bạn xác nhận đồng ý với hợp đồng <strong>{selected.contractCode}</strong>. Sau bước này,
                  hợp đồng sẽ được chuyển đến Admin duyệt và bạn không thể xác nhận lại.</>
              ) : (
                <>Bạn xác nhận duyệt hợp đồng <strong>{selected.contractCode}</strong>. Sau bước này,
                  hợp đồng sẽ có hiệu lực và nhà cung cấp có thể dùng để khai báo lô hàng.</>
              )}
            </p>
            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowFinalConfirmation(false)}
                className="rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700"
              >
                Quay lại kiểm tra
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowFinalConfirmation(false);
                  void runAction(mode === "supplier" ? "confirm" : "approve");
                }}
                className="rounded-lg bg-emerald-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-800"
              >
                Xác nhận lần cuối
              </button>
            </div>
          </div>
        </div>
      )}

      {showCancelConfirmation && selected && mode === "warehouse" && (
        <div
          className="fixed inset-0 z-[90] flex items-center justify-center bg-slate-950/60 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="cancel-contract-title"
        >
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
            <div className="flex size-11 items-center justify-center rounded-full bg-rose-100 text-rose-700">
              <AppIcon name="alert" className="size-5" />
            </div>
            <h2 id="cancel-contract-title" className="mt-4 text-xl font-bold text-slate-950">
              Xác nhận hủy hợp đồng?
            </h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              Hợp đồng <strong>{selected.contractCode}</strong> sẽ chuyển sang trạng thái đã hủy và
              Supplier không thể dùng hợp đồng này để tạo lô hàng mới.
            </p>
            <div className="mt-4 rounded-lg bg-slate-50 p-3 text-sm text-slate-700">
              <span className="font-semibold">Lý do:</span> {rejectionReason.trim()}
            </div>
            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowCancelConfirmation(false)}
                className="rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700"
              >
                Quay lại
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowCancelConfirmation(false);
                  void cancelByWarehouse();
                }}
                className="rounded-lg bg-rose-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-rose-800"
              >
                Xác nhận hủy
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function DetailField({
  label,
  value,
  important = false,
}: {
  label: string;
  value: string;
  important?: boolean;
}) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">{label}</p>
      <p
        className={`mt-1 font-semibold ${important ? "text-lg text-emerald-700" : "text-slate-900"}`}
      >
        {value}
      </p>
    </div>
  );
}

function HistoryItem({
  title,
  detail,
  complete,
  rejected = false,
}: {
  title: string;
  detail: string;
  complete: boolean;
  rejected?: boolean;
}) {
  const tone = rejected
    ? "bg-rose-100 text-rose-700"
    : complete
      ? "bg-emerald-100 text-emerald-700"
      : "bg-slate-100 text-slate-400";
  return (
    <div className="flex gap-3">
      <span className={`mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full ${tone}`}>
        {complete ? "✓" : "·"}
      </span>
      <div>
        <p className="text-sm font-semibold text-slate-800">{title}</p>
        <p className="text-sm text-slate-500">{detail}</p>
      </div>
    </div>
  );
}
