import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router';
import {
  ArrowLeft,
  Pencil,
  CheckCircle2,
  Clock,
  FlaskConical,
  PackageCheck,
  Building2,
  Loader2,
  AlertCircle,
  XCircle,
  History,
  MapPin,
} from 'lucide-react';
import { supplierBatchService } from '@/services/suppliers/supplierBatchService';
import type { SupplierBatchStatusResponse } from '@/types/supplierBatch';

export const BatchStatusDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<SupplierBatchStatusResponse | null>(null);

  useEffect(() => {
    if (!id) return;
    const fetchDetail = async () => {
      try {
        setLoading(true);
        const response = await supplierBatchService.getBatchStatus(Number(id));
        // Đã cập nhật đúng dữ liệu trả về từ API Backend
        setData(response.data);
      } catch (err: any) {
        setError(err.response?.data?.message || 'Không thể tải thông tin lô hàng.');
      } finally {
        setLoading(false);
      }
    };

    fetchDetail();
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen p-6 bg-gray-50 flex flex-col items-center justify-center">
        <AlertCircle className="w-12 h-12 text-red-500 mb-2" />
        <p className="text-sm font-semibold text-gray-800">{error || 'Không tìm thấy dữ liệu'}</p>
        <button
          onClick={() => navigate('/supplier/batches')}
          className="mt-4 px-4 py-2 bg-zinc-800 text-white rounded-lg text-xs"
        >
          Quay lại danh sách
        </button>
      </div>
    );
  }

  // Các bước Stepper cố định
  const steps = [
    { key: 'SUBMITTED', label: 'Đã khai báo', icon: CheckCircle2 },
    { key: 'PENDING_APPROVAL', label: 'Chờ phê duyệt', icon: Clock },
    { key: 'PENDING_QC', label: 'Chờ kiểm định QC', icon: FlaskConical },
    { key: 'APPROVED', label: 'Đã duyệt', icon: CheckCircle2 },
    { key: 'IN_WAREHOUSE', label: 'Đã nhập kho', icon: PackageCheck },
  ];

  return (
    <div className="min-h-screen bg-gray-50/50 p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header Bar */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 text-xs text-gray-500 mb-1">
            <span>Bảng điều khiển</span>
            <span>/</span>
            <span>Quản lý lô sản phẩm</span>
            <span>/</span>
            <span className="font-semibold text-gray-700">Chi tiết lô hàng</span>
            <span className="bg-gray-200 text-gray-700 px-2 py-0.5 rounded text-[11px] font-mono">
              Mã lô hàng: {data.batchCode}
            </span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Chi tiết lô hàng</h1>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => navigate(`/supplier/batches/${data.batchId}/edit`)}
            className="bg-white hover:bg-gray-50 text-gray-700 font-medium px-3.5 py-1.5 rounded-lg border border-gray-300 text-xs flex items-center gap-1.5 shadow-sm"
          >
            <Pencil className="w-3.5 h-3.5" />
            <span>Chỉnh sửa</span>
          </button>
          <button
            onClick={() => navigate('/supplier/batches')}
            className="bg-white hover:bg-gray-50 text-gray-700 font-medium px-3.5 py-1.5 rounded-lg border border-gray-300 text-xs flex items-center gap-1.5 shadow-sm"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Quay lại danh sách</span>
          </button>
        </div>
      </div>

      {/* Stepper Tiến trình xử lý */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
        <h2 className="text-xs font-bold text-gray-800 uppercase tracking-wider mb-6">
          Tiến trình xử lý hiện tại
        </h2>
        <div className="flex items-center justify-between relative px-4">
          <div className="absolute top-1/2 left-8 right-8 h-0.5 bg-gray-200 -translate-y-1/2 z-0" />
          {steps.map((step) => {
            const Icon = step.icon;
            const isCurrent = data.currentStatus === step.key;
            return (
              <div key={step.key} className="relative z-10 flex flex-col items-center">
                <div
                  className={`w-9 h-9 rounded-full flex items-center justify-center border-2 transition ${
                    isCurrent
                      ? 'bg-emerald-500 border-emerald-600 text-white shadow-md ring-4 ring-emerald-100'
                      : 'bg-white border-gray-300 text-gray-400'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                </div>
                <span className={`text-[11px] font-medium mt-2 text-center ${isCurrent ? 'text-emerald-700 font-bold' : 'text-gray-600'}`}>
                  {step.label}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Grid thông tin chi tiết */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Tóm tắt Lô hàng */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 space-y-4">
          <div className="flex items-center justify-between border-b pb-3">
            <h3 className="text-sm font-bold text-gray-900">Tóm tắt Lô hàng</h3>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 uppercase">
              {data.statusDisplayName || data.currentStatus}
            </span>
          </div>

          <div className="space-y-3 text-xs">
            <div>
              <p className="text-[10px] text-gray-400 uppercase font-semibold">TÊN SẢN PHẨM</p>
              <p className="font-bold text-gray-800 text-sm mt-0.5">{data.productName}</p>
            </div>
            <div>
              <p className="text-[10px] text-gray-400 uppercase font-semibold">LOẠI CÂY TRỒNG / NÔNG SẢN</p>
              <p className="text-gray-700 mt-0.5">{data.cropTypeName}</p>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <p className="text-[10px] text-gray-400 uppercase font-semibold">SỐ LƯỢNG KHAI BÁO</p>
                <p className="font-bold text-gray-900 mt-0.5">
                  {data.declaredQuantity.toLocaleString()} {data.unit}
                </p>
              </div>
              <div>
                <p className="text-[10px] text-gray-400 uppercase font-semibold">THỰC NHẬN</p>
                <p className="font-bold text-emerald-600 mt-0.5">
                  {data.receivedQuantity ? `${data.receivedQuantity.toLocaleString()} ${data.unit}` : 'Chưa nhận'}
                </p>
              </div>
            </div>
            <div>
              <p className="text-[10px] text-gray-400 uppercase font-semibold">VÙNG TRỒNG KHAI THÁC</p>
              <p className="font-bold text-gray-800 text-sm mt-0.5">{data.areaName || 'Chưa cập nhật'}</p>
              {(data.province || data.district || data.ward) && (
                <p className="text-[11px] text-gray-500 mt-0.5 flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <span>{[data.ward, data.district, data.province].filter(Boolean).join(', ')}</span>
                </p>
              )}
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <p className="text-[10px] text-gray-400 uppercase font-semibold">NGÀY THU HOẠCH</p>
                <p className="text-gray-700 mt-0.5">{data.harvestDate}</p>
              </div>
              <div>
                <p className="text-[10px] text-gray-400 uppercase font-semibold">NGÀY GIAO DỰ KIẾN</p>
                <p className="text-gray-700 mt-0.5">{data.expectedDeliveryDate || 'N/A'}</p>
              </div>
            </div>
            {data.warehouseNote && (
              <div className="p-2.5 bg-amber-50 border border-amber-200 rounded-lg text-amber-900 text-[11px]">
                <span className="font-semibold">Ghi chú từ kho: </span>
                {data.warehouseNote}
              </div>
            )}
          </div>
        </div>

        {/* Kết quả QC & Lịch sử tiến trình từ Backend DTO */}
        <div className="lg:col-span-2 space-y-6">
          {/* Kết quả QC & Đánh giá phân loại */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
            <div className="flex items-center justify-between border-b pb-3 mb-3">
              <div className="flex items-center gap-2 text-xs font-bold text-gray-800">
                <FlaskConical className="w-4 h-4 text-emerald-600" />
                <span>Kết quả kiểm định chất lượng (QC)</span>
              </div>
              <span className={`text-[10px] px-2 py-0.5 rounded font-bold uppercase ${
                data.qcResult === 'Passed'
                  ? 'bg-emerald-100 text-emerald-700'
                  : data.qcResult === 'Failed'
                  ? 'bg-red-100 text-red-700'
                  : 'bg-amber-100 text-amber-700'
              }`}>
                {data.qcResult || 'Chưa kiểm định'}
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              <div className="p-3 bg-gray-50 rounded-lg">
                <p className="text-gray-500 text-[10px] uppercase font-semibold">Xếp hạng chất lượng</p>
                <p className="text-sm font-bold text-gray-800 mt-1">
                  {data.qualityGrade ? `Hạng ${data.qualityGrade}` : 'Chưa xếp hạng'}
                </p>
              </div>
              <div className="p-3 bg-gray-50 rounded-lg">
                <p className="text-gray-500 text-[10px] uppercase font-semibold">Quy đổi tổng khối lượng (Kg)</p>
                <p className="text-sm font-bold text-gray-800 mt-1">
                  {data.weightInKg ? `${data.weightInKg.toLocaleString()} kg` : 'N/A'}
                </p>
              </div>
            </div>

            {data.rejectionReason && (
              <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-xs flex items-start gap-2">
                <XCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold">Lý do từ chối: </span>
                  <span>{data.rejectionReason}</span>
                </div>
              </div>
            )}
          </div>

          {/* Lịch sử tiến trình chuyển trạng thái (render từ statusHistory của DTO) */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
            <div className="flex items-center gap-2 text-xs font-bold text-gray-800 border-b pb-3 mb-4">
              <History className="w-4 h-4 text-gray-500" />
              <span>Lịch sử cập nhật trạng thái</span>
            </div>

            {data.statusHistory && data.statusHistory.length > 0 ? (
              <div className="space-y-4 relative pl-4 before:absolute before:left-1.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-gray-200">
                {data.statusHistory.map((item, index) => (
                  <div key={index} className="relative text-xs">
                    <span className="absolute -left-4 top-1 w-2.5 h-2.5 rounded-full bg-emerald-500 ring-4 ring-white" />
                    <div className="flex items-center justify-between">
                      <p className="font-semibold text-gray-800">
                        {item.oldStatus ? `${item.oldStatus} → ${item.newStatus}` : item.newStatus}
                      </p>
                      <span className="text-[10px] text-gray-400">
                        {new Date(item.changedAt).toLocaleString('vi-VN')}
                      </span>
                    </div>
                    {item.changedBy && (
                      <p className="text-[11px] text-gray-500 mt-0.5">Người thực hiện: {item.changedBy}</p>
                    )}
                    {item.changeReason && (
                      <p className="text-[11px] text-gray-600 bg-gray-50 p-2 rounded mt-1 italic">
                        "{item.changeReason}"
                      </p>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-gray-500 text-center py-4">Chưa có lịch sử thay đổi trạng thái.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default BatchStatusDetailPage;