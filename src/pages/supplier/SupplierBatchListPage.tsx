import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router';
import {
  FileCheck,
  Clock,
  FlaskConical,
  CheckCircle2,
  XCircle,
  Plus,
  Building2,
  List,
  Eye,
  Search,
  Loader2,
  ChevronLeft,
  ChevronRight,
  ArrowUpRight,
} from 'lucide-react';
import { supplierBatchService } from '@/services/suppliers/supplierBatchService';
import type {
  SupplierBatchListResponse,
  SupplierBatchItemResponse,
  SupplierBatchSummaryResponse,
} from '@/types/supplierBatch';

export const SupplierBatchListPage: React.FC = () => {
  const navigate = useNavigate();

  // State
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Pagination & Filter
  const [keyword, setKeyword] = useState<string>('');
  const [selectedStatus, setSelectedStatus] = useState<string>('');
  const [pageIndex, setPageIndex] = useState<number>(1);
  const pageSize = 10;

  const [summary, setSummary] = useState<SupplierBatchSummaryResponse>({
    totalDeclaredBatches: 0,
    pendingApprovalBatches: 0,
    pendingQCBatches: 0,
    approvedBatches: 0,
    rejectedBatches: 0,
  });

  const [batches, setBatches] = useState<SupplierBatchItemResponse[]>([]);
  const [totalPages, setTotalPages] = useState<number>(1);

  // Fetch API
  const fetchBatches = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const response: SupplierBatchListResponse =
        await supplierBatchService.getDeclaredBatches({
          keyword: keyword.trim() || undefined,
          status: selectedStatus || undefined,
          pageIndex,
          pageSize,
        });

      if (response) {
        setSummary(response.summary);
        setBatches(response.batches.items);
        setTotalPages(response.batches.totalPages || 1);
      }
    } catch (err: any) {
      setError(
        err.response?.data?.message || 'Không thể tải danh sách lô hàng.'
      );
    } finally {
      setLoading(false);
    }
  }, [keyword, selectedStatus, pageIndex]);

  useEffect(() => {
    fetchBatches();
  }, [fetchBatches]);

  // Helper render Badge Trạng thái
  const renderStatusBadge = (status: string, displayName: string) => {
    switch (status.toUpperCase()) {
      case 'SUBMITTED':
      case 'PENDING_APPROVAL':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
            {displayName || 'Chờ duyệt'}
          </span>
        );
      case 'PENDING_QC':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
            {displayName || 'Chờ kiểm định QC'}
          </span>
        );
      case 'APPROVED':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
            {displayName || 'Đã duyệt'}
          </span>
        );
      case 'REJECTED':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-red-50 text-red-700 border border-red-200">
            <span className="w-1.5 h-1.5 rounded-full bg-red-500"></span>
            {displayName || 'Bị từ chối'}
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-700 border border-gray-200">
            {displayName || status}
          </span>
        );
    }
  };

  return (
    <div className="min-h-screen bg-gray-50/50 p-6 space-y-6">
      {/* Header Chào mừng */}
      <div className="bg-white rounded-2xl p-6 border border-gray-200 shadow-sm">
        <h1 className="text-2xl font-bold text-gray-900">
          Chào mừng trở lại, Nhà cung cấp
        </h1>
        <p className="text-sm text-gray-500 mt-1">
          Dưới đây là tổng quan về trạng thái khai báo và tiến độ xử lý các lô
          hàng nông sản của bạn trong hệ thống SAW.
        </p>
      </div>

      {/* KPI Cards Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {/* Total */}
        <div className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
              Tổng lô hàng khai báo
            </span>
            <FileCheck className="w-5 h-5 text-gray-400" />
          </div>
          <div className="mt-3">
            <span className="text-2xl font-bold text-gray-900">
              {summary.totalDeclaredBatches.toLocaleString()}
            </span>
            <div className="flex items-center gap-1 text-xs text-emerald-600 font-medium mt-1">
              <ArrowUpRight className="w-3.5 h-3.5" />
              <span>+12% so với tháng trước</span>
            </div>
          </div>
        </div>

        {/* Pending Approval */}
        <div className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
              Chờ duyệt
            </span>
            <Clock className="w-5 h-5 text-amber-500" />
          </div>
          <div className="mt-3">
            <span className="text-2xl font-bold text-gray-900">
              {summary.pendingApprovalBatches}
            </span>
            <p className="text-xs text-gray-400 mt-1">Cần phản hồi từ BQL</p>
          </div>
        </div>

        {/* Pending QC */}
        <div className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
              Chờ kiểm định QC
            </span>
            <FlaskConical className="w-5 h-5 text-blue-500" />
          </div>
          <div className="mt-3">
            <span className="text-2xl font-bold text-gray-900">
              {summary.pendingQCBatches}
            </span>
            <p className="text-xs text-gray-400 mt-1">Đang lấy mẫu & xét nghiệm</p>
          </div>
        </div>

        {/* Approved */}
        <div className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
              Lô hàng đã duyệt
            </span>
            <CheckCircle2 className="w-5 h-5 text-emerald-500" />
          </div>
          <div className="mt-3">
            <span className="text-2xl font-bold text-gray-900">
              {summary.approvedBatches.toLocaleString()}
            </span>
            <p className="text-xs text-gray-400 mt-1">Đã nhập kho an toàn</p>
          </div>
        </div>

        {/* Rejected */}
        <div className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
              Lô hàng bị từ chối
            </span>
            <XCircle className="w-5 h-5 text-red-500" />
          </div>
          <div className="mt-3">
            <span className="text-2xl font-bold text-gray-900">
              {summary.rejectedBatches}
            </span>
            <p className="text-xs text-gray-400 mt-1">Không đạt chuẩn chất lượng</p>
          </div>
        </div>
      </div>

      {/* Quick Action Buttons */}
      <div className="flex flex-wrap items-center gap-3">
        <button
          onClick={() => navigate('/supplier/batches/new')}
          className="bg-zinc-800 hover:bg-zinc-900 text-white font-medium px-4 py-2.5 rounded-lg flex items-center gap-2 text-sm transition shadow-sm"
        >
          <Plus className="w-4 h-4" />
          <span>Khai báo lô hàng mới</span>
        </button>

        <button
          onClick={() => navigate('/supplier/profile/edit')}
          className="bg-white hover:bg-gray-50 text-gray-700 font-medium px-4 py-2.5 rounded-lg border border-gray-300 flex items-center gap-2 text-sm transition shadow-sm"
        >
          <Building2 className="w-4 h-4 text-gray-500" />
          <span>Cập nhật thông tin NCC</span>
        </button>

        <button
          onClick={() => {
            setSelectedStatus('');
            setKeyword('');
          }}
          className="bg-white hover:bg-gray-50 text-gray-700 font-medium px-4 py-2.5 rounded-lg border border-gray-300 flex items-center gap-2 text-sm transition shadow-sm"
        >
          <List className="w-4 h-4 text-gray-500" />
          <span>Xem toàn bộ danh sách</span>
        </button>
      </div>

      {/* Main Table Container */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        {/* Table Header & Search Filter Bar */}
        <div className="p-5 border-b border-gray-200 flex flex-col md:flex-row items-center justify-between gap-4">
          <div>
            <h2 className="text-base font-bold text-gray-900">
              Danh sách lô hàng đã khai báo
            </h2>
            <p className="text-xs text-gray-500 mt-0.5">
              Tra cứu thông tin và kiểm tra trạng thái phê duyệt các lô hàng.
            </p>
          </div>

          <div className="flex items-center gap-3 w-full md:w-auto">
            {/* Search Input */}
            <div className="relative flex-1 md:w-64">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Tìm mã lô, tên sản phẩm..."
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                className="w-full bg-gray-50 border border-gray-200 rounded-lg pl-9 pr-3 py-2 text-xs text-gray-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            {/* Filter Status */}
            <select
              value={selectedStatus}
              onChange={(e) => {
                setSelectedStatus(e.target.value);
                setPageIndex(1);
              }}
              className="bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-xs text-gray-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              <option value="">Tất cả trạng thái</option>
              <option value="SUBMITTED">Chờ duyệt</option>
              <option value="PENDING_QC">Chờ kiểm định QC</option>
              <option value="APPROVED">Đã duyệt</option>
              <option value="REJECTED">Bị từ chối</option>
            </select>
          </div>
        </div>

        {/* Error Notification */}
        {error && (
          <div className="p-4 bg-red-50 text-red-600 text-xs border-b border-red-100">
            {error}
          </div>
        )}

        {/* Table Body */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50/80 border-b border-gray-200 text-[11px] font-semibold text-gray-500 uppercase tracking-wider">
                <th className="py-3 px-4">MÃ LÔ HÀNG</th>
                <th className="py-3 px-4">TÊN SẢN PHẨM</th>
                <th className="py-3 px-4 text-right">SỐ LƯỢNG (TẤN)</th>
                <th className="py-3 px-4 text-center">NGÀY NỘP</th>
                <th className="py-3 px-4 text-center">TRẠNG THÁI HIỆN HÀNH</th>
                <th className="py-3 px-4 text-center">THAO TÁC</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-xs text-gray-700">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-gray-400">
                    <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-emerald-600" />
                    <span>Đang tải danh sách lô hàng...</span>
                  </td>
                </tr>
              ) : batches.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-gray-400">
                    Không tìm thấy lô hàng nào phù hợp.
                  </td>
                </tr>
              ) : (
                batches.map((batch) => (
                  <tr key={batch.batchId} className="hover:bg-gray-50/60 transition">
                    <td className="py-3.5 px-4 font-semibold text-gray-900">
                      {batch.batchCode}
                    </td>
                    <td className="py-3.5 px-4 font-medium text-gray-800">
                      {batch.productName}
                    </td>
                    <td className="py-3.5 px-4 text-right font-medium">
                      {batch.quantityInTons.toLocaleString('vi-VN', {
                        minimumFractionDigits: 1,
                      })}
                    </td>
                    <td className="py-3.5 px-4 text-center text-gray-500">
                      {new Date(batch.submittedDate).toLocaleDateString('vi-VN')}
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      {renderStatusBadge(batch.status, batch.statusDisplayName)}
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <button
                        onClick={() => navigate(`/supplier/batches/${batch.batchId}`)}
                        className="p-1.5 rounded-lg text-gray-500 hover:text-emerald-600 hover:bg-emerald-50 transition"
                        title="Xem chi tiết trạng thái"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        <div className="p-4 border-t border-gray-200 flex items-center justify-between text-xs text-gray-500">
          <span>
            Trang {pageIndex} / {totalPages}
          </span>
          <div className="flex items-center gap-2">
            <button
              disabled={pageIndex <= 1 || loading}
              onClick={() => setPageIndex((prev) => prev - 1)}
              className="p-1.5 border border-gray-200 rounded-md hover:bg-gray-50 disabled:opacity-40"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              disabled={pageIndex >= totalPages || loading}
              onClick={() => setPageIndex((prev) => prev + 1)}
              className="p-1.5 border border-gray-200 rounded-md hover:bg-gray-50 disabled:opacity-40"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SupplierBatchListPage;