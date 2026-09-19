import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import { useForm, type SubmitHandler, type Resolver } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  Upload,
  Save,
  X,
  Building2,
  MapPin,
  Sprout,
  FileText,
  Camera,
  Loader2,
  AlertCircle,
} from 'lucide-react';
import { declareSupplierProfileSchema } from '../../features/supplier/schemas/supplierProfileSchema';
import type { DeclareSupplierProfileFormValues } from '../../features/supplier/schemas/supplierProfileSchema';
import { supplierService } from '../../services/suppliers/supplierService';
import type { SupplierProfileResponse } from '../../types/supplier';
import { ROUTES } from '@/constants/routes';

// Danh mục nông sản (CropTypes)
const CROP_TYPE_OPTIONS = [
  { id: 1, name: 'Lúa gạo' },
  { id: 2, name: 'Ngô' },
  { id: 3, name: 'Cà phê' },
  { id: 4, name: 'Trái cây' },
  { id: 5, name: 'Rau củ' },
];

// Danh mục Chứng nhận
const CERTIFICATION_OPTIONS = [
  'VietGAP',
  'GlobalGAP',
  'Organic',
  'HACCP',
  'Không có chứng nhận',
];

export const EditSupplierProfilePage: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState<boolean>(true);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  
  // Thông tin hiển thị tĩnh/phụ ở cột bên phải
  const [profileMeta, setProfileMeta] = useState<{
    supplierCode?: string;
    profileStatus?: string;
  }>({});

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm<DeclareSupplierProfileFormValues>({
    resolver: zodResolver(declareSupplierProfileSchema) as Resolver<DeclareSupplierProfileFormValues>,
  });

  const selectedCropTypes = watch('cropTypeIds') || [];
  const selectedCertifications = watch('certifications') || [];

  // Fetch dữ liệu profile hiện tại từ GET /api/Suppliers/me/profile
  useEffect(() => {
    const fetchCurrentProfile = async () => {
      try {
        setLoading(true);
        const profile: SupplierProfileResponse = await supplierService.getMyProfile();

        if (profile) {
          // Trích xuất danh sách ID nông sản
          const cropTypeIds = profile.cropTypes
            ? profile.cropTypes.map((c) => c.cropTypeId)
            : [];

          // Trích xuất tên chứng nhận từ SupplierCertificationDto[]
          const certNames = profile.certifications
            ? profile.certifications.map((c) => c.certificationName).filter(Boolean)
            : [];

          // Trích xuất URLs tài liệu từ SupplierDocumentDto[]
          const documentUrls = profile.documents
            ? profile.documents.map((d) => d.fileUrl).filter(Boolean)
            : [];

          // Mapping dữ liệu Response vào Form Update Request
          reset({
            supplierName: profile.supplierName || '',
            taxCode: profile.taxCode || '',
            supplierType: profile.supplierType || 'Hợp tác xã',
            legalRepresentative: profile.legalRepresentative || '',
            contactPerson: profile.contactPerson || '',
            phoneNumber: profile.phoneNumber || '',
            email: profile.email || '',
            province: 'Vĩnh Long', // Mặc định do Response Backend không trả về Province/District riêng
            district: 'Vũng Liêm',
            ward: 'Tân Phú',
            address: profile.address || '',
            farmingAreaHa: profile.farmingAreaHa || 0,
            cropTypeIds: cropTypeIds,
            certifications: certNames.length > 0 ? certNames : ['Không có chứng nhận'],
            evidenceDocumentUrls: documentUrls,
          });

          setProfileMeta({
            supplierCode: profile.supplierCode,
            profileStatus: profile.profileStatus,
          });
        }
      } catch (err: any) {
        if (err.response?.status === 404) {
          navigate(ROUTES.SUPPLIER_PROFILE_DECLARE);
        } else {
          setSubmitError('Không thể tải thông tin hồ sơ nhà cung cấp.');
        }
      } finally {
        setLoading(false);
      }
    };

    fetchCurrentProfile();
  }, [reset, navigate]);

  const handleCropTypeToggle = (id: number) => {
    if (selectedCropTypes.includes(id)) {
      setValue(
        'cropTypeIds',
        selectedCropTypes.filter((item) => item !== id)
      );
    } else {
      setValue('cropTypeIds', [...selectedCropTypes, id]);
    }
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
    setIsSubmitting(true);
    setSubmitError(null);

    try {
      const mockDocUrls = [
        ...(values.evidenceDocumentUrls || []),
        ...uploadedFiles.map((file) => `https://storage.saw.vn/docs/${file.name}`),
      ];

      // Gọi API PUT /api/Suppliers/me/profile
      await supplierService.updateProfile({
        ...values,
        evidenceDocumentUrls: mockDocUrls,
      });

      // Thành công -> Quay lại trang hiển thị profile
      navigate(ROUTES.SUPPLIER_PROFILE);
    } catch (err: any) {
      setSubmitError(
        err.response?.data?.message || 'Có lỗi xảy ra khi cập nhật thông tin.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
        <p className="text-sm text-gray-500 font-medium">Đang tải dữ liệu hồ sơ...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50/50 p-6">
      {/* Page Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">
          Chỉnh sửa Nhà cung cấp
        </h1>
        <p className="text-sm text-gray-500 mt-1">
          Cập nhật thông tin chi tiết cho{' '}
          <span className="font-medium text-gray-700">
            {profileMeta.supplierCode || 'NCC-2023-089'}
          </span>
        </p>
      </div>

      {submitError && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm flex items-center gap-2">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <span>{submitError}</span>
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)}>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* LEFT COLUMN - 2 COLUMNS WIDE */}
          <div className="lg:col-span-2 space-y-6">
            {/* Section 1: Thông tin cơ bản */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
              <div className="flex items-center gap-2 mb-6 text-gray-800 font-semibold text-base border-b pb-3">
                <Building2 className="w-5 h-5 text-gray-600" />
                <span>Thông tin cơ bản</span>
              </div>

              {/* Logo / Avatar Upload Box */}
              <div className="mb-6">
                <div className="flex flex-col items-center justify-center border-2 border-dashed border-gray-300 rounded-lg p-2 bg-gray-50/50 w-32 h-32 mx-auto relative group hover:border-gray-400 transition cursor-pointer">
                  <img
                    src="https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?q=80&w=200&auto=format&fit=crop"
                    alt="Logo/Avatar"
                    className="w-full h-full object-cover rounded-md"
                  />
                  <div className="absolute bottom-1 right-1 bg-gray-800/80 text-white p-1.5 rounded-full shadow-md">
                    <Camera className="w-3.5 h-3.5" />
                  </div>
                </div>
                <p className="text-center text-xs text-gray-500 mt-2 font-medium">
                  LOGO / ẢNH ĐẠI DIỆN
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
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 uppercase mb-1">
                      NGƯỜI LIÊN HỆ <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      {...register('contactPerson')}
                      placeholder="Họ và tên / SĐT"
                      className="w-full bg-gray-100/70 border border-gray-200 rounded-lg px-3.5 py-2.5 text-sm text-gray-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Section 2: Vùng trồng chi tiết */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
              <div className="flex items-center gap-2 mb-6 text-gray-800 font-semibold text-base border-b pb-3">
                <MapPin className="w-5 h-5 text-gray-600" />
                <span>Vùng trồng chi tiết</span>
              </div>

              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 uppercase mb-1">
                      TỈNH / THÀNH PHỐ <span className="text-red-500">*</span>
                    </label>
                    <select
                      {...register('province')}
                      className="w-full bg-gray-100/70 border border-gray-200 rounded-lg px-3.5 py-2.5 text-sm text-gray-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    >
                      <option value="Vĩnh Long">Vĩnh Long</option>
                      <option value="Cần Thơ">Cần Thơ</option>
                      <option value="Đồng Tháp">Đồng Tháp</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 uppercase mb-1">
                      QUẬN / HUYỆN <span className="text-red-500">*</span>
                    </label>
                    <select
                      {...register('district')}
                      className="w-full bg-gray-100/70 border border-gray-200 rounded-lg px-3.5 py-2.5 text-sm text-gray-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    >
                      <option value="Vũng Liêm">Vũng Liêm</option>
                      <option value="Long Hồ">Long Hồ</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 uppercase mb-1">
                      XÃ / PHƯỜNG <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      {...register('ward')}
                      className="w-full bg-gray-100/70 border border-gray-200 rounded-lg px-3.5 py-2.5 text-sm text-gray-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 uppercase mb-1">
                      DIỆN TÍCH CANH TÁC (HA) <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      {...register('farmingAreaHa', { valueAsNumber: true })}
                      className="w-full bg-gray-100/70 border border-gray-200 rounded-lg px-3.5 py-2.5 text-sm text-gray-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-600 uppercase mb-1">
                    ĐỊA CHỈ CHI TIẾT
                  </label>
                  <input
                    type="text"
                    {...register('address')}
                    className="w-full bg-gray-100/70 border border-gray-200 rounded-lg px-3.5 py-2.5 text-sm text-gray-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
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
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {CROP_TYPE_OPTIONS.map((crop) => (
                    <label
                      key={crop.id}
                      className="flex items-center gap-2 cursor-pointer text-sm text-gray-700 hover:text-gray-900"
                    >
                      <input
                        type="checkbox"
                        checked={selectedCropTypes.includes(crop.id)}
                        onChange={() => handleCropTypeToggle(crop.id)}
                        className="w-4 h-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                      />
                      <span>{crop.name}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* RIGHT COLUMN - 1 COLUMN WIDE */}
          <div className="space-y-6">
            {/* Box 1: Hành động */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 space-y-4">
              <h3 className="font-semibold text-gray-800 text-sm">Hành động</h3>
              
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full bg-zinc-800 hover:bg-zinc-900 text-white font-medium py-2.5 px-4 rounded-lg flex items-center justify-center gap-2 transition disabled:opacity-50 text-sm"
              >
                <Save className="w-4 h-4" />
                <span>{isSubmitting ? 'Đang lưu...' : 'Lưu thay đổi'}</span>
              </button>

              <button
                type="button"
                onClick={() => navigate(ROUTES.SUPPLIER_PROFILE)}
                className="w-full bg-white hover:bg-gray-50 text-gray-700 font-medium py-2 px-4 rounded-lg border border-gray-300 flex items-center justify-center gap-2 transition text-sm"
              >
                <X className="w-4 h-4" />
                <span>Hủy</span>
              </button>

              {/* Status Meta Info */}
              <div className="pt-4 border-t border-gray-100 text-xs text-gray-500 space-y-2">
                <div className="flex justify-between items-center">
                  <span>Trạng thái:</span>
                  <span className="font-medium text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                    {profileMeta.profileStatus || 'Active'}
                  </span>
                </div>
              </div>
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
                    Chưa có tệp nào mới được thêm
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
                          className="text-gray-400 hover:text-red-500"
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

export default EditSupplierProfilePage;