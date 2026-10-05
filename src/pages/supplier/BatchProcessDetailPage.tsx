import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router';
import { Loader2 } from 'lucide-react';
import { supplierBatchService } from '@/services/suppliers/supplierBatchService';
import { getAuthErrorMessage } from '@/services/authService';
import type { SupplierBatchStatusResponse } from '@/types/supplierBatch';
import { SupplierBatchBreadcrumb } from '@/features/supplier/components/SupplierBatchBreadcrumb';
import { SupplierDocuments } from '@/features/supplier/components/SupplierDocuments';
import { canEditSupplierBatch } from '@/features/supplier/batchStatus';
import { getSupplierBatchProgress } from '@/features/supplier/batchProgress';
import { SupplierBatchProgress } from '@/features/supplier/components/SupplierBatchProgress';

const date = (value?: string | null) => value ? new Date(`${value.slice(0, 10)}T00:00:00`).toLocaleDateString('vi-VN') : 'Chưa khai báo';
const time = (value: string) => new Date(/(?:Z|[+-]\d{2}:\d{2})$/.test(value) ? value : `${value}Z`).toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' });
const quantity = (value: number | null | undefined, unit: string) => value == null ? 'Chưa kiểm nhận' : `${value.toLocaleString('vi-VN', { maximumFractionDigits: 3 })} ${unit}`;
const range = (min: number | null | undefined, max: number | null | undefined, unit: string) =>
  min == null && max == null ? 'Chưa khai báo' : `${min ?? '?'} – ${max ?? '?'} ${unit}`;

function Field({ label, value }: { label: string; value: string }) {
  return <div><dt className="text-xs text-gray-500 mb-1">{label}</dt><dd className="text-sm font-medium text-gray-900 whitespace-pre-wrap break-words">{value}</dd></div>;
}

