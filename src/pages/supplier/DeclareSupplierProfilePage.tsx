import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router';
import { useForm, useFieldArray, type SubmitHandler, type Resolver } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  Upload,
  Send,
  Building2,
  MapPin,
  Sprout,
  FileText,
  Camera,
  X,
  Plus,
  Trash2,
  Lock
} from 'lucide-react';
import { declareSupplierProfileSchema } from '../../features/supplier/schemas/supplierProfileSchema';
import type { DeclareSupplierProfileFormValues } from '../../features/supplier/schemas/supplierProfileSchema';
import { supplierService } from '../../services/suppliers/supplierService';
import type { SupplierCropTypeDto, SupplierGrowingAreaDto } from '../../types/supplier';

const getEmailFromToken = (): string => {
  try {
    const authSessionRaw = sessionStorage.getItem('saw.auth-session'); 
    
    if (!authSessionRaw) return '';

    const authSession = JSON.parse(authSessionRaw);
    
    return authSession?.user?.email || '';
  } catch (error) {
    console.error('Lỗi khi lấy email từ auth session:', error);
    return '';
  }
};

// Data Chứng nhận cố định
const CERTIFICATION_OPTIONS = [
  'VietGAP',
  'GlobalGAP',
  'Organic',
  'HACCP',
  'Không có chứng nhận',
];

export const DeclareSupplierProfilePage: React.FC = () => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState<string | null>(null);
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const [growingAreaOptions, setGrowingAreaOptions] = useState<SupplierGrowingAreaDto[]>([]);
  const [cropTypeOptions, setCropTypeOptions] = useState<SupplierCropTypeDto[]>([]);
  
  const navigate = useNavigate();

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    control,
    formState: { errors },
  } = useForm<DeclareSupplierProfileFormValues>({
    resolver: zodResolver(declareSupplierProfileSchema) as Resolver<DeclareSupplierProfileFormValues>,
    defaultValues: {
      supplierName: '',
      taxCode: '',
      supplierType: 'Hợp tác xã',
      legalRepresentative: '',
      contactPerson: '',
      phoneNumber: '',
      email: '',
      address: '',
      growingAreas: [],
      cropTypeIds: [],
      certifications: ['Không có chứng nhận'],
      evidenceDocumentUrls: [],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'growingAreas',
  });

  const selectedCropTypes = watch('cropTypeIds') || [];
  const selectedCertifications = watch('certifications') || [];

  // Gom nhóm danh sách cây trồng theo CategoryName
  const groupedCropTypes = useMemo(() => {
    const groups: { [category: string]: SupplierCropTypeDto[] } = {};
    const safeCropList = Array.isArray(cropTypeOptions) ? cropTypeOptions : [];

    safeCropList.forEach((crop) => {
      const category = crop.categoryName || 'Nông sản khác';
      if (!groups[category]) {
        groups[category] = [];
      }
      groups[category].push(crop);
    });
    return groups;
  }, [cropTypeOptions]);

  // Tự động lấy Email từ Token khi vào trang
  useEffect(() => {
    const userEmail = getEmailFromToken();
    if (userEmail) {
      setValue('email', userEmail, { shouldValidate: true });
    }
  }, [setValue]);

  // Tải danh sách Vùng trồng và Cây trồng từ Server
  useEffect(() => {
    const fetchMetadata = async () => {
      try {
        const [areas, crops] = await Promise.all([
          supplierService.getGrowingAreas(),
          supplierService.getCropTypes(),
        ]);
        setGrowingAreaOptions(Array.isArray(areas) ? areas : []);
        setCropTypeOptions(Array.isArray(crops) ? crops : []);
      } catch (err) {
        console.error('Lỗi khi tải dữ liệu khởi tạo:', err);
      }
    };
    fetchMetadata();
  }, []);

  const handleCropTypeToggle = (id: number) => {
    const numericId = Number(id);
    if (!numericId) return;

    const current = selectedCropTypes.map(Number);
    const idx = current.indexOf(numericId);
    if (idx > -1) {
      current.splice(idx, 1);
    } else {
      current.push(numericId);
    }
    setValue('cropTypeIds', current, { shouldValidate: true });
  };

  const handleCertToggle = (cert: string) => {
    if (cert === 'Không có chứng nhận') {
      setValue('certifications', ['Không có chứng nhận']);
      return;
    }

    let updated = selectedCertifications.filter(
      (c) => c !== 'Không có chứng nhận'
    );
    if (updated.includes(cert)) {
      updated = updated.filter((c) => c !== cert);
    } else {
      updated.push(cert);
    }
    setValue('certifications', updated);
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

  const onSubmit: SubmitHandler<DeclareSupplierProfileFormValues> = async (values) => {
    const hasInvalidArea = values.growingAreas?.some(
      (ga) => !ga.growingAreaId || Number(ga.growingAreaId) === 0
    );
    if (hasInvalidArea) {
      setSubmitError('Vui lòng chọn tên Vùng trồng hợp lệ cho tất cả các dòng đã thêm.');
      return;
    }

    setIsSubmitting(true);
    setSubmitError(null);
    setSubmitSuccess(null);

    try {
      let uploadedDocUrls: string[] = [];
      if (uploadedFiles.length > 0) {
        uploadedDocUrls = await Promise.all(
          uploadedFiles.map((file) => supplierService.uploadFile(file))
        );
      }

      const validGrowingAreas = (values.growingAreas || [])
        .filter((ga) => ga && Number(ga.growingAreaId) > 0)
        .map((ga) => ({
          growingAreaId: Number(ga.growingAreaId),
          areaInHectares: ga.areaInHectares ? Number(ga.areaInHectares) : undefined,
        }));

      const payload = {
        ...values,
        cropTypeIds: (values.cropTypeIds || []).map(Number),
        growingAreas: validGrowingAreas,
        evidenceDocumentUrls: uploadedDocUrls.filter(Boolean),
      };

      try {
        // Cố gắng gọi API Khai báo mới trước
        await supplierService.declareProfile(payload);
        setSubmitSuccess('Khai báo hồ sơ Nhà cung cấp thành công!');
      } catch (declareErr: any) {
        // Nếu Server báo lỗi 409 (Hồ sơ đã tồn tại do hệ thống tự sinh bản ghi lúc login)
        // -> Tự động chuyển sang gọi API Cập nhật (PUT) để lưu thông tin đè lên
        if (declareErr.response?.status === 409 || declareErr.response?.data?.message?.includes('đã tồn tại')) {
          await supplierService.updateProfile(payload);
          setSubmitSuccess('Cập nhật hồ sơ Nhà cung cấp thành công!');
        } else {
          // Nếu là lỗi khác thì ném ra ngoài để nhảy vào catch tổng bên dưới
          throw declareErr;
        }
      }

      // Đợi 1.5 giây rồi điều hướng về trang quản lý lô hàng hoặc trang chủ
      setTimeout(() => {
        navigate('/supplier/batches');
      }, 1500);

    } catch (err: any) {
      console.error('Lỗi khi submit:', err.response?.data); 
      if (err.response?.status === 400) {
        const serverErrors = err.response.data.errors;
        if (serverErrors) {
          const errorMessages = Object.entries(serverErrors)
            .map(([field, messages]) => {
              const msgs = Array.isArray(messages) ? messages.join(', ') : messages;
              return `${field}: ${msgs}`;
            })
            .join(' | ');
          setSubmitError(`Dữ liệu không hợp lệ: ${errorMessages}`);
        } else {
          setSubmitError(err.response?.data?.title || 'Dữ liệu không hợp lệ. Vui lòng kiểm tra lại.');
        }
      } else if (err.response?.status === 409) {
        setSubmitError('Mã số thuế này đã được đăng ký trên hệ thống.');
      } else {
        setSubmitError(
          err.response?.data?.message || 'Có lỗi xảy ra khi khai báo thông tin.'
        );
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50/50 p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">
          Khai báo thông tin Nhà cung cấp
        </h1>
        <p className="text-sm text-gray-500 mt-1">
          Khai báo thông tin chi tiết cho{' '}
          <span className="font-medium text-gray-700">NCC-2023-089</span>
        </p>
      </div>

      {submitError && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
          {submitError}
        </div>
      )}

      {submitSuccess && (
        <div className="mb-6 p-4 bg-green-50 border border-green-200 text-green-700 rounded-lg text-sm font-medium">
          {submitSuccess}
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)}>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* LEFT COLUMN */}
          <div className="lg:col-span-2 space-y-6">
            {/* Section 1: Thông tin cơ bản */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
              <div className="flex items-center gap-2 mb-6 text-gray-800 font-semibold text-base border-b pb-3">
                <Building2 className="w-5 h-5 text-gray-600" />
                <span>Thông tin cơ bản</span>
              </div>

              {/* Logo Upload Box */}
              <div className="mb-6">
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                  LOGO DOANH NGHIỆP / HỢP TÁC XÃ
                </label>
                <div className="flex flex-col items-center justify-center border-2 border-dashed border-gray-300 rounded-lg p-4 bg-gray-50/50 w-36 h-36 mx-auto relative group hover:border-gray-400 transition">
                  <Camera className="w-8 h-8 text-gray-400 mb-1" />
                  <div className="absolute bottom-2 right-2 bg-gray-800 text-white p-1.5 rounded-full shadow-md">
                    <Camera className="w-3.5 h-3.5" />
                  </div>
                </div>
                <p className="text-center text-xs text-gray-400 mt-2 font-medium">
                  Định dạng: JPG, PNG. Tối đa 2MB.
                </p>
              </div>

              <div className="space-y-4">
                {/* Tên DN */}
                <div>
                  <label className="block text-xs font-semibold text-gray-600 uppercase mb-1">
                    TÊN DOANH NGHIỆP / HỢP TÁC XÃ <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    {...register('supplierName')}
                    className="w-full bg-gray-100/70 border border-gray-200 rounded-lg px-3.5 py-2.5 text-sm text-gray-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    placeholder="VD: Hợp tác xã Nông nghiệp Xanh Vĩnh Long"
                  />
                  {errors.supplierName && (
                    <p className="text-xs text-red-500 mt-1">
                      {errors.supplierName.message}
                    </p>
                  )}
                </div>

                {/* MST & Loại hình */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 uppercase mb-1">
                      MST / MÃ SỐ ĐĂNG KÝ <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      {...register('taxCode')}
                      className="w-full bg-gray-100/70 border border-gray-200 rounded-lg px-3.5 py-2.5 text-sm text-gray-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      placeholder="VD: 1500456789"
                    />
                    {errors.taxCode && (
                      <p className="text-xs text-red-500 mt-1">
                        {errors.taxCode.message}
                      </p>
                    )}
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 uppercase mb-1">
                      LOẠI HÌNH NHÀ CUNG CẤP <span className="text-red-500">*</span>
                    </label>
                    <select
                      {...register('supplierType')}
                      className="w-full bg-gray-100/70 border border-gray-200 rounded-lg px-3.5 py-2.5 text-sm text-gray-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    >
                      <option value="Hợp tác xã">Hợp tác xã</option>
                      <option value="Doanh nghiệp">Doanh nghiệp</option>
                      <option value="Hộ kinh doanh">Hộ kinh doanh</option>
                      <option value="Trang trại">Trang trại</option>
                    </select>
                  </div>
                </div>

                {/* Đại diện & Liên hệ */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 uppercase mb-1">
                      NGƯỜI ĐẠI DIỆN PHÁP LÝ <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      {...register('legalRepresentative')}
                      placeholder="Họ và tên"
                      className="w-full bg-gray-100/70 border border-gray-200 rounded-lg px-3.5 py-2.5 text-sm text-gray-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                    {errors.legalRepresentative && (
                      <p className="text-xs text-red-500 mt-1">
                        {errors.legalRepresentative.message}
                      </p>
                    )}
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 uppercase mb-1">
                      NGƯỜI LIÊN HỆ <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      {...register('contactPerson')}
                      placeholder="Họ và tên"
                      className="w-full bg-gray-100/70 border border-gray-200 rounded-lg px-3.5 py-2.5 text-sm text-gray-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                    {errors.contactPerson && (
                      <p className="text-xs text-red-500 mt-1">
                        {errors.contactPerson.message}
                      </p>
                    )}
                  </div>
                </div>

                {/* SĐT & Email */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 uppercase mb-1">
                      SỐ ĐIỆN THOẠI <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      {...register('phoneNumber')}
                      placeholder="VD: 0901234567"
                      className="w-full bg-gray-100/70 border border-gray-200 rounded-lg px-3.5 py-2.5 text-sm text-gray-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                    {errors.phoneNumber && (
                      <p className="text-xs text-red-500 mt-1">
                        {errors.phoneNumber.message}
                      </p>
                    )}
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 uppercase mb-1 flex items-center gap-1.5">
                      EMAIL
                      <Lock className="w-3 h-3 text-gray-400" />
                    </label>
                    <input
                      type="email"
                      {...register('email')}
                      readOnly
                      disabled
                      title="Email liên kết với tài khoản, không thể thay đổi."
                      className="w-full bg-gray-200/70 border border-gray-200 rounded-lg px-3.5 py-2.5 text-sm text-gray-500 cursor-not-allowed"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Section 2: Vùng trồng chi tiết */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
              <div className="flex items-center justify-between mb-6 border-b pb-3">
                <div className="flex items-center gap-2 text-gray-800 font-semibold text-base">
                  <MapPin className="w-5 h-5 text-gray-600" />
                  <span>Vùng trồng & Địa chỉ</span>
                </div>
                <button
                  type="button"
                  onClick={() =>
                    append({
                      growingAreaId: 0,
                      areaInHectares: undefined,
                    })
                  }
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 rounded-lg text-xs font-semibold transition cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>Thêm vùng trồng</span>
                </button>
              </div>

              <div className="space-y-4">
                {/* Địa chỉ trụ sở */}
                <div>
                  <label className="block text-xs font-semibold text-gray-600 uppercase mb-1">
                    ĐỊA CHỈ TRỤ SỞ CHI TIẾT <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    {...register('address')}
                    className="w-full bg-gray-100/70 border border-gray-200 rounded-lg px-3.5 py-2.5 text-sm text-gray-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    placeholder="VD: Ấp Phú Thạnh, Xã Tân Phú, Vũng Liêm, Vĩnh Long"
                  />
                  {errors.address && (
                    <p className="text-xs text-red-500 mt-1">
                      {errors.address.message}
                    </p>
                  )}
                </div>

                {/* Danh sách vùng trồng */}
                <div className="space-y-3 pt-2">
                  <label className="block text-xs font-semibold text-gray-600 uppercase mb-1">
                    DANH SÁCH VÙNG TRỒNG KHAI THÁC <span className="text-red-500">*</span>
                  </label>

                  {fields.length === 0 ? (
                    <div className="p-4 border border-dashed border-gray-300 rounded-lg text-center text-xs text-gray-500">
                      Chưa chọn vùng trồng nào. Vui lòng nhấn "Thêm vùng trồng".
                    </div>
                  ) : (
                    fields.map((field, index) => (
                      <div
                        key={field.id}
                        className="p-3.5 bg-gray-50/80 border border-gray-200 rounded-lg flex flex-col md:flex-row gap-3 items-start md:items-center"
                      >
                        <div className="flex-1 w-full">
                          <label className="block text-[11px] font-semibold text-gray-500 uppercase mb-1">
                            VÙNG TRỒNG #{index + 1}
                          </label>
                          <select
                            {...register(`growingAreas.${index}.growingAreaId` as const, {
                              valueAsNumber: true,
                            })}
                            className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                          >
                            <option value={0}>-- Chọn Vùng trồng --</option>
                            {growingAreaOptions.map((area) => (
                              <option key={area.growingAreaId} value={area.growingAreaId}>
                                {area.areaName} ({[area.ward, area.district, area.province].filter(Boolean).join(', ')})
                              </option>
                            ))}
                          </select>
                          {errors.growingAreas?.[index]?.growingAreaId && (
                            <p className="text-xs text-red-500 mt-1">
                              {errors.growingAreas[index]?.growingAreaId?.message}
                            </p>
                          )}
                        </div>

                        <div className="w-full md:w-44">
                          <label className="block text-[11px] font-semibold text-gray-500 uppercase mb-1">
                            DIỆN TÍCH (HA)
                          </label>
                          <input
                            type="number"
                            step="0.1"
                            {...register(`growingAreas.${index}.areaInHectares` as const, {
                              valueAsNumber: true,
                            })}
                            placeholder="VD: 5.5"
                            className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                          />
                        </div>

                        <button
                          type="button"
                          onClick={() => remove(index)}
                          className="mt-6 md:mt-4 p-2 text-gray-400 hover:text-red-500 rounded-lg hover:bg-red-50 transition cursor-pointer"
                          title="Xóa vùng trồng"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))
                  )}
                  {errors.growingAreas && typeof errors.growingAreas.message === 'string' && (
                    <p className="text-xs text-red-500 mt-1">{errors.growingAreas.message}</p>
                  )}
                </div>
              </div>
            </div>

            {/* Section 3: Thông tin sản xuất */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
              <div className="flex items-center gap-2 mb-6 text-gray-800 font-semibold text-base border-b pb-3">
                <Sprout className="w-5 h-5 text-gray-600" />
                <span>Thông tin sản xuất</span>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-600 uppercase mb-3">
                  DANH MỤC NÔNG SẢN <span className="text-red-500">*</span>
                </label>

                {Object.keys(groupedCropTypes).length === 0 ? (
                  <div className="text-xs text-gray-500 italic">
                    Chưa có dữ liệu cây trồng hoặc đang tải...
                  </div>
                ) : (
                  <div className="space-y-4">
                    {Object.entries(groupedCropTypes).map(([category, crops]) => (
                      <div key={category} className="border-b border-dashed border-gray-200 pb-3">
                        <div className="text-xs font-bold text-emerald-700 uppercase mb-2">
                          📁 {category}
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                          {crops.map((crop) => {
                            const isChecked = selectedCropTypes.map(Number).includes(Number(crop.cropTypeId));
                            return (
                              <label
                                key={crop.cropTypeId}
                                className="flex items-center gap-2 cursor-pointer text-sm text-gray-700 hover:text-gray-900"
                              >
                                <input
                                  type="checkbox"
                                  checked={isChecked}
                                  onChange={() => handleCropTypeToggle(crop.cropTypeId)}
                                  className="w-4 h-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                                />
                                <span>{crop.cropName}</span>
                              </label>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {errors.cropTypeIds && (
                  <p className="text-xs text-red-500 mt-2">
                    {errors.cropTypeIds.message}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* RIGHT COLUMN */}
          <div className="space-y-6">
            {/* Box 1: Hành động */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
              <h3 className="font-semibold text-gray-800 text-sm mb-4">Hành động</h3>
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full bg-zinc-800 hover:bg-zinc-900 text-white font-medium py-2.5 px-4 rounded-lg flex items-center justify-center gap-2 transition disabled:opacity-50 cursor-pointer"
              >
                <Send className="w-4 h-4" />
                <span>{isSubmitting ? 'Đang lưu...' : 'Lưu'}</span>
              </button>
            </div>

            {/* Box 2: Chứng nhận */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
              <h3 className="font-semibold text-gray-800 text-sm mb-4">Chứng nhận</h3>
              <div className="space-y-2.5">
                {CERTIFICATION_OPTIONS.map((cert) => (
                  <label
                    key={cert}
                    className="flex items-center gap-3 p-2.5 border border-gray-100 rounded-lg hover:bg-gray-50/80 cursor-pointer transition"
                  >
                    <input
                      type="checkbox"
                      checked={selectedCertifications.includes(cert)}
                      onChange={() => handleCertToggle(cert)}
                      className="w-4 h-4 rounded border-gray-300 text-zinc-800 focus:ring-zinc-700"
                    />
                    <span className="text-sm text-gray-700">{cert}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Box 3: File đính kèm */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
              <div className="flex items-center gap-2 mb-4">
                <FileText className="w-4 h-4 text-gray-600" />
                <h3 className="font-semibold text-gray-800 text-sm">File đính kèm</h3>
              </div>

              {/* Upload Dropzone */}
              <label className="border-2 border-dashed border-gray-300 rounded-xl p-6 flex flex-col items-center justify-center cursor-pointer hover:border-gray-400 bg-gray-50/50 transition mb-4">
                <Upload className="w-8 h-8 text-gray-400 mb-2" />
                <p className="text-xs font-semibold text-gray-700 text-center">
                  Kéo thả hoặc nhấn để tải lên
                </p>
                <p className="text-[11px] text-gray-400 text-center mt-1">
                  Hỗ trợ: PDF, JPG, PNG (Tối đa 10MB/file)
                </p>
                <input
                  type="file"
                  multiple
                  onChange={handleFileUpload}
                  className="hidden"
                  accept=".pdf,.jpg,.jpeg,.png"
                />
              </label>

              {/* Selected Files List */}
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                  DANH SÁCH TÀI LIỆU ĐÃ CHỌN
                </p>
                {uploadedFiles.length === 0 ? (
                  <p className="text-xs italic text-gray-400">
                    Chưa có tệp nào được chọn
                  </p>
                ) : (
                  <div className="space-y-2">
                    {uploadedFiles.map((file, idx) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between p-2 bg-gray-50 rounded-lg border border-gray-200 text-xs text-gray-700"
                      >
                        <span className="truncate max-w-[180px]">{file.name}</span>
                        <button
                          type="button"
                          onClick={() => removeFile(idx)}
                          className="text-gray-400 hover:text-red-500 cursor-pointer"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
};