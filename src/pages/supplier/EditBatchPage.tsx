import { SupplierBatchBreadcrumb } from '@/features/supplier/components/SupplierBatchBreadcrumb';
import { SupplierDocumentEditor } from '@/features/supplier/components/SupplierDocuments';
import type { SupplierDocumentDto } from '@/types/supplier';
import { optionalNumericInput, type DeclareBatchFormInput } from '@/features/supplier/schemas/supplierBatchSchema';
import { getAuthErrorMessage } from '@/services/authService';
import { uploadSupplierFile } from '@/features/supplier/supplierFiles';
import React, { useEffect, useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router';
import { useForm, useWatch, type SubmitHandler } from 'react-hook-form';
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
  Thermometer,
  Droplets,
  Package,
  Calendar,
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
  const [version, setVersion] = useState<{ expectedCreatedAt: string; expectedUpdatedAt: string | null } | null>(null);
  const [documents, setDocuments] = useState<SupplierDocumentDto[]>([]);
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);

  const [loading, setLoading] = useState<boolean>(true);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [batchCode, setBatchCode] = useState<string>('');
  const [batchCreatedAt, setBatchCreatedAt] = useState<string>('');

  // States danh sách Cây trồng & Vùng trồng
  const [cropTypeOptions, setCropTypeOptions] = useState<SupplierCropTypeDto[]>([]);
  const [growingAreas, setGrowingAreas] = useState<SupplierGrowingAreaDto[]>([]);
  const [isLoadingAreas, setIsLoadingAreas] = useState<boolean>(true);

  // State quản lý Category đang chọn cho Dropdown 1
  const [selectedCategory, setSelectedCategory] = useState<string>('');

  const {
    register,
    control,
    handleSubmit,
    reset,
    setValue,
    formState: { errors },
  } = useForm<DeclareBatchFormInput, unknown, UpdateBatchFormValues>({
    resolver: zodResolver(updateBatchSchema),
  });

  // Watch các field cần theo dõi realtime
  const currentUnit = useWatch({ control, name: 'unit' });
  const currentCropTypeId = useWatch({ control, name: 'cropTypeId' });
  const currentPackageCount = useWatch({ control, name: 'packageCount' });
  const currentPackageUnitWeightKg = useWatch({ control, name: 'packageUnitWeightKg' });
  const currentDeclaredQuantity = useWatch({ control, name: 'declaredQuantity' });

  // Tính tổng trọng lượng ước tính khi đóng gói theo kiện
  const estimatedWeightKg = useMemo(() => {
    if (
      (currentUnit === 'Bao' || currentUnit === 'Thùng') &&
      currentPackageCount &&
      currentPackageUnitWeightKg &&
      currentPackageCount > 0 &&
      currentPackageUnitWeightKg > 0
    ) {
      return currentPackageCount * currentPackageUnitWeightKg;
    }
    return null;
  }, [currentUnit, currentPackageCount, currentPackageUnitWeightKg]);

  // Hiển thị nhóm đóng gói kiện khi unit là Bao/Thùng
  const isPackageUnit = currentUnit === 'Bao' || currentUnit === 'Thùng';

  // Đồng bộ declaredQuantity sang packageCount khi người dùng nhập số lượng khai báo và đơn vị là kiện
  useEffect(() => {
    if (isPackageUnit) {
      if (currentDeclaredQuantity && !Number.isNaN(currentDeclaredQuantity)) {
        setValue('packageCount', currentDeclaredQuantity, { shouldValidate: true });
      } else {
        setValue('packageCount', undefined);
      }
    }
  }, [currentDeclaredQuantity, isPackageUnit, setValue]);

  useEffect(() => {
    if (!id) return;
    const fetchDetailAndProfile = async () => {
      try {
        setLoading(true);
        setIsLoadingAreas(true);

        const [statusResponse, profile] = await Promise.all([
          supplierBatchService.getBatchStatus(Number(id)),
          supplierService.getMyProfile().catch(() => null),
        ]);

        const data = statusResponse.data;

        // ĐÃ SỬA S04: CHỈ CHO PHÉP SUBMITTED MỚI ĐƯỢC CHỈNH SỬA
        const EDITABLE_STATUSES = ['SUBMITTED'];
        const currentStatusStr = data.currentStatus ? String(data.currentStatus).toUpperCase() : '';

        if (!EDITABLE_STATUSES.includes(currentStatusStr)) {
          console.warn('Hệ thống chặn vì trạng thái thực tế từ Backend là:', data.currentStatus);
          navigate(`/supplier/batches/${id}`, { replace: true });
          return;
        }

        setBatchCode(data.batchCode);
        setVersion({ expectedCreatedAt: data.createdAt, expectedUpdatedAt: data.updatedAt });
        setDocuments(data.documents ?? []);
        setBatchCreatedAt(data.createdAt);

        // 1. Tải danh sách cây trồng
        let crops: SupplierCropTypeDto[] = [];
        if (profile && Array.isArray(profile.cropTypes) && profile.cropTypes.length > 0) {
          crops = profile.cropTypes;
        } else {
          crops = [];
        }
        setCropTypeOptions(crops);

        // Tìm CropType khớp với dữ liệu lô hàng hiện tại
        const matchedCrop = crops.find(
          (c) => Number(c.cropTypeId) === data.cropTypeId
        );

        let initialCat = '';
        let initialCropId = 0;

        if (matchedCrop) {
          initialCat = matchedCrop.categoryName || 'Nông sản khác';
          initialCropId = Number(matchedCrop.cropTypeId);
        } else {
          setSubmitError('Nông sản không còn được đăng ký. Vui lòng chọn lại nông sản hợp lệ.');
        }

        setSelectedCategory(initialCat);

        // 2. Tải danh sách vùng trồng
        let userAreas: SupplierGrowingAreaDto[] = [];
        if (profile && profile.growingAreas && profile.growingAreas.length > 0) {
          userAreas = profile.growingAreas;
        } else {
          userAreas = [];
        }
        setGrowingAreas(userAreas);

        // ĐÃ SỬA S06: Bind bằng đúng ID vùng thay vì bằng Tên/Tỉnh để tránh chọn nhầm vùng
        const matchedArea = userAreas.find(
          (a) => a.growingAreaId === data.growingAreaId
        );
        if (!matchedArea) setSubmitError('Vùng trồng của lô không còn trong hồ sơ. Vui lòng chọn lại vùng hợp lệ.');
        const selectedAreaId = matchedArea ? matchedArea.growingAreaId : 0;

        // 3. Xác định unit hợp lệ (map về enum: Tấn | Kg | Bao | Thùng)
        const rawUnit = ({ kg: 'Kg', kilogram: 'Kg', ton: 'Tấn', tan: 'Tấn', 'tấn': 'Tấn', bao: 'Bao', 'thùng': 'Thùng' } as Record<string, string>)[data.unit.trim().toLowerCase()] ?? data.unit;
        const validUnits = ['Tấn', 'Kg', 'Bao', 'Thùng'] as const;
        type ValidUnit = typeof validUnits[number];
        const mappedUnit: ValidUnit = (validUnits as readonly string[]).includes(rawUnit)
          ? (rawUnit as ValidUnit)
          : (() => { throw new Error('Đơn vị của lô không được hỗ trợ. Vui lòng kiểm tra dữ liệu lô.'); })();

        // 4. Định dạng Date cho <input type="date" /> (YYYY-MM-DD)
        const formatForDateInput = (dateStr?: string | null) => {
          if (!dateStr) return '';
          return dateStr.substring(0, 10);
        };

        // 5. Fill toàn bộ dữ liệu vào Form
        reset({
          cropTypeId: initialCropId,
          productName: data.productName,
          growingAreaId: selectedAreaId,
          declaredQuantity: data.declaredQuantity,
          unit: mappedUnit,
          harvestDate: formatForDateInput(data.harvestDate),
          expectedDeliveryDate: formatForDateInput(data.expectedDeliveryDate),
          expiryDate: formatForDateInput(data.expiryDate),
          packagingType: data.packagingType || '',
          packageCount: data.packageCount ?? undefined,
          packageUnitWeightKg: data.packageUnitWeightKg ?? undefined,
          expectedMinTempC: data.expectedMinTempC ?? undefined,
          expectedMaxTempC: data.expectedMaxTempC ?? undefined,
          expectedMinHumidityPct: data.expectedMinHumidityPct ?? undefined,
          expectedMaxHumidityPct: data.expectedMaxHumidityPct ?? undefined,
          note: data.supplierNote || '',
        });
      } catch (err) {
        setSubmitError(getAuthErrorMessage(err, 'Không thể tải thông tin lô hàng.'));
      } finally {
        setLoading(false);
        setIsLoadingAreas(false);
      }
    };

    fetchDetailAndProfile();
  }, [id, reset, navigate]);

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
    if (!id || !version) return;
    setIsSubmitting(true);
    setSubmitError(null);

    try {
      const uploaded = await Promise.all(pendingFiles.map(file => uploadSupplierFile(file)));
      await supplierBatchService.updateBatch(Number(id), { ...values, ...version, evidenceDocumentUrls: [...documents.map(doc => doc.fileUrl), ...uploaded] });
      navigate(`/supplier/batches/${id}`);
    } catch (err) {
      setSubmitError(
        getAuthErrorMessage(err, 'Chỉnh sửa thất bại. Vui lòng kiểm tra lại.')
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
            <SupplierBatchBreadcrumb batchId={Number(id)} batchCode={batchCode} editing />
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
              onClick={() => navigate(`/supplier/batches/${id}`)}
              className="bg-white hover:bg-gray-50 text-gray-700 font-medium px-4 py-2 rounded-lg border border-gray-300 text-xs flex items-center gap-1.5 shadow-sm cursor-pointer"
            >
              <History className="w-3.5 h-3.5" />
              <span>Hủy & Quay lại</span>
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

            {/* Card 2: Khối lượng & Quy cách đóng gói */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
              <div className="flex items-center gap-2 text-xs font-bold text-gray-800 border-b pb-3 mb-4">
                <Truck className="w-4 h-4 text-gray-500" />
                <span>2. Khối lượng & Quy cách đóng gói</span>
              </div>

              <div className="space-y-4">
                {/* ĐƠN VỊ (Radio group) */}
                <div>
                  <label className="block text-[11px] font-semibold text-gray-600 uppercase mb-2">
                    ĐƠN VỊ / HÌNH THỨC ĐÓNG GÓI <span className="text-red-500">*</span>
                  </label>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                    {(['Tấn', 'Kg', 'Bao', 'Thùng'] as const).map((unitOption) => (
                      <label
                        key={unitOption}
                        className={`flex items-center justify-center gap-2 border rounded-lg px-3 py-2.5 text-xs font-semibold cursor-pointer transition-all ${
                          currentUnit === unitOption
                            ? 'bg-emerald-50 border-emerald-400 text-emerald-700 ring-1 ring-emerald-400'
                            : 'bg-gray-50 border-gray-200 text-gray-600 hover:border-gray-300 hover:bg-gray-100'
                        }`}
                      >
                        <input
                          type="radio"
                          value={unitOption}
                          {...register('unit')}
                          className="sr-only"
                        />
                        {(unitOption === 'Bao' || unitOption === 'Thùng') && (
                          <Package className="w-3.5 h-3.5" />
                        )}
                        {unitOption === 'Bao' ? 'Bao (kiện)' : unitOption === 'Thùng' ? 'Thùng (kiện)' : unitOption}
                      </label>
                    ))}
                  </div>
                  {errors.unit && (
                    <p className="text-[11px] text-red-500 mt-1">{errors.unit.message}</p>
                  )}
                  {isPackageUnit && (
                    <p className="text-[11px] text-blue-500 mt-1.5 flex items-center gap-1">
                      <Info className="w-3 h-3" />
                      Tổng trọng lượng = Số kiện × Trọng lượng mỗi kiện (Kg)
                    </p>
                  )}
                </div>

                {/* SỐ LƯỢNG KHAI BÁO */}
                <div>
                  <label className="block text-[11px] font-semibold text-gray-600 uppercase mb-1">
                    {isPackageUnit ? `SỐ LƯỢNG KIỆN (${currentUnit})` : 'KHỐI LƯỢNG KHAI BÁO'}{' '}
                    <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    step={isPackageUnit ? '1' : '0.01'}
                    {...register('declaredQuantity', { valueAsNumber: true })}
                    placeholder={isPackageUnit ? 'Nhập số kiện...' : '0.00'}
                    className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-xs text-gray-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                  {errors.declaredQuantity && (
                    <p className="text-[11px] text-red-500 mt-1">
                      {errors.declaredQuantity.message}
                    </p>
                  )}
                </div>

                {/* NHÓM: QUY CÁCH ĐÓNG GÓI KIỆN — chỉ hiện khi unit là Bao/Thùng */}
                {isPackageUnit && (
                  <div className="p-4 bg-blue-50/60 border border-blue-100 rounded-xl space-y-3">
                    <p className="text-[11px] font-bold text-blue-700 uppercase tracking-wide flex items-center gap-1.5">
                      <Package className="w-3.5 h-3.5" />
                      Chi tiết quy cách đóng gói
                    </p>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {/* SỐ KIỆN (packageCount) - Tự động điền theo KHỐI LƯỢNG KHAI BÁO */}
                      <div>
                        <label className="block text-[11px] font-semibold text-gray-600 uppercase mb-1">
                          SỐ LƯỢNG KIỆN <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="number"
                          step="1"
                          min="1"
                          readOnly
                          {...register('packageCount', { setValueAs: optionalNumericInput })}
                          placeholder="Được tự động điền..."
                          className="w-full bg-gray-100 border border-blue-200 rounded-lg px-3 py-2 text-xs text-gray-500 cursor-not-allowed focus:outline-none"
                        />
                        {errors.packageCount && (
                          <p className="text-[11px] text-red-500 mt-1">
                            {errors.packageCount.message}
                          </p>
                        )}
                      </div>

                      {/* TRỌNG LƯỢNG MỖI KIỆN (packageUnitWeightKg) */}
                      <div>
                        <label className="block text-[11px] font-semibold text-gray-600 uppercase mb-1">
                          TRỌNG LƯỢNG MỖI KIỆN (KG) <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="number"
                          step="0.1"
                          min="0.1"
                          {...register('packageUnitWeightKg', { setValueAs: optionalNumericInput })}
                          placeholder={currentUnit === 'Bao' ? 'Gợi ý: 25 kg' : 'Gợi ý: 10 kg'}
                          className="w-full bg-white border border-blue-200 rounded-lg px-3 py-2 text-xs text-gray-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-400"
                        />
                        {errors.packageUnitWeightKg && (
                          <p className="text-[11px] text-red-500 mt-1">
                            {errors.packageUnitWeightKg.message}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* TỔNG TRỌNG LƯỢNG ƯỚC TÍNH (readonly, realtime) */}
                    {estimatedWeightKg !== null && (
                      <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg flex items-center justify-between">
                        <span className="text-[11px] font-semibold text-emerald-700 uppercase tracking-wide">
                          Tổng trọng lượng ước tính
                        </span>
                        <span className="text-sm font-bold text-emerald-800">
                          {estimatedWeightKg.toLocaleString('vi-VN')} kg
                          <span className="ml-2 font-normal text-emerald-600 text-[11px]">
                            ({(estimatedWeightKg / 1000).toFixed(3)} tấn)
                          </span>
                        </span>
                      </div>
                    )}
                  </div>
                )}

                {/* NGÀY THU HOẠCH & NGÀY GIAO HÀNG DỰ KIẾN */}
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
                    {errors.harvestDate && (
                      <p className="text-[11px] text-red-500 mt-1">{errors.harvestDate.message}</p>
                    )}
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-gray-600 uppercase mb-1 flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-gray-400" />
                      <span>NGÀY GIAO HÀNG DỰ KIẾN</span>
                    </label>
                    <input
                      type="date"
                      {...register('expectedDeliveryDate')}
                      className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-xs text-gray-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                    {errors.expectedDeliveryDate && (
                      <p className="text-[11px] text-red-500 mt-1">{errors.expectedDeliveryDate.message}</p>
                    )}
                  </div>
                </div>

                {/* NGÀY HẾT HẠN */}
                <div>
                  <label className="block text-[11px] font-semibold text-gray-600 uppercase mb-1">
                    NGÀY HẾT HẠN SẢN PHẨM
                  </label>
                  <input
                    type="date"
                    {...register('expiryDate')}
                    className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-xs text-gray-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                  {errors.expiryDate && (
                    <p className="text-[11px] text-red-500 mt-1">{errors.expiryDate.message}</p>
                  )}
                </div>
              </div>
            </div>

            {/* Card 3: Điều kiện bảo quản */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
              <div className="flex items-center gap-2 text-xs font-bold text-gray-800 border-b pb-3 mb-4">
                <Thermometer className="w-4 h-4 text-gray-500" />
                <span>3. Điều kiện bảo quản yêu cầu</span>
                <span className="text-[10px] font-normal text-gray-400 ml-1">(Không bắt buộc)</span>
              </div>

              <div className="space-y-4">
                {/* NHIỆT ĐỘ */}
                <div>
                  <label className="block text-[11px] font-semibold text-gray-600 uppercase mb-2 flex items-center gap-1.5">
                    <Thermometer className="w-3.5 h-3.5 text-orange-400" />
                    <span>NHIỆT ĐỘ BẢO QUẢN (°C)</span>
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[10px] text-gray-500 mb-1">Tối thiểu (°C)</label>
                      <input
                        type="number"
                        step="0.5"
                        {...register('expectedMinTempC', { setValueAs: optionalNumericInput })}
                        placeholder="Ví dụ: 2"
                        className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-xs text-gray-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-orange-400"
                      />
                      {errors.expectedMinTempC && (
                        <p className="text-[11px] text-red-500 mt-1">
                          {errors.expectedMinTempC.message}
                        </p>
                      )}
                    </div>
                    <div>
                      <label className="block text-[10px] text-gray-500 mb-1">Tối đa (°C)</label>
                      <input
                        type="number"
                        step="0.5"
                        {...register('expectedMaxTempC', { setValueAs: optionalNumericInput })}
                        placeholder="Ví dụ: 10"
                        className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-xs text-gray-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-orange-400"
                      />
                      {errors.expectedMaxTempC && (
                        <p className="text-[11px] text-red-500 mt-1">
                          {errors.expectedMaxTempC.message}
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                {/* ĐỘ ẨM */}
                <div>
                  <label className="block text-[11px] font-semibold text-gray-600 uppercase mb-2 flex items-center gap-1.5">
                    <Droplets className="w-3.5 h-3.5 text-blue-400" />
                    <span>ĐỘ ẨM BẢO QUẢN (%)</span>
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[10px] text-gray-500 mb-1">Tối thiểu (%)</label>
                      <input
                        type="number"
                        step="1"
                        min="0"
                        max="100"
                        {...register('expectedMinHumidityPct', { setValueAs: optionalNumericInput })}
                        placeholder="Ví dụ: 60"
                        className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-xs text-gray-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-400"
                      />
                      {errors.expectedMinHumidityPct && (
                        <p className="text-[11px] text-red-500 mt-1">
                          {errors.expectedMinHumidityPct.message}
                        </p>
                      )}
                    </div>
                    <div>
                      <label className="block text-[10px] text-gray-500 mb-1">Tối đa (%)</label>
                      <input
                        type="number"
                        step="1"
                        min="0"
                        max="100"
                        {...register('expectedMaxHumidityPct', { setValueAs: optionalNumericInput })}
                        placeholder="Ví dụ: 85"
                        className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-xs text-gray-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-400"
                      />
                      {errors.expectedMaxHumidityPct && (
                        <p className="text-[11px] text-red-500 mt-1">
                          {errors.expectedMaxHumidityPct.message}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Card 4: Ghi chú */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
              <div className="flex items-center gap-2 text-xs font-bold text-gray-800 border-b pb-3 mb-4">
                <FileText className="w-4 h-4 text-gray-500" />
                <span>4. Ghi chú & Tài liệu đính kèm</span>
              </div>
              <textarea
                rows={3}
                {...register('note')}
                placeholder="Ghi chú cho kho nhận..."
                className="w-full bg-gray-50 border border-gray-200 rounded-lg p-3 text-xs text-gray-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
              <div className="mt-4"><SupplierDocumentEditor existing={documents} pending={pendingFiles} onExistingChange={setDocuments} onPendingChange={setPendingFiles} disabled={isSubmitting} variant="profile" /></div>
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
              {batchCreatedAt && (
                <div className="flex justify-between">
                  <span className="text-gray-500">Tạo ngày:</span>
                  <span>
                    {new Date(batchCreatedAt).toLocaleString('vi-VN', {
                      day: '2-digit',
                      month: '2-digit',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                </div>
              )}

              {/* Preview trọng lượng trong sidebar */}
              {isPackageUnit && estimatedWeightKg !== null && (
                <div className="flex justify-between border-t pt-2">
                  <span className="text-gray-500">Trọng lượng ước tính:</span>
                  <span className="font-semibold text-emerald-700">
                    {estimatedWeightKg.toLocaleString('vi-VN')} kg
                  </span>
                </div>
              )}

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