export function BatchProcessDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [data, setData] = useState<SupplierBatchStatusResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [canceling, setCanceling] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => {
    let active = true;
    if (!id || !Number.isSafeInteger(Number(id)) || Number(id) <= 0) {
      void Promise.resolve().then(() => { if (active) { setError('Mã lô hàng không hợp lệ.'); setLoading(false); } });
      return () => { active = false; };
    }
    void supplierBatchService.getBatchStatus(Number(id)).then(response => {
      if (active) { setData(response.data); setError(''); }
    }).catch(e => { if (active) setError(getAuthErrorMessage(e, 'Không thể tải lô hàng.')); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [id]);

  async function cancel() {
    if (!data || !canEditSupplierBatch(data.currentStatus) || canceling) return;
    if (!window.confirm('Bạn có chắc chắn muốn hủy lô hàng này không?')) return;
    setCanceling(true); setError('');
    try {
      await supplierBatchService.cancelBatch(data.batchId, { expectedCreatedAt: data.createdAt, expectedUpdatedAt: data.updatedAt });
      const response = await supplierBatchService.getBatchStatus(data.batchId);
      setData(response.data);
    } catch (e) { setError(getAuthErrorMessage(e, 'Không thể hủy lô hàng.')); }
    finally { setCanceling(false); }
  }
  if (loading) return <div className="p-12 flex justify-center"><Loader2 className="animate-spin" /></div>;
  if (!data) return <div className="p-6"><p role="alert" className="text-red-600">{error}</p><Link to="/supplier/batches">Quay lại danh sách lô hàng</Link></div>;
  const editable = canEditSupplierBatch(data.currentStatus);
  const progress = getSupplierBatchProgress(data);
  return <div className="p-6 max-w-7xl mx-auto space-y-6">
    <div className="flex flex-wrap justify-between gap-4">
      <div><SupplierBatchBreadcrumb batchId={data.batchId} batchCode={data.batchCode} />
        <h1 className="text-2xl font-bold">Chi tiết lô hàng #{data.batchCode}</h1>
        <p className="text-sm text-emerald-700 mt-2">{progress.statusLabel}</p>
      </div>
      <div className="flex items-center gap-3">
        <Link to="/supplier/batches" className="text-sm border rounded-lg p-2">Quay lại danh sách</Link>
        {editable && <>
          {!canceling && <Link to={`/supplier/batches/${data.batchId}/edit`} className="text-sm text-blue-700 border rounded-lg p-2">Chỉnh sửa lô hàng</Link>}
          <button type="button" onClick={() => void cancel()} disabled={canceling} className="text-sm text-red-700 border rounded-lg p-2 disabled:opacity-50">{canceling ? 'Đang hủy...' : 'Hủy lô hàng'}</button>
        </>}
      </div>
    </div>
    {error && <p role="alert" className="p-3 bg-red-50 text-red-700 rounded-lg">{error}</p>}
    {!editable && <p className="text-sm text-gray-500">Supplier chỉ có thể sửa hoặc hủy khi lô hàng đang chờ tiếp nhận.</p>}
    <div className="grid lg:grid-cols-3 gap-6">
      <div className="lg:col-span-2 space-y-6">
        <section className="bg-white border rounded-xl p-6"><h2 className="font-semibold mb-4">Thông tin khai báo</h2>
          <dl className="grid sm:grid-cols-2 gap-5">
            <Field label="Sản phẩm" value={data.productName} /><Field label="Nông sản" value={data.cropTypeName} />
            <Field label="Vùng trồng" value={data.areaName} /><Field label="Địa chỉ vùng trồng" value={[data.ward, data.district, data.province].filter(Boolean).join(', ') || 'Chưa cập nhật'} />
            <Field label="Số lượng khai báo" value={quantity(data.declaredQuantity, data.unit)} />
            <Field label="Tổng khối lượng khai báo" value={`${quantity(data.weightInKg, 'kg')} (${quantity(data.weightInKg / 1000, 'tấn')})`} />
            <Field label="Quy cách đóng gói" value={data.packageCount != null && data.packageUnitWeightKg != null ? `${data.packageCount} ${data.packagingType || 'kiện'} × ${data.packageUnitWeightKg} kg/kiện` : data.packagingType || 'Chưa khai báo'} />
            <Field label="Ngày thu hoạch" value={date(data.harvestDate)} /><Field label="Ngày giao dự kiến" value={date(data.expectedDeliveryDate)} /><Field label="Ngày hết hạn" value={date(data.expiryDate)} />
            <Field label="Nhiệt độ bảo quản" value={range(data.expectedMinTempC, data.expectedMaxTempC, '°C')} />
            <Field label="Độ ẩm bảo quản" value={range(data.expectedMinHumidityPct, data.expectedMaxHumidityPct, '%')} />
            <Field label="Ghi chú Supplier" value={data.supplierNote || 'Không có ghi chú.'} />
          </dl>
        </section>
        <section className="bg-white border rounded-xl p-6"><h2 className="font-semibold mb-4">Kiểm nhận và nhập kho</h2>
          <dl className="grid sm:grid-cols-2 gap-5">
            <Field label="Số lượng staff kiểm nhận" value={quantity(data.verifiedQuantity, data.unit)} />
            <Field label="Khối lượng staff kiểm nhận" value={quantity(data.verifiedWeightInKg, 'kg')} />
            <Field label="Số lượng đã nhập kho (phiếu đã hoàn tất)" value={data.receivedQuantity > 0 ? quantity(data.receivedQuantity, data.unit) : 'Chưa nhập kho'} />
            <Field label="Ghi chú tiếp nhận" value={data.warehouseNote || 'Không có ghi chú.'} />
            <Field label="Kết quả QC" value={data.qcResult || 'Chưa có kết quả'} /><Field label="Hạng chất lượng" value={data.qualityGrade || 'Chưa phân hạng'} />
            {!progress.isStored && data.rejectionReason && <Field label="Lý do từ chối" value={data.rejectionReason} />}
          </dl>
        </section>
        <section className="bg-white border rounded-xl p-6"><h2 className="font-semibold mb-4">Tài liệu đính kèm</h2><SupplierDocuments documents={data.documents ?? []} /></section>
      </div>
      <SupplierBatchProgress progress={progress} formatTime={time} />
    </div>
  </div>;
}
export default BatchProcessDetailPage;
