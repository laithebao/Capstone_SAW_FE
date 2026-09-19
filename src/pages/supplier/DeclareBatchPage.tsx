import React, { useState } from 'react';
import { useNavigate } from 'react-router';
import { useForm, type SubmitHandler, type Resolver } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  Info,
  Truck,
  Upload,
  X,
  FileText,
  Loader2,
  AlertCircle,
  MapPin,
  Calendar,
} from 'lucide-react';
import {
  declareBatchSchema,
  type DeclareBatchFormValues,
} from '@/features/supplier/schemas/supplierBatchSchema';
import { supplierBatchService } from '@/services/suppliers/supplierBatchService';

// Danh mục Nông sản mock (Có thể fetch từ API danh mục)
const CROP_TYPE_OPTIONS = [
  { id: 1, name: 'Lúa gạo' },
  { id: 2, name: 'Cà phê' },
  { id: 3, name: 'Hồ tiêu' },
  { id: 4, name: 'Rau củ quả' },
  { id: 5, name: 'Trái cây' },
];

export const DeclareBatchPage: React.FC = () => {
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<DeclareBatchFormValues>({
    resolver: zodResolver(declareBatchSchema) as Resolver<DeclareBatchFormValues>,
    defaultValues: {
      unit: 'Tấn',
      cropTypeId: 1,
    },
  });

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const filesArray = Array.from(e.target.files);
      setUploadedFiles((prev) => [...prev, ...filesArray]);
    }
  };

  const removeFile = (index: number) => {
    setUploadedFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const onSubmit: SubmitHandler<DeclareBatchFormValues> = async (values) => {
    setIsSubmitting(true);
    setSubmitError(null);

    try {
      await supplierBatchService.declareBatch(values);
      // Chuyển hướng về trang danh sách lô hàng sau khi thành công
      navigate('/supplier/batches');
    } catch (err: any) {
      setSubmitError(
        err.response?.data?.message || 'Không thể khai báo lô hàng. Vui lòng thử lại.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50/50 p-6 max-w-5xl mx-auto">
      {/* Header & Main Buttons */}
      <form onSubmit={handleSubmit(onSubmit)}>
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Khai báo thông tin lô hàng
            </h1>
            <p className="text-xs text-gray-500 mt-1">
              Nhập chi tiết lô nông sản mới để theo dõi trong hệ thống lưu kho thông minh.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => navigate('/supplier/batches')}
              className="bg-white hover:bg-gray-50 text-gray-700 font-medium px-4 py-2 rounded-lg border border-gray-300 text-sm transition"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="bg-zinc-800 hover:bg-zinc-900 text-white font-medium px-5 py-2 rounded-lg text-sm transition flex items-center gap-2 disabled:opacity-50"
            >
              {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
              <span>Khai báo lô hàng</span>
            </button>
          </div>
        </div>

        {/* Thẻ hiển thị lỗi từ Backend nếu có */}
        {submitError && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{submitError}</span>
          </div>
        )}

        <div className="space-y-6">
          {/* Card 1: Thông tin cơ bản */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
            <div className="flex items-center gap-2 mb-6 text-gray-800 font-semibold text-sm border-b pb-3">
              <Info className="w-4 h-4 text-gray-600" />
              <span>Thông tin cơ bản</span>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Loại nông sản */}
                <div>
                  <label className="block text-[11px] font-semibold text-gray-600 uppercase mb-1">
                    LOẠI NÔNG SẢN <span className="text-red-500">*</span>
                  </label>
                  <select
                    {...register('cropTypeId', { valueAsNumber: true })}
                    className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3.5 py-2.5 text-xs text-gray-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="">Chọn loại nông sản</option>
                    {CROP_TYPE_OPTIONS.map((crop) => (
                      <option key={crop.id} value={crop.id}>
                        {crop.name}
                      </option>
                    ))}
                  </select>
                  {errors.cropTypeId && (
                    <p className="text-[11px] text-red-500 mt-1">
                      {errors.cropTypeId.message}
                    </p>
                  )}
                </div>

                {/* Giống / Phân loại sản phẩm */}
                <div>
                  <label className="block text-[11px] font-semibold text-gray-600 uppercase mb-1">
                    GIỐNG / PHÂN LOẠI SẢN PHẨM <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    {...register('productName')}
                    placeholder="Ví dụ: Gạo ST25, xoài cát Hòa Lộc..."
                    className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3.5 py-2.5 text-xs text-gray-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                  {errors.productName && (
                    <p className="text-[11px] text-red-500 mt-1">
                      {errors.productName.message}
                    </p>
                  )}
                </div>
              </div>

              {/* Vùng trồng / Trang trại */}
              <div>
                <label className="block text-[11px] font-semibold text-gray-600 uppercase mb-1">
                  VÙNG TRỒNG / TRANG TRẠI <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <MapPin className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    {...register('origin')}
                    placeholder="Ví dụ: Nông trường Mộc Châu, Sơn La"
                    className="w-full bg-gray-50 border border-gray-200 rounded-lg pl-9 pr-3.5 py-2.5 text-xs text-gray-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                {errors.origin && (
                  <p className="text-[11px] text-red-500 mt-1">
                    {errors.origin.message}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Card 2: Khối lượng & Vận chuyển */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
            <div className="flex items-center gap-2 mb-6 text-gray-800 font-semibold text-sm border-b pb-3">
              <Truck className="w-4 h-4 text-gray-600" />
              <span>Khối lượng & Vận chuyển</span>
            </div>

            <div className="space-y-4">
              {/* Số lượng khai báo */}
              <div>
                <label className="block text-[11px] font-semibold text-gray-600 uppercase mb-1">
                  SỐ LƯỢNG KHAI BÁO <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  step="0.01"
                  {...register('declaredQuantity', { valueAsNumber: true })}
                  placeholder="0.00"
                  className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3.5 py-2.5 text-xs text-gray-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
                {errors.declaredQuantity && (
                  <p className="text-[11px] text-red-500 mt-1">
                    {errors.declaredQuantity.message}
                  </p>
                )}
              </div>

              {/* Quy cách đóng gói & Số kiện */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-semibold text-gray-600 uppercase mb-1">
                    QUY CÁCH ĐÓNG GÓI
                  </label>
                  <input
                    type="text"
                    {...register('packagingType')}
                    placeholder="Ví dụ: Bao 25kg, thùng 10kg..."
                    className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3.5 py-2.5 text-xs text-gray-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-gray-600 uppercase mb-1">
                    SỐ KIỆN / SỐ BAO
                  </label>
                  <input
                    type="number"
                    {...register('packageCount', { valueAsNumber: true })}
                    placeholder="Nhập số lượng..."
                    className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3.5 py-2.5 text-xs text-gray-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              {/* Đơn vị & Ngày thu hoạch */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-semibold text-gray-600 uppercase mb-1">
                    ĐƠN VỊ <span className="text-red-500">*</span>
                  </label>
                  <select
                    {...register('unit')}
                    className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3.5 py-2.5 text-xs text-gray-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="Tấn">Tấn</option>
                    <option value="Kg">Kg</option>
                    <option value="Bao">Bao</option>
                    <option value="Thùng">Thùng</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-gray-600 uppercase mb-1">
                    NGÀY THU HOẠCH <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type="date"
                      {...register('harvestDate')}
                      className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3.5 py-2.5 text-xs text-gray-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                  {errors.harvestDate && (
                    <p className="text-[11px] text-red-500 mt-1">
                      {errors.harvestDate.message}
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Card 3: Upload hình ảnh hoặc tài liệu */}
          <div className="bg-white rounded-xl border border-dashed border-gray-300 p-8 text-center bg-gray-50/30">
            <label className="cursor-pointer flex flex-col items-center justify-center">
              <div className="w-12 h-12 bg-gray-100 rounded-xl flex items-center justify-center mb-3">
                <Upload className="w-6 h-6 text-gray-500" />
              </div>
              <p className="text-sm font-semibold text-gray-800">
                Tải lên hình ảnh hoặc tài liệu
              </p>
              <p className="text-xs text-gray-500 mt-1">
                Kéo thả file vào đây hoặc nhấp để duyệt. Hỗ trợ JPG, PNG, PDF (Tối đa 10MB/file).
              </p>
              <input
                type="file"
                multiple
                onChange={handleFileUpload}
                accept=".jpg,.jpeg,.png,.pdf"
                className="hidden"
              />
            </label>

            {/* Danh sách file đã chọn */}
            {uploadedFiles.length > 0 && (
              <div className="mt-4 border-t border-gray-200 pt-4 text-left max-w-md mx-auto space-y-2">
                <p className="text-[11px] font-semibold text-gray-500 uppercase">
                  TẬP TIN ĐÃ CHỌN:
                </p>
                {uploadedFiles.map((file, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between p-2 bg-white rounded-lg border border-gray-200 text-xs text-gray-700"
                  >
                    <div className="flex items-center gap-2 truncate">
                      <FileText className="w-4 h-4 text-gray-400 shrink-0" />
                      <span className="truncate">{file.name}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeFile(idx)}
                      className="text-gray-400 hover:text-red-500 p-1"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </form>
    </div>
  );
};

export default DeclareBatchPage;