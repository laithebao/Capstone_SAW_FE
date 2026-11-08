import { optionalNumericInput, type DeclareBatchFormInput } from '@/features/supplier/schemas/supplierBatchSchema';
import { getAuthErrorMessage } from '@/services/authService';
import { uploadSupplierFile } from '@/features/supplier/supplierFiles';
import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router';
import { useForm, useWatch, type SubmitHandler } from 'react-hook-form';
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
  Thermometer,
  Droplets,
  Package,
  FileCheck2,
} from 'lucide-react';
import {
  declareBatchSchema,
  type DeclareBatchFormValues,
} from '@/features/supplier/schemas/supplierBatchSchema';
import { supplierBatchService } from '@/services/suppliers/supplierBatchService';
import { supplierService } from '@/services/suppliers/supplierService';
import { getEligibleSupplyContractsForBatch } from '@/services/supplyContractService';
import type { SupplierGrowingAreaDto } from '@/types/supplier';
import type { SupplyContractBatchOption } from '@/types/supplyContract';

const money = new Intl.NumberFormat('vi-VN', {
  style: 'currency',
  currency: 'VND',
  maximumFractionDigits: 0,
});
const weight = new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 2 });
const formatDate = (value: string) => new Intl.DateTimeFormat('vi-VN').format(new Date(`${value}T00:00:00`));
const daysUntilDate = (value: string) => {
  const [year, month, day] = value.split('-').map(Number);
  const today = new Date();
  const dueDay = Date.UTC(year, month - 1, day);
  const todayDay = Date.UTC(today.getFullYear(), today.getMonth(), today.getDate());
  return Math.round((dueDay - todayDay) / 86_400_000);
};
const periodLabel = (period: 'WEEK' | 'MONTH') => period === 'MONTH' ? 'tháng' : 'tuần';
const toWeightKg = (
  unit: DeclareBatchFormValues['unit'],
  quantity?: number,
  packageUnitWeightKg?: number | null,
) => {
  if (!quantity || quantity <= 0) return null;
  if (unit === 'Kg') return quantity;
  if (unit === 'Tấn') return quantity * 1000;
  return packageUnitWeightKg && packageUnitWeightKg > 0
    ? quantity * packageUnitWeightKg
    : null;
};

export const DeclareBatchPage: React.FC = () => {
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);

  // Chỉ các hợp đồng đã duyệt, còn hiệu lực và thuộc Supplier hiện tại mới được chọn.
  const [eligibleContracts, setEligibleContracts] = useState<SupplyContractBatchOption[]>([]);
  const [growingAreas, setGrowingAreas] = useState<SupplierGrowingAreaDto[]>([]);
  const [isLoadingAreas, setIsLoadingAreas] = useState<boolean>(true);
  const [isLoadingContracts, setIsLoadingContracts] = useState<boolean>(true);
  const [initialDataError, setInitialDataError] = useState<string | null>(null);

  const {
    register,
    control,
    handleSubmit,
    setValue,
    getValues,
    setError,
    formState: { errors },
  } = useForm<DeclareBatchFormInput, unknown, DeclareBatchFormValues>({
    resolver: zodResolver(declareBatchSchema),
    defaultValues: {
      supplyContractId: 0,
      unit: 'Tấn',
      cropTypeId: 0,
      productName: '',
      note: '',
      packagingType: '',
      packageCount: undefined,
      packageUnitWeightKg: undefined,
      expectedMinTempC: undefined,
      expectedMaxTempC: undefined,
      expectedMinHumidityPct: undefined,
      expectedMaxHumidityPct: undefined,
      expiryDate: '',
      expectedDeliveryDate: '',
    },
  });

  // Watch các field cần theo dõi realtime
  const currentSupplyContractId = useWatch({ control, name: 'supplyContractId' });
  const currentUnit = useWatch({ control, name: 'unit' });
  const currentPackageCount = useWatch({ control, name: 'packageCount' });
  const currentPackageUnitWeightKg = useWatch({ control, name: 'packageUnitWeightKg' });
  const currentDeclaredQuantity = useWatch({ control, name: 'declaredQuantity' });
  const currentExpectedDeliveryDate = useWatch({ control, name: 'expectedDeliveryDate' });

  // Biến kiểm tra xem đơn vị hiện tại có phải là Bao hoặc Thùng không
  const isPackageUnit = currentUnit === 'Bao' || currentUnit === 'Thùng';

  // Tính tổng trọng lượng ước tính khi đóng gói theo kiện
  const estimatedWeightKg = useMemo(() => {
    if (
      isPackageUnit &&
      currentPackageCount &&
      currentPackageUnitWeightKg &&
      currentPackageCount > 0 &&
      currentPackageUnitWeightKg > 0
    ) {
      return currentPackageCount * currentPackageUnitWeightKg;
    }
    return null;
  }, [isPackageUnit, currentPackageCount, currentPackageUnitWeightKg]);

  // Khi unit thay đổi: tự động gợi ý PackageUnitWeightKg và đặt PackagingType
  useEffect(() => {
    if (currentUnit === 'Bao') {
      setValue('packagingType', 'Bao');
      setValue('packageUnitWeightKg', 25);
    } else if (currentUnit === 'Thùng') {
      setValue('packagingType', 'Thùng');
      setValue('packageUnitWeightKg', 10);
    } else {
      // Tấn hoặc Kg: Xóa dữ liệu packaging
      setValue('packagingType', '');
      setValue('packageCount', undefined);
      setValue('packageUnitWeightKg', undefined);
    }
  }, [currentUnit, setValue]);

  // Đồng bộ declaredQuantity sang packageCount khi người dùng nhập số lượng khai báo và đơn vị là kiện (Bao/Thùng)
  useEffect(() => {
    if (isPackageUnit) {
      // Nếu người dùng đã nhập số (khác undefined/rỗng/NaN) thì copy và bật validate
      if (currentDeclaredQuantity && !Number.isNaN(currentDeclaredQuantity)) {
        setValue('packageCount', currentDeclaredQuantity, { shouldValidate: true });
      } else {
        // Nếu rỗng (vừa vào trang, hoặc xoá trắng input) thì chỉ set undefined mà không báo lỗi đỏ
        setValue('packageCount', undefined);
      }
    }
  }, [currentDeclaredQuantity, isPackageUnit, setValue]);

  // Fetch hồ sơ nhà cung cấp.
  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        setIsLoadingAreas(true);
        setInitialDataError(null);
        const profile = await supplierService.getMyProfile().catch(() => null);

        if (profile && Array.isArray(profile.growingAreas) && profile.growingAreas.length > 0) {
          setGrowingAreas(profile.growingAreas);
          setValue('growingAreaId', profile.growingAreas[0].growingAreaId);
        } else {
          setGrowingAreas([]);
        }
      } catch (error) {
        console.error('Lỗi khi tải dữ liệu khởi tạo:', error);
        setInitialDataError(
          getAuthErrorMessage(error, 'Không thể tải hợp đồng hoặc hồ sơ nhà cung cấp.')
        );
      } finally {
        setIsLoadingAreas(false);
      }
    };

    fetchInitialData();
  }, [setValue]);

  // Tải lại hạn mức đúng chu kỳ mỗi khi ngày giao dự kiến thay đổi.
  useEffect(() => {
    const controller = new AbortController();
    const fetchContracts = async () => {
      try {
        setIsLoadingContracts(true);
        setInitialDataError(null);
        const contracts = await getEligibleSupplyContractsForBatch(
          typeof currentExpectedDeliveryDate === 'string' && currentExpectedDeliveryDate
            ? currentExpectedDeliveryDate
            : undefined,
          controller.signal,
        );
        setEligibleContracts(contracts);
        const selectedId = Number(getValues('supplyContractId'));
        if (selectedId > 0 && !contracts.some((contract) => contract.id === selectedId)) {
          setValue('supplyContractId', 0, { shouldValidate: true });
          setValue('cropTypeId', 0, { shouldValidate: true });
          setValue('productName', '', { shouldValidate: true });
        }
      } catch (error) {
        if (!controller.signal.aborted) {
          console.error('Lỗi khi tải hợp đồng:', error);
          setInitialDataError(getAuthErrorMessage(error, 'Không thể tải hạn mức hợp đồng.'));
        }
      } finally {
        if (!controller.signal.aborted) setIsLoadingContracts(false);
      }
    };
    fetchContracts();
    return () => controller.abort();
  }, [currentExpectedDeliveryDate, getValues, setValue]);

  const selectedContract = useMemo(
    () => eligibleContracts.find((contract) => contract.id === Number(currentSupplyContractId)) ?? null,
    [currentSupplyContractId, eligibleContracts],
  );
  const selectedQuotaDaysLeft = selectedContract
    ? daysUntilDate(selectedContract.quotaPeriodEndDate)
    : null;
  const hasAvailableContract = eligibleContracts.some((contract) => contract.remainingQuantityKg > 0);

  const currentWeightKg = useMemo(
    () => toWeightKg(currentUnit, currentDeclaredQuantity, currentPackageUnitWeightKg),
    [currentDeclaredQuantity, currentPackageUnitWeightKg, currentUnit],
  );
  const maxDeclaredQuantity = useMemo(() => {
    if (!selectedContract) return undefined;
    if (currentUnit === 'Kg') return selectedContract.remainingQuantityKg;
    if (currentUnit === 'Tấn') return selectedContract.remainingQuantityKg / 1000;
    if (!currentPackageUnitWeightKg || currentPackageUnitWeightKg <= 0) return undefined;
    return Math.floor(selectedContract.remainingQuantityKg / currentPackageUnitWeightKg);
  }, [currentPackageUnitWeightKg, currentUnit, selectedContract]);
  const quotaError = selectedContract && currentWeightKg !== null
    && currentWeightKg > selectedContract.remainingQuantityKg
    ? `Tổng khối lượng ${weight.format(currentWeightKg)} kg vượt quá ${weight.format(selectedContract.remainingQuantityKg)} kg còn lại của hợp đồng.`
    : null;

  const handleContractChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const contractId = Number(event.target.value);
    const contract = eligibleContracts.find((item) => item.id === contractId);
    setValue('supplyContractId', contractId, { shouldValidate: true });
    setValue('cropTypeId', contract?.cropTypeId ?? 0, { shouldValidate: true });
    setValue('productName', contract?.cropTypeName ?? '', { shouldValidate: true });
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
    setSubmitError(null);

    const contract = eligibleContracts.find((item) => item.id === values.supplyContractId);
    const submittedWeightKg = toWeightKg(values.unit, values.declaredQuantity, values.packageUnitWeightKg);
    if (!contract || submittedWeightKg === null || submittedWeightKg > contract.remainingQuantityKg) {
      const message = !contract
        ? 'Hợp đồng không còn đủ điều kiện. Vui lòng chọn lại.'
        : `Chỉ được khai báo tối đa ${weight.format(contract.remainingQuantityKg)} kg còn lại của hợp đồng trong chu kỳ này.`;
      setError('declaredQuantity', { type: 'contractQuota', message });
      setSubmitError(message);
      return;
    }

    setIsSubmitting(true);

    try {
      const evidenceDocumentUrls = await Promise.all(uploadedFiles.map(file => uploadSupplierFile(file)));
      await supplierBatchService.declareBatch({ ...values, evidenceDocumentUrls });
      navigate('/supplier/batches');
    } catch (err) {
      setSubmitError(
        getAuthErrorMessage(err, 'Không thể khai báo lô hàng. Vui lòng thử lại.')
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
              Chọn hợp đồng đã duyệt trước khi khai báo lô nông sản mới.
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
              disabled={isSubmitting || isLoadingContracts || !hasAvailableContract || Boolean(quotaError)}
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

        {initialDataError && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{initialDataError}</span>
          </div>
        )}

        <div className="space-y-6">
          {/* Hợp đồng là điều kiện bắt buộc để khai báo lô hàng. */}
          <div className="bg-white rounded-xl border border-emerald-200 shadow-sm p-6">
            <div className="flex items-center gap-2 mb-5 text-gray-800 font-semibold text-sm border-b pb-3">
              <FileCheck2 className="w-4 h-4 text-emerald-600" />
              <span>Hợp đồng áp dụng</span>
            </div>

            <label className="block text-[11px] font-semibold text-gray-600 uppercase mb-1">
              HỢP ĐỒNG ĐÃ ĐƯỢC DUYỆT <span className="text-red-500">*</span>
            </label>
            <select
              value={currentSupplyContractId || ''}
              onChange={handleContractChange}
              disabled={isLoadingContracts || eligibleContracts.length === 0}
              className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3.5 py-2.5 text-xs text-gray-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 disabled:opacity-60 cursor-pointer"
            >
              <option value="">
                {isLoadingContracts ? 'Đang tải hợp đồng...' : 'Chọn hợp đồng cho lô hàng'}
              </option>
              {eligibleContracts.map((contract) => (
                <option key={contract.id} value={contract.id} disabled={contract.remainingQuantityKg <= 0}>
                  {contract.contractCode} — {contract.cropTypeName} — còn {weight.format(contract.remainingQuantityKg)} kg
                </option>
              ))}
            </select>
            <input type="hidden" {...register('supplyContractId', { valueAsNumber: true })} />
            {errors.supplyContractId && (
              <p className="text-[11px] text-red-500 mt-1">{errors.supplyContractId.message}</p>
            )}
            {eligibleContracts.length > 0 && (
              <p className="mt-2 text-xs text-slate-500">
                Chỉ hiển thị hợp đồng mới nhất đang có hiệu lực cho từng loại nông sản.
              </p>
            )}

            {!isLoadingContracts && eligibleContracts.length === 0 && !initialDataError && (
              <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
                Không có hợp đồng đã được Admin duyệt, còn hiệu lực và phù hợp với ngày giao dự kiến.
                <button
                  type="button"
                  onClick={() => navigate('/supplier/contracts')}
                  className="ml-2 font-bold underline"
                >
                  Xem hợp đồng
                </button>
              </div>
            )}

            {!isLoadingContracts && eligibleContracts.length > 0 && !hasAvailableContract && (
              <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
                Các hợp đồng trong chu kỳ này đã dùng hết sản lượng. Hãy chọn ngày giao thuộc chu kỳ tiếp theo hoặc liên hệ Quản lý kho.
              </div>
            )}

            {selectedContract && (
              <div className="mt-4 grid grid-cols-2 gap-3 rounded-xl bg-emerald-50 p-4 text-xs md:grid-cols-5">
                <div><p className="text-gray-500">Rau củ</p><p className="font-bold text-gray-900">{selectedContract.cropTypeName}</p></div>
                <div><p className="text-gray-500">Sản lượng cam kết</p><p className="font-bold text-gray-900">{weight.format(selectedContract.deliveryQuantityKg)} kg/{periodLabel(selectedContract.deliveryPeriod)}</p></div>
                <div>
                  <p className="text-gray-500">Đã khai báo / Còn lại</p>
                  <p className="font-bold text-gray-900">{weight.format(selectedContract.usedQuantityKg)} / <span className="text-emerald-700">{weight.format(selectedContract.remainingQuantityKg)} kg</span></p>
                  <p className="mt-1 text-[10px] text-gray-500">Kỳ giao: {formatDate(selectedContract.quotaPeriodStartDate)} – {formatDate(selectedContract.quotaPeriodEndDate)}</p>
                  {selectedContract.remainingQuantityKg <= 0 ? (
                    <p className="mt-1 text-[11px] font-semibold text-emerald-700">Đã giao đủ sản lượng kỳ này</p>
                  ) : selectedQuotaDaysLeft !== null && (
                    <p className={`mt-1 text-[11px] font-semibold ${selectedQuotaDaysLeft < 0 ? 'text-rose-700' : selectedQuotaDaysLeft <= 1 ? 'text-amber-700' : 'text-emerald-700'}`}>
                      {selectedQuotaDaysLeft < 0
                        ? `Đã quá hạn ${Math.abs(selectedQuotaDaysLeft)} ngày`
                        : selectedQuotaDaysLeft === 0
                          ? 'Đến hạn giao hôm nay'
                          : `Còn ${selectedQuotaDaysLeft} ngày để giao đủ sản lượng`}
                    </p>
                  )}
                </div>
                <div><p className="text-gray-500">Đơn giá</p><p className="font-bold text-emerald-700">{money.format(selectedContract.unitPriceVndPerKg)}/kg</p></div>
                <div><p className="text-gray-500">Hiệu lực đến</p><p className="font-bold text-gray-900">{formatDate(selectedContract.endDate)}</p></div>
              </div>
            )}
          </div>

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
                    value={selectedContract?.categoryName ?? ''}
                    disabled
                    className="w-full bg-gray-100 border border-gray-200 rounded-lg px-3.5 py-2.5 text-xs text-gray-700 disabled:opacity-100"
                  >
                    <option value="">Chọn hợp đồng trước</option>
                    {selectedContract && <option value={selectedContract.categoryName}>{selectedContract.categoryName}</option>}
                  </select>
                </div>

                {/* DROPDOWN 2: GIỐNG / PHÂN LOẠI SẢN PHẨM */}
                <div>
                  <label className="block text-[11px] font-semibold text-gray-600 uppercase mb-1">
                    GIỐNG / PHÂN LOẠI SẢN PHẨM <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={selectedContract?.cropTypeId ?? ''}
                    disabled
                    className="w-full bg-gray-100 border border-gray-200 rounded-lg px-3.5 py-2.5 text-xs text-gray-700 disabled:opacity-100"
                  >
                    <option value="">Chọn hợp đồng trước</option>
                    {selectedContract && <option value={selectedContract.cropTypeId}>{selectedContract.cropTypeName}</option>}
                  </select>
                  <input type="hidden" {...register('cropTypeId', { valueAsNumber: true })} />
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

          {/* Card 2: Khối lượng & Quy cách đóng gói */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
            <div className="flex items-center gap-2 mb-6 text-gray-800 font-semibold text-sm border-b pb-3">
              <Truck className="w-4 h-4 text-gray-600" />
              <span>Khối lượng & Quy cách đóng gói</span>
            </div>

            <div className="space-y-4">
              {/* ĐƠN VỊ (chọn trước để hiển thị đúng UI) */}
              <div>
                <label className="block text-[11px] font-semibold text-gray-600 uppercase mb-1">
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
                  {isPackageUnit ? `SỐ LƯỢNG KIỆN (${currentUnit})` : 'SỐ LƯỢNG KHAI BÁO'}{' '}
                  <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  step={isPackageUnit ? '1' : '0.001'}
                  min={isPackageUnit ? 1 : 0.001}
                  max={maxDeclaredQuantity}
                  {...register('declaredQuantity', { valueAsNumber: true })}
                  placeholder={isPackageUnit ? 'Nhập số kiện...' : '0.00'}
                  aria-invalid={Boolean(errors.declaredQuantity || quotaError)}
                  className={`w-full bg-gray-50 border rounded-lg px-3.5 py-2.5 text-xs text-gray-800 focus:bg-white focus:outline-none focus:ring-2 ${quotaError ? 'border-red-300 focus:ring-red-400' : 'border-gray-200 focus:ring-emerald-500'}`}
                />
                {(errors.declaredQuantity || quotaError) && (
                  <p className="text-[11px] text-red-500 mt-1">
                    {errors.declaredQuantity?.message ?? quotaError}
                  </p>
                )}
                {selectedContract && !quotaError && (
                  <p className="mt-1 text-[11px] text-emerald-700">
                    Tối đa lô này: {weight.format(selectedContract.remainingQuantityKg)} kg còn lại trong chu kỳ.
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
                    {/* SỐ KIỆN (packageCount) — Tự động điền theo SỐ LƯỢNG KHAI BÁO */}
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
                        className="w-full bg-gray-100 border border-blue-200 rounded-lg px-3.5 py-2.5 text-xs text-gray-500 cursor-not-allowed focus:outline-none"
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
                        className="w-full bg-white border border-blue-200 rounded-lg px-3.5 py-2.5 text-xs text-gray-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-400"
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

                <div>
                  <label className="block text-[11px] font-semibold text-gray-600 uppercase mb-1 flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-gray-400" />
                    <span>NGÀY GIAO HÀNG DỰ KIẾN <span className="text-red-500">*</span></span>
                  </label>
                  <input
                    type="date"
                    {...register('expectedDeliveryDate')}
                    className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3.5 py-2.5 text-xs text-gray-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
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
                  className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3.5 py-2.5 text-xs text-gray-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
                {errors.expiryDate && (
                  <p className="text-[11px] text-red-500 mt-1">
                    {errors.expiryDate.message}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Card 3: Điều kiện bảo quản */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
            <div className="flex items-center gap-2 mb-6 text-gray-800 font-semibold text-sm border-b pb-3">
              <Thermometer className="w-4 h-4 text-gray-600" />
              <span>Điều kiện bảo quản yêu cầu</span>
              <span className="text-[10px] font-normal text-gray-400 ml-1">(Không bắt buộc — hỗ trợ bố trí kho)</span>
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
                      className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3.5 py-2.5 text-xs text-gray-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-orange-400"
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
                      className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3.5 py-2.5 text-xs text-gray-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-orange-400"
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
                      className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3.5 py-2.5 text-xs text-gray-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-400"
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
                      className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3.5 py-2.5 text-xs text-gray-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-400"
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
            <div className="flex items-center gap-2 mb-4 text-gray-800 font-semibold text-sm border-b pb-3">
              <MessageSquare className="w-4 h-4 text-gray-600" />
              <span>Mô tả / Ghi chú bổ sung</span>
            </div>
            <textarea
              {...register('note')}
              rows={3}
              placeholder="Ghi chú về điều kiện bảo quản, chất lượng sản phẩm hoặc lưu ý khi vận chuyển..."
              className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3.5 py-2.5 text-xs text-gray-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none"
            />
          </div>

          {/* Card 5: Upload */}
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
