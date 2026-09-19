import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router';
import {
  ArrowLeft,
  Pencil,
  FileText,
  CheckCircle2,
  Clock,
  FlaskConical,
  PackageCheck,
  Building2,
  Paperclip,
  Loader2,
  AlertCircle,
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

  // Các bước Stepper
  const steps = [
    { key: 'DECLARED', label: 'Đã khai báo', icon: CheckCircle2 },
    { key: 'PENDING_APPROVAL', label: 'Chờ phê duyệt', icon: Clock },
    { key: 'PENDING_QC', label: 'Chờ kiểm định QC', icon: Clock },
    { key: 'INSPECTED', label: 'Đã kiểm định', icon: FlaskConical },
    { key: 'APPROVED', label: 'Đã duyệt / Từ chối', icon: CheckCircle2 },
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
            onClick={() => navigate(`/supplier/batches/${id}/edit`)}
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

      {/* Stepper 進 trình xử lý */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
        <h2 className="text-xs font-bold text-gray-800 uppercase tracking-wider mb-6">
          Tiến trình xử lý
        </h2>
        <div className="flex items-center justify-between relative px-4">
          <div className="absolute top-1/2 left-8 right-8 h-0.5 bg-gray-200 -translate-y-1/2 z-0" />
          {steps.map((step, idx) => {
            const Icon = step.icon;
            const isCompleted = idx <= 2; // Ví dụ trạng thái hiện tại
            return (
              <div key={step.key} className="relative z-10 flex flex-col items-center">
                <div
                  className={`w-9 h-9 rounded-full flex items-center justify-center border-2 transition ${
                    isCompleted
                      ? 'bg-emerald-50 border-emerald-500 text-emerald-600'
                      : 'bg-white border-gray-300 text-gray-400'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                </div>
                <span className="text-[11px] font-medium text-gray-600 mt-2 text-center">
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
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-700 uppercase">
              ĐANG XỬ LÝ
            </span>
          </div>

          <div className="space-y-3 text-xs">
            <div>
              <p className="text-[10px] text-gray-400 uppercase font-semibold">TÊN SẢN PHẨM</p>
              <p className="font-bold text-gray-800 text-sm mt-0.5">{data.productName}</p>
            </div>
            <div>
              <p className="text-[10px] text-gray-400 uppercase font-semibold">GIỐNG / PHÂN LOẠI SẢN PHẨM</p>
              <p className="text-gray-700 mt-0.5">{data.cropTypeName}</p>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <p className="text-[10px] text-gray-400 uppercase font-semibold">SỐ LƯỢNG</p>
                <p className="font-bold text-gray-900 mt-0.5">
                  {data.declaredQuantity.toLocaleString()} {data.unit}
                </p>
              </div>
              <div>
                <p className="text-[10px] text-gray-400 uppercase font-semibold">NGUỒN GỐC</p>
                <p className="text-gray-700 mt-0.5">{data.origin}</p>
              </div>
            </div>
            <div>
              <p className="text-[10px] text-gray-400 uppercase font-semibold">NGÀY THU HOẠCH</p>
              <p className="text-gray-700 mt-0.5">{data.harvestDate}</p>
            </div>
          </div>
        </div>

        {/* Cột phải: Thông tin NCC & Kết quả QC */}
        <div className="lg:col-span-2 space-y-6">
          {/* Thông tin nhà cung cấp */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
            <div className="flex items-center gap-2 text-xs font-bold text-gray-800 border-b pb-3 mb-3">
              <Building2 className="w-4 h-4 text-gray-500" />
              <span>Thông tin nhà cung cấp</span>
            </div>
            <div className="grid grid-cols-3 text-xs">
              <div>
                <span className="text-gray-400">Tên nhà CC:</span>
                <p className="font-medium text-gray-800 mt-1">HTX Nông Nghiệp Cầu Đất</p>
              </div>
              <div>
                <span className="text-gray-400">Mã số thuế:</span>
                <p className="font-medium text-gray-800 mt-1">0312345678</p>
              </div>
              <div>
                <span className="text-gray-400">Xếp hạng tin nhiệm:</span>
                <p className="font-bold text-emerald-600 mt-1">Hạng A</p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Bảng Kết quả QC sơ bộ */}
            <div className="md:col-span-2 bg-white rounded-xl border border-gray-200 shadow-sm p-5">
              <div className="flex items-center justify-between border-b pb-3 mb-3">
                <span className="text-xs font-bold text-gray-800">Kết quả QC sơ bộ</span>
                <span className="text-[10px] bg-gray-100 text-gray-600 px-2 py-0.5 rounded font-medium">
                  Vòng 1
                </span>
              </div>
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="text-[10px] text-gray-400 border-b uppercase">
                    <th className="pb-2">CHỈ TIÊU</th>
                    <th className="pb-2">KẾT QUẢ</th>
                    <th className="pb-2">ĐÁNH GIÁ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  <tr>
                    <td className="py-2 text-gray-700">Tỷ lệ hạt đen/vỡ</td>
                    <td className="py-2 font-medium">1.2%</td>
                    <td className="py-2">
                      <span className="bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded text-[10px] font-bold">
                        Đạt
                      </span>
                    </td>
                  </tr>
                  <tr>
                    <td className="py-2 text-gray-700">Độ ẩm đo thực tế</td>
                    <td className="py-2 font-medium">14.5%</td>
                    <td className="py-2">
                      <span className="bg-amber-50 text-amber-700 px-2 py-0.5 rounded text-[10px] font-bold">
                        Chờ xử lý
                      </span>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Tài liệu đính kèm */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
              <div className="flex items-center gap-2 text-xs font-bold text-gray-800 border-b pb-3 mb-3">
                <Paperclip className="w-4 h-4 text-gray-500" />
                <span>Tài liệu đính kèm</span>
              </div>
              <div className="space-y-2 text-xs">
                <div className="flex items-center justify-between p-2 hover:bg-gray-50 rounded border border-gray-100 cursor-pointer">
                  <span className="text-gray-700 truncate">Giấy chứng nhận xuất xứ</span>
                  <FileText className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                </div>
                <div className="flex items-center justify-between p-2 hover:bg-gray-50 rounded border border-gray-100 cursor-pointer">
                  <span className="text-gray-700 truncate">Ảnh chụp lô hàng</span>
                  <FileText className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BatchStatusDetailPage;