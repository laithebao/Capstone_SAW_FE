import React, { useEffect, useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router';
import { useForm, type SubmitHandler, type Resolver } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  Info,
  Truck,
  FileText,
  History,
  CheckCircle2,
  MapPin,
  Loader2,
  AlertCircle,
} from 'lucide-react';
import {
  updateBatchSchema,
  type UpdateBatchFormValues,
} from '@/features/supplier/schemas/supplierBatchSchema';
import { supplierBatchService } from '@/services/suppliers/supplierBatchService';
import { supplierService } from '@/services/suppliers/supplierService';
import type { SupplierGrowingAreaDto, SupplierCropTypeDto } from '@/types/supplier';

export const EditBatchPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [loading, setLoading] = useState<boolean>(true);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [batchCode, setBatchCode] = useState<string>('');

  // States danh sách Cây trồng & Vùng trồng
  const [cropTypeOptions, setCropTypeOptions] = useState<SupplierCropTypeDto[]>([]);
  const [growingAreas, setGrowingAreas] = useState<SupplierGrowingAreaDto[]>([]);
  const [isLoadingAreas, setIsLoadingAreas] = useState<boolean>(true);

  // State quản lý Category đang chọn cho Dropdown 1
  const [selectedCategory, setSelectedCategory] = useState<string>('');

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<UpdateBatchFormValues>({
    resolver: zodResolver(updateBatchSchema) as Resolver<UpdateBatchFormValues>,
  });

  const currentCropTypeId = watch('cropTypeId');

  useEffect(() => {
    if (!id) return;
    const fetchDetailAndProfile = async () => {
      try {
        setLoading(true);
        setIsLoadingAreas(true);

        const [statusResponse, profile, allCrops] = await Promise.all([
          supplierBatchService.getBatchStatus(Number(id)),
          supplierService.getMyProfile().catch(() => null),
          supplierService.getCropTypes().catch(() => []),
        ]);

        const data = statusResponse.data;
        setBatchCode(data.batchCode);

        // 1. Tải danh sách cây trồng
        let crops: SupplierCropTypeDto[] = [];
        if (profile && Array.isArray(profile.cropTypes) && profile.cropTypes.length > 0) {
          crops = profile.cropTypes;
        } else {
          crops = allCrops;
        }
        setCropTypeOptions(crops);

        // Tìm CropType khớp với dữ liệu lô hàng hiện tại
        const matchedCrop = crops.find(
          (c) => c.cropName === data.cropTypeName || Number(c.cropTypeId) === Number((data as any).cropTypeId)
        );

        let initialCat = '';
        let initialCropId = 0;

        if (matchedCrop) {
          initialCat = matchedCrop.categoryName || 'Nông sản khác';
          initialCropId = Number(matchedCrop.cropTypeId);
        } else if (crops.length > 0) {
          initialCat = crops[0].categoryName || 'Nông sản khác';
          initialCropId = Number(crops[0].cropTypeId);
        }

        setSelectedCategory(initialCat);

        // 2. Tải danh sách vùng trồng
        let userAreas: SupplierGrowingAreaDto[] = [];
        if (profile && profile.growingAreas && profile.growingAreas.length > 0) {
          userAreas = profile.growingAreas;
        } else {
          userAreas = await supplierService.getGrowingAreas();
        }
        setGrowingAreas(userAreas);

        const matchedArea = userAreas.find(
          (a) => a.areaName === data.areaName || (a.province === data.province && a.district === data.district)
        );
        const selectedAreaId = matchedArea ? matchedArea.growingAreaId : userAreas[0]?.growingAreaId || 1;

        // 3. Fill data vào Form
        reset({
          cropTypeId: initialCropId,
          productName: data.productName,
          growingAreaId: selectedAreaId,
          declaredQuantity: data.declaredQuantity,
          unit: data.unit || 'Kg',
          harvestDate: data.harvestDate,
          expectedDeliveryDate: data.expectedDeliveryDate || '',
          note: data.warehouseNote || '',
        });
      } catch (err: any) {
        setSubmitError('Không thể tải thông tin lô hàng.');
      } finally {
        setLoading(false);
        setIsLoadingAreas(false);
      }
    };

    fetchDetailAndProfile();
  }, [id, reset]);

  // Unique Categories cho Dropdown 1
  const categories = useMemo(() => {
    const setCat = new Set<string>();
    cropTypeOptions.forEach((c) => {
      setCat.add(c.categoryName || 'Nông sản khác');
    });
    return Array.from(setCat);
  }, [cropTypeOptions]);

  // Danh sách cây trồng thuộc Category đang chọn cho Dropdown 2
  const filteredCropTypes = useMemo(() => {
    if (!selectedCategory) return cropTypeOptions;
    return cropTypeOptions.filter(
      (c) => (c.categoryName || 'Nông sản khác') === selectedCategory
    );
  }, [cropTypeOptions, selectedCategory]);

  // Khi chọn Category mới ở Dropdown 1
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

  // Khi chọn CropType mới ở Dropdown 2
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

  const onSubmit: SubmitHandler<UpdateBatchFormValues> = async (values) => {
    if (!id) return;
    setIsSubmitting(true);
    setSubmitError(null);

    try {
      await supplierBatchService.updateBatch(Number(id), values);
      navigate(`/supplier/batches/${id}/status`);
    } catch (err: any) {
      setSubmitError(
        err.response?.data?.message || 'Chỉnh sửa thất bại. Vui lòng kiểm tra lại.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50/50 p-6 max-w-6xl mx-auto">
      <form onSubmit={handleSubmit(onSubmit)}>
        {/* Header Bar */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <div className="flex items-center gap-2 text-xs text-gray-500 mb-1">
              <span>SAW System</span>
              <span>&gt;</span>
              <span>Quản lý lô sản phẩm</span>
              <span>&gt;</span>
              <span className="font-semibold text-gray-700">Chỉnh sửa thông tin lô hàng</span>
            </div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-gray-900">Chỉnh sửa thông tin lô hàng</h1>
              <span className="text-xs bg-gray-100 text-gray-700 px-2.5 py-1 rounded font-mono font-semibold">
                Lô hàng #{batchCode}
              </span>
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                Đã gửi / Chờ nhận
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => navigate(`/supplier/batches/${id}/status`)}
              className="bg-white hover:bg-gray-50 text-gray-700 font-medium px-4 py-2 rounded-lg border border-gray-300 text-xs flex items-center gap-1.5 shadow-sm cursor-pointer"
            >
              <History className="w-3.5 h-3.5" />
              <span>Lịch sử</span>
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="bg-zinc-800 hover:bg-zinc-900 text-white font-medium px-5 py-2 rounded-lg text-xs flex items-center gap-2 shadow-sm disabled:opacity-50 cursor-pointer"
            >
              {isSubmitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              <span>Lưu thay đổi</span>
            </button>
          </div>
        </div>

        {submitError && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{submitError}</span>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Cột trái: Form nhập liệu */}
          <div className="lg:col-span-2 space-y-6">
            {/* Card 1: Thông tin cơ bản */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
              <div className="flex items-center gap-2 text-xs font-bold text-gray-800 border-b pb-3 mb-4">
                <Info className="w-4 h-4 text-gray-500" />
                <span>1. Thông tin cơ bản</span>
              </div>

              <div className="space-y-4">
                {/* DROPDOWN LIÊN HOÀN 2 CỘT */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* DROPDOWN 1: DANH MỤC NÔNG SẢN */}
                  <div>
                    <label className="block text-[11px] font-semibold text-gray-600 uppercase mb-1">
                      LOẠI NÔNG SẢN <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={selectedCategory}
                      onChange={handleCategoryChange}
                      className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-xs text-gray-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer"
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
                      className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-xs text-gray-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 disabled:opacity-60 cursor-pointer"
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

                {/* TÊN SẢN PHẨM */}
                <div>
                  <label className="block text-[11px] font-semibold text-gray-600 uppercase mb-1">
                    TÊN SẢN PHẨM <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    {...register('productName')}
                    className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-xs text-gray-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                  {errors.productName && (
                    <p className="text-[11px] text-red-500 mt-1">{errors.productName.message}</p>
                  )}
                </div>

                {/* VÙNG TRỒNG (Dropdown) */}
                <div>
                  <label className="block text-[11px] font-semibold text-gray-600 uppercase mb-1">
                    VÙNG TRỒNG / TRANG TRẠI <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <MapPin className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 z-10" />
                    <select
                      {...register('growingAreaId', { valueAsNumber: true })}
                      disabled={isLoadingAreas}
                      className="w-full bg-gray-50 border border-gray-200 rounded-lg pl-9 pr-3 py-2 text-xs text-gray-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 disabled:opacity-60 cursor-pointer"
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
              <div className="flex items-center gap-2 text-xs font-bold text-gray-800 border-b pb-3 mb-4">
                <Truck className="w-4 h-4 text-gray-500" />
                <span>2. Khối lượng & Vận chuyển</span>
              </div>

              <div className="space-y-4">
                <div className="grid grid-cols-3 gap-3">
                  <div className="col-span-2">
                    <label className="block text-[11px] font-semibold text-gray-600 uppercase mb-1">
                      KHỐI LƯỢNG KHAI BÁO <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      {...register('declaredQuantity', { valueAsNumber: true })}
                      className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-xs text-gray-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-gray-600 uppercase mb-1">
                      ĐƠN VỊ
                    </label>
                    <select
                      {...register('unit')}
                      className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-xs text-gray-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    >
                      <option value="kg">kg</option>
                      <option value="Tấn">Tấn</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[11px] font-semibold text-gray-600 uppercase mb-1">
                      NGÀY THU HOẠCH
                    </label>
                    <input
                      type="date"
                      {...register('harvestDate')}
                      className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-xs text-gray-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-gray-600 uppercase mb-1">
                      NGÀY GIAO HÀNG DỰ KIẾN <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="date"
                      {...register('expectedDeliveryDate')}
                      className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-xs text-gray-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Card 3: Ghi chú */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
              <div className="flex items-center gap-2 text-xs font-bold text-gray-800 border-b pb-3 mb-4">
                <FileText className="w-4 h-4 text-gray-500" />
                <span>3. Ghi chú & Tài liệu đính kèm</span>
              </div>
              <textarea
                rows={3}
                {...register('note')}
                placeholder="Ghi chú cho kho nhận..."
                className="w-full bg-gray-50 border border-gray-200 rounded-lg p-3 text-xs text-gray-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </div>

          {/* Cột phải: Panel Tóm tắt & Bản đồ */}
          <div className="space-y-6">
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 space-y-3 text-xs">
              <h3 className="font-bold text-gray-900 border-b pb-2">Tóm tắt lô hàng</h3>
              <div className="flex justify-between">
                <span className="text-gray-500">Mã lô:</span>
                <span className="font-mono font-semibold">{batchCode}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Tạo ngày:</span>
                <span>24/10/2023 08:30</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Cập nhật cuối:</span>
                <span>25/10/2023 14:15</span>
              </div>

              <div className="p-3 bg-emerald-50/60 border border-emerald-100 rounded-lg text-emerald-800 text-[11px] flex gap-2 mt-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <span>
                  Thông tin này có thể được chỉnh sửa cho đến khi kho bắt đầu quá trình nhận hàng.
                </span>
              </div>
            </div>

            {/* Bản đồ vị trí xuất phát */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
              <div className="h-40 bg-blue-50 flex items-center justify-center text-gray-400 text-xs border-b">
                <span>[ Map Preview ]</span>
              </div>
              <div className="p-3 text-[11px] text-gray-600 flex items-center gap-1.5 font-medium">
                <MapPin className="w-3.5 h-3.5 text-emerald-600" />
                <span>Vị trí xuất phát ước tính</span>
              </div>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
};

export default EditBatchPage;