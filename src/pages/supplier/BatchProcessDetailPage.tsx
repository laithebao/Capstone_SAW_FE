import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router';
import {
  ArrowLeft,
  XCircle,
  Clock,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Package,
  FileText,
  Info,
} from 'lucide-react';
import { supplierBatchService } from '@/services/suppliers/supplierBatchService';
import type { SupplierBatchStatusResponse } from '@/types/supplierBatch';

export const BatchProcessDetailPage: React.FC = () => {
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
        setError(err.response?.data?.message || 'Không thể tải thông tin tiến trình đơn hàng.');
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
          className="mt-4 px-4 py-2 bg-zinc-800 text-white rounded-lg text-xs font-medium"
        >
          Quay lại danh sách
        </button>
      </div>
    );
  }

  // Khai báo các bước tiến trình chuẩn UI
  const processSteps = [
    {
      statusKey: 'SUBMITTED',
      title: 'Đã tạo đơn',
      description: 'Hệ thống tự động ghi nhận đơn hàng từ NPP.',
    },
    {
      statusKey: 'PENDING_APPROVAL',
      title: 'Chờ duyệt',
      description: 'Đang chờ Quản lý khu vực phê duyệt.',
    },
    {
      statusKey: 'APPROVED',
      title: 'Đã duyệt / Bị từ chối',
      description: 'Kết quả phê duyệt từ cấp quản lý.',
    },
    {
      statusKey: 'PREPARING',
      title: 'Đang chuẩn bị',
      description: 'Sản phẩm đang được đóng gói và chuẩn bị giao.',
    },
    {
      statusKey: 'DELIVERED',
      title: 'Đã giao',
      description: 'Đơn hàng đã giao thành công đến điểm nhận.',
    },
  ];

  return (
    <div className="min-h-screen bg-gray-50/60 p-6 max-w-7xl mx-auto space-y-6">
      {/* Header Bar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate(-1)}
            className="p-1.5 hover:bg-gray-200/70 rounded-lg text-gray-600 transition"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <div className="flex items-center gap-2 text-xs text-gray-500 mb-0.5">
              <span>Quản lý đơn đặt hàng</span>
              <span>&gt;</span>
              <span className="text-gray-700">Chi tiết đơn đặt hàng</span>
            </div>
            <h1 className="text-xl font-bold text-gray-900">
              Đơn hàng #{data.batchCode}
            </h1>
          </div>
        </div>

        {/* Action button bên phải */}
        <button
          onClick={() => {}}
          className="px-4 py-1.5 border border-red-200 text-red-600 bg-red-50/50 hover:bg-red-100/80 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition"
        >
          <XCircle className="w-4 h-4 text-red-500" />
          <span>Hủy đơn</span>
        </button>
      </div>

      {/* Grid Bố cục 2 Cột chuẩn Figma */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* CỘT TRÁI (2/3) */}
        <div className="lg:col-span-2 space-y-6">
          {/* Card 1: Tóm tắt đơn hàng */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 relative">
            <div className="flex items-center gap-2 text-sm font-bold text-gray-800 mb-6">
              <FileText className="w-4 h-4 text-gray-500" />
              <span>Tóm tắt đơn hàng</span>
            </div>

            {/* Status Badge ở góc trên phải */}
            <div className="absolute top-6 right-6">
              <span className="px-3 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-700">
                {data.statusDisplayName || data.currentStatus}
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-y-4 gap-x-6 text-xs">
              <div>
                <p className="text-[10px] text-gray-400 uppercase font-bold tracking-wider">
                  MÃ ĐƠN HÀNG
                </p>
                <p className="font-bold text-gray-800 text-sm mt-1">{data.batchCode}</p>
              </div>

              <div>
                <p className="text-[10px] text-gray-400 uppercase font-bold tracking-wider">
                  NGÀY TẠO
                </p>
                <p className="text-gray-700 font-medium mt-1">
                  {new Date(data.createdAt).toLocaleString('vi-VN', {
                    day: '2-digit',
                    month: '2-digit',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </p>
              </div>

              <div>
                <p className="text-[10px] text-gray-400 uppercase font-bold tracking-wider">
                  NGÀY GIAO DỰ KIẾN
                </p>
                <p className="text-emerald-600 font-bold mt-1">
                  {data.expectedDeliveryDate || '28/10/2023'}
                </p>
              </div>

              <div>
                <p className="text-[10px] text-gray-400 uppercase font-bold tracking-wider">
                  TỔNG SỐ LƯỢNG
                </p>
                <p className="font-bold text-gray-900 text-sm mt-1">
                  {data.declaredQuantity.toLocaleString()} {data.unit || 'BAO'}
                </p>
              </div>

              <div className="md:col-span-2">
                <p className="text-[10px] text-gray-400 uppercase font-bold tracking-wider">
                  KHO XỬ LÝ
                </p>
                <p className="text-gray-700 font-medium mt-1">
                  {data.origin || 'Kho Tổng Miền Nam (SGN-01)'}
                </p>
              </div>
            </div>
          </div>

          {/* Card 2: Thông tin sản phẩm */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
            <div className="flex items-center gap-2 text-sm font-bold text-gray-800 mb-4">
              <Package className="w-4 h-4 text-gray-500" />
              <span>Thông tin sản phẩm</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="text-[10px] text-gray-400 uppercase border-b border-gray-100">
                    <th className="pb-3 font-semibold w-12">STT</th>
                    <th className="pb-3 font-semibold">SẢN PHẨM</th>
                    <th className="pb-3 font-semibold">SKU</th>
                    <th className="pb-3 font-semibold text-right">SỐ LƯỢNG</th>
                    <th className="pb-3 font-semibold text-right pr-2">ĐƠN VỊ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  <tr className="hover:bg-gray-50/50">
                    <td className="py-3.5 font-medium text-gray-500">01</td>
                    <td className="py-3.5 font-bold text-gray-800">{data.productName}</td>
                    <td className="py-3.5 text-gray-500 font-mono text-[11px]">
                      {data.cropTypeName || 'RICE-ST25-50'}
                    </td>
                    <td className="py-3.5 font-bold text-gray-900 text-right">
                      {data.declaredQuantity.toLocaleString()}
                    </td>
                    <td className="py-3.5 text-gray-600 text-right pr-2">{data.unit || 'Bao'}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* CỘT PHẢI (1/3) */}
        <div className="space-y-6">
          {/* Card 1: Tiến trình xử lý (Vertical Stepper) */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
            <div className="flex items-center gap-2 text-sm font-bold text-gray-800 mb-6">
              <Clock className="w-4 h-4 text-gray-500" />
              <span>Tiến trình xử lý</span>
            </div>

            <div className="relative pl-6 space-y-6 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-gray-200">
              {processSteps.map((step) => {
                const historyMatch = data.statusHistory?.find(
                  (h) => h.newStatus === step.statusKey
                );
                const isCurrent = data.currentStatus === step.statusKey;
                const isPassed = !!historyMatch || isCurrent;

                return (
                  <div key={step.statusKey} className="relative text-xs">
                    {/* Stepper Dot/Check */}
                    <div
                      className={`absolute -left-6 top-0.5 w-5 h-5 rounded-full flex items-center justify-center border transition-all ${
                        isCurrent
                          ? 'bg-zinc-800 border-zinc-900 text-white ring-4 ring-gray-100'
                          : isPassed
                          ? 'bg-emerald-500 border-emerald-500 text-white'
                          : 'bg-white border-gray-300 text-gray-300'
                      }`}
                    >
                      <CheckCircle2 className="w-3 h-3" />
                    </div>

                    <div>
                      <p className={`font-bold ${isPassed ? 'text-gray-900' : 'text-gray-400'}`}>
                        {step.title}
                      </p>

                      {historyMatch && (
                        <p className="text-[10px] text-gray-400 mt-0.5">
                          {new Date(historyMatch.changedAt).toLocaleString('vi-VN', {
                            day: '2-digit',
                            month: '2-digit',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </p>
                      )}

                      <p className="text-[11px] text-gray-500 mt-1 leading-relaxed">
                        {step.description}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Card 2: Thông tin xử lý */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 space-y-4">
            <div className="flex items-center gap-2 text-sm font-bold text-gray-800 border-b pb-3">
              <Info className="w-4 h-4 text-gray-500" />
              <span>Thông tin xử lý</span>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <p className="text-[10px] text-gray-400 uppercase font-bold tracking-wider">
                  KẾT QUẢ DUYỆT
                </p>
                <p className="text-gray-500 italic mt-1">
                  {data.qcResult ? (
                    <span className="font-semibold text-gray-800 not-italic">{data.qcResult}</span>
                  ) : (
                    'Chưa có kết quả'
                  )}
                </p>
              </div>

              <div>
                <p className="text-[10px] text-gray-400 uppercase font-bold tracking-wider mb-1">
                  GHI CHÚ TỪ KHO
                </p>
                <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg text-gray-600 text-xs">
                  {data.warehouseNote || 'Không có ghi chú.'}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BatchProcessDetailPage;