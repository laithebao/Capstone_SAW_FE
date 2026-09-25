import React, { useState, useEffect, useMemo } from 'react';
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
  MessageSquare,
} from 'lucide-react';
import {
  declareBatchSchema,
  type DeclareBatchFormValues,
} from '@/features/supplier/schemas/supplierBatchSchema';
import { supplierBatchService } from '@/services/suppliers/supplierBatchService';
import { supplierService } from '@/services/suppliers/supplierService';
import type { SupplierGrowingAreaDto, SupplierCropTypeDto } from '@/types/supplier';

export const DeclareBatchPage: React.FC = () => {
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);

  // State lưu danh sách cây trồng & vùng trồng của Supplier
  const [cropTypeOptions, setCropTypeOptions] = useState<SupplierCropTypeDto[]>([]);
  const [growingAreas, setGrowingAreas] = useState<SupplierGrowingAreaDto[]>([]);
  const [isLoadingAreas, setIsLoadingAreas] = useState<boolean>(true);

  // State quản lý Category đang chọn ở Dropdown Loại nông sản
  const [selectedCategory, setSelectedCategory] = useState<string>('');

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<DeclareBatchFormValues>({
    resolver: zodResolver(declareBatchSchema) as Resolver<DeclareBatchFormValues>,
    defaultValues: {
      unit: 'Tấn',
      cropTypeId: 0,
      productName: '',
      note: '',
    },
  });

  const currentCropTypeId = watch('cropTypeId');

  // Fetch danh sách vùng trồng & cây trồng từ hệ thống
  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        setIsLoadingAreas(true);
        const [profile, allCrops] = await Promise.all([
          supplierService.getMyProfile().catch(() => null),
          supplierService.getCropTypes().catch(() => []),
        ]);

        // 1. Lấy danh sách cây trồng
        let crops: SupplierCropTypeDto[] = [];
        if (profile && Array.isArray(profile.cropTypes) && profile.cropTypes.length > 0) {
          crops = profile.cropTypes;
        } else {
          crops = allCrops;
        }
        setCropTypeOptions(crops);

        if (crops.length > 0) {
          const firstCat = crops[0].categoryName || 'Nông sản khác';
          setSelectedCategory(firstCat);

          const firstCropInCat = crops.find(
            (c) => (c.categoryName || 'Nông sản khác') === firstCat
          );
          if (firstCropInCat) {
            setValue('cropTypeId', Number(firstCropInCat.cropTypeId));
            setValue('productName', firstCropInCat.cropName);
          }
        }

        // 2. Lấy danh sách vùng trồng
        if (profile && Array.isArray(profile.growingAreas) && profile.growingAreas.length > 0) {
          setGrowingAreas(profile.growingAreas);
          setValue('growingAreaId', profile.growingAreas[0].growingAreaId);
        } else {
          const fallbackAreas = await supplierService.getGrowingAreas();
          setGrowingAreas(fallbackAreas);
          if (fallbackAreas.length > 0) {
            setValue('growingAreaId', fallbackAreas[0].growingAreaId);
          }
        }
      } catch (error) {
        console.error('Lỗi khi tải dữ liệu khởi tạo:', error);
      } finally {
        setIsLoadingAreas(false);
      }
    };

    fetchInitialData();
  }, [setValue]);

  // Lọc ra các Category không trùng lặp cho Dropdown "LOẠI NÔNG SẢN"
  const categories = useMemo(() => {
    const setCat = new Set<string>();
    cropTypeOptions.forEach((c) => {
      setCat.add(c.categoryName || 'Nông sản khác');
    });
    return Array.from(setCat);
  }, [cropTypeOptions]);

  // Lọc ra danh sách cây trồng thuộc Category đang chọn cho Dropdown "GIỐNG / PHÂN LOẠI SẢN PHẨM"
  const filteredCropTypes = useMemo(() => {
    if (!selectedCategory) return cropTypeOptions;
    return cropTypeOptions.filter(
      (c) => (c.categoryName || 'Nông sản khác') === selectedCategory
    );
  }, [cropTypeOptions, selectedCategory]);

  // Khi chọn Category khác ở Dropdown 1
  const handleCategoryChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newCat = e.target.value;
    setSelectedCategory(newCat);

    const firstCrop = cropTypeOptions.find(
      (c) => (c.categoryName || 'Nông sản khác') === newCat
    );

    if (firstCrop) {
      setValue('cropTypeId', Number(firstCrop.cropTypeId), { shouldValidate: true });
      setValue('productName', firstCrop.cropName, { shouldValidate: true });
    } else {
      setValue('cropTypeId', 0, { shouldValidate: true });
      setValue('productName', '', { shouldValidate: true });
    }
  };

  // Khi chọn CropType ở Dropdown 2
  const handleCropTypeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newCropId = Number(e.target.value);
    setValue('cropTypeId', newCropId, { shouldValidate: true });

    const selectedCrop = cropTypeOptions.find(
      (c) => Number(c.cropTypeId) === newCropId
    );
    if (selectedCrop) {
      setValue('productName', selectedCrop.cropName, { shouldValidate: true });
    }
  };

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
      <form onSubmit={handleSubmit(onSubmit)}>
        {/* TOP BAR */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Khai báo thông tin lô hàng
            </h1>
            <p className="text-xs text-gray-500 mt-1">
              Nhập chi tiết lô nông sản mới để theo dõi trong hệ thống.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => navigate('/supplier/batches')}
              className="bg-white hover:bg-gray-50 text-gray-700 font-medium px-4 py-2 rounded-lg border border-gray-300 text-sm transition cursor-pointer"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="bg-zinc-800 hover:bg-zinc-900 text-white font-medium px-5 py-2 rounded-lg text-sm transition flex items-center gap-2 disabled:opacity-50 cursor-pointer"
            >
              {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
              <span>Khai báo lô hàng</span>
            </button>
          </div>
        </div>

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
                {/* DROPDOWN 1: LOẠI NÔNG SẢN (DANH MỤC) */}
                <div>
                  <label className="block text-[11px] font-semibold text-gray-600 uppercase mb-1">
                    LOẠI NÔNG SẢN <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={selectedCategory}
                    onChange={handleCategoryChange}
                    className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3.5 py-2.5 text-xs text-gray-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer"
                  >
                    <option value="">Chọn loại nông sản</option>
                    {categories.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>

                {/* DROPDOWN 2: GIỐNG / PHÂN LOẠI SẢN PHẨM */}
                <div>
                  <label className="block text-[11px] font-semibold text-gray-600 uppercase mb-1">
                    GIỐNG / PHÂN LOẠI SẢN PHẨM <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={currentCropTypeId || ''}
                    onChange={handleCropTypeChange}
                    disabled={!selectedCategory}
                    className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3.5 py-2.5 text-xs text-gray-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 disabled:opacity-60 cursor-pointer"
                  >
                    <option value="">Chọn phân loại sản phẩm</option>
                    {filteredCropTypes.map((crop) => (
                      <option key={crop.cropTypeId} value={crop.cropTypeId}>
                        {crop.cropName}
                      </option>
                    ))}
                  </select>
                  {errors.cropTypeId && (
                    <p className="text-[11px] text-red-500 mt-1">
                      {errors.cropTypeId.message}
                    </p>
                  )}
                </div>
              </div>

              {/* TÊN / TÊN CHI TIẾT SẢN PHẨM */}
              <div>
                <label className="block text-[11px] font-semibold text-gray-600 uppercase mb-1">
                  TÊN SẢN PHẨM KHAI BÁO <span className="text-red-500">*</span>
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

              {/* VÙNG TRỒNG (Select growingAreaId) */}
              <div>
                <label className="block text-[11px] font-semibold text-gray-600 uppercase mb-1">
                  VÙNG TRỒNG / TRANG TRẠI <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <MapPin className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 z-10" />
                  <select
                    {...register('growingAreaId', { valueAsNumber: true })}
                    disabled={isLoadingAreas}
                    className="w-full bg-gray-50 border border-gray-200 rounded-lg pl-9 pr-3.5 py-2.5 text-xs text-gray-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 disabled:opacity-60 cursor-pointer"
                  >
                    <option value="">
                      {isLoadingAreas ? 'Đang tải vùng trồng...' : 'Chọn vùng trồng đã đăng ký'}
                    </option>
                    {growingAreas.map((area) => (
                      <option key={area.growingAreaId} value={area.growingAreaId}>
                        {area.areaName} ({[area.ward, area.district, area.province].filter(Boolean).join(', ')})
                      </option>
                    ))}
                  </select>
                </div>
                {errors.growingAreaId && (
                  <p className="text-[11px] text-red-500 mt-1">
                    {errors.growingAreaId.message}
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
                  <input
                    type="date"
                    {...register('harvestDate')}
                    className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3.5 py-2.5 text-xs text-gray-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                  {errors.harvestDate && (
                    <p className="text-[11px] text-red-500 mt-1">
                      {errors.harvestDate.message}
                    </p>
                  )}
                </div>
              </div>

              {/* NGÀY GIAO HÀNG DỰ KIẾN (Giữ lại giao diện gốc) */}
              <div>
                <label className="block text-[11px] font-semibold text-gray-600 uppercase mb-1">
                  NGÀY GIAO HÀNG DỰ KIẾN
                </label>
                <div className="relative">
                  <Calendar className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 z-10" />
                  <input
                    type="date"
                    {...register('expectedDeliveryDate')}
                    className="w-full bg-gray-50 border border-gray-200 rounded-lg pl-9 pr-3.5 py-2.5 text-xs text-gray-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              {/* MÔ TẢ / GHI CHÚ BỔ SUNG */}
              <div>
                <label className="block text-[11px] font-semibold text-gray-600 uppercase mb-1 flex items-center gap-1.5">
                  <MessageSquare className="w-3.5 h-3.5 text-gray-400" />
                  <span>MÔ TẢ / GHI CHÚ BỔ SUNG</span>
                </label>
                <textarea
                  {...register('note')}
                  rows={3}
                  placeholder="Ghi chú về điều kiện bảo quản, chất lượng sản phẩm hoặc lưu ý khi vận chuyển..."
                  className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3.5 py-2.5 text-xs text-gray-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none"
                />
              </div>
            </div>
          </div>

          {/* Card 3: Upload */}
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
                      className="text-gray-400 hover:text-red-500 p-1 cursor-pointer"
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