import { SupplierDocuments } from '@/features/supplier/components/SupplierDocuments';
import { supplierAssetUrl } from '@/features/supplier/supplierFiles';
import React from 'react';
import { 
  Building2, 
  MapPin, 
  Pencil,
  Sprout,
  UsersRound,
  Paperclip
} from 'lucide-react';
import type { SupplierProfileResponse } from '../../types/supplier';

interface SupplierProfileViewProps {
  profile: SupplierProfileResponse;
  onEdit?: () => void;
}

export const SupplierProfileView: React.FC<SupplierProfileViewProps> = ({ profile, onEdit }) => {
  return (
    <div className="max-w-6xl mx-auto min-h-screen space-y-6 p-4 sm:p-6">
      {/* Header Page */}
      <div className="flex flex-col gap-4 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm sm:flex-row sm:items-center sm:justify-between sm:p-6">
        <h1 className="text-2xl font-bold tracking-tight text-gray-900">Hồ sơ Nhà cung cấp</h1>
        {onEdit && (
          <button
            type="button"
            onClick={onEdit}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-emerald-700 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-emerald-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 focus-visible:ring-offset-2 cursor-pointer"
          >
            <Pencil className="w-4 h-4" />
            Chỉnh sửa thông tin
          </button>
        )}
      </div>

      {/* Block 1: Thông tin cơ bản */}
      <div className="space-y-6 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6">
        <div className="flex items-center gap-3 border-b border-gray-100 pb-4">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700">
            <Building2 className="size-[18px]" aria-hidden="true" />
          </span>
          <h2 className="text-base font-bold text-gray-900">Thông tin cơ bản</h2>
        </div>
        
        <div className="flex items-center gap-4 rounded-xl border border-gray-100 bg-gray-50/70 p-4">
          <div className="w-20 h-20 rounded-2xl bg-white border border-emerald-100 flex items-center justify-center text-emerald-600 font-bold text-xl overflow-hidden shrink-0">
            {profile.logoUrl ? (
              <img src={supplierAssetUrl(profile.logoUrl)} alt={profile.supplierName} className="w-full h-full object-cover" />
            ) : (
              <Building2 className="w-10 h-10 text-emerald-500" />
            )}
          </div>
          <div className="min-w-0">
            <h3 className="break-words text-lg font-bold leading-7 text-gray-900 sm:text-xl">{profile.supplierName}</h3>
            <p className="mt-2 inline-flex max-w-full flex-wrap items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-2.5 py-1 text-xs font-medium text-gray-500">
              Mã NCC: <span className="break-all font-semibold text-gray-700">{profile.supplierCode}</span>
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-y-5 gap-x-8">
          <div>
            <span className="text-[11px] font-semibold uppercase tracking-wide text-gray-500 block mb-2">
              LOẠI HÌNH
            </span>
            <span className="break-words text-sm font-semibold leading-6 text-gray-800">
              {profile.supplierType || 'N/A'}
            </span>
          </div>

          <div>
            <span className="text-[11px] font-semibold uppercase tracking-wide text-gray-500 block mb-2">
              MÃ SỐ THUẾ / ĐKKD
            </span>
            <span className="break-words text-sm font-semibold leading-6 text-gray-800">
              {profile.taxCode}
            </span>
          </div>

          <div className="md:col-span-2">
            <span className="text-[11px] font-semibold uppercase tracking-wide text-gray-500 block mb-2">
              ĐỊA CHỈ TRỤ SỞ
            </span>
            <span className="break-words text-sm font-medium leading-6 text-gray-800">
              {profile.address}
            </span>
          </div>
        </div>
      </div>

      {/* Block 2: Danh sách Vùng trồng */}
      <div className="space-y-5 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6">
        <div className="flex items-center gap-3 border-b border-gray-100 pb-4">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700">
            <MapPin className="size-[18px]" aria-hidden="true" />
          </span>
          <h2 className="text-base font-bold text-gray-900">Danh sách Vùng trồng khai thác</h2>
        </div>

        {profile.growingAreas && profile.growingAreas.length > 0 ? (
          <div className="overflow-x-auto rounded-xl border border-gray-200">
            <table className="w-full min-w-[600px] text-left text-sm text-gray-700 border-collapse">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200 text-[11px] font-semibold uppercase tracking-wide text-gray-500">
                  <th className="py-3.5 px-4">Tên vùng trồng</th>
                  <th className="py-3.5 px-4">Tỉnh / Thành phố</th>
                  <th className="py-3.5 px-4">Quận / Huyện / Xã</th>
                  <th className="py-3.5 px-4 text-right">Diện tích (ha)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {profile.growingAreas.map((area, index) => (
                  <tr key={area.growingAreaId || index} className="hover:bg-emerald-50/40 transition-colors">
                    <td className="py-4 px-4 font-semibold text-gray-900">{area.areaName}</td>
                    <td className="py-4 px-4 text-gray-600">{area.province || '—'}</td>
                    <td className="py-4 px-4 text-gray-600">
                      {[area.ward, area.district].filter(Boolean).join(', ') || '—'}
                    </td>
                    <td className="py-4 px-4 text-right font-semibold text-emerald-700 whitespace-nowrap tabular-nums">
                      {area.areaInHectares ? `${area.areaInHectares} ha` : 'Chưa cập nhật'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="rounded-xl border border-dashed border-gray-200 bg-gray-50/60 px-4 py-5 text-sm text-gray-500">Chưa đăng ký vùng trồng nào.</p>
        )}
      </div>

      {/* Block 3: Thông tin liên hệ */}
      <div className="space-y-6 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6">
        <div className="flex items-center gap-3 border-b border-gray-100 pb-4">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700">
            <UsersRound className="size-[18px]" aria-hidden="true" />
          </span>
          <h2 className="text-base font-bold text-gray-900">Thông tin liên hệ</h2>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-y-5 gap-x-8">
          <div>
            <span className="text-[11px] font-semibold uppercase tracking-wide text-gray-500 block mb-2">
              NGƯỜI ĐẠI DIỆN PHÁP LÝ
            </span>
            <span className="break-words text-sm font-semibold leading-6 text-gray-800">
              {profile.legalRepresentative || 'Chưa cập nhật'}
            </span>
          </div>

          <div>
            <span className="text-[11px] font-semibold uppercase tracking-wide text-gray-500 block mb-2">
              NGƯỜI LIÊN HỆ
            </span>
            <span className="break-words text-sm font-semibold leading-6 text-gray-800">
              {profile.contactPerson}
            </span>
          </div>

          <div>
            <span className="text-[11px] font-semibold uppercase tracking-wide text-gray-500 block mb-2">
              SỐ ĐIỆN THOẠI
            </span>
            <span className="break-words text-sm font-semibold leading-6 text-gray-800">
              {profile.phoneNumber || 'Chưa cập nhật'}
            </span>
          </div>

          <div>
            <span className="text-[11px] font-semibold uppercase tracking-wide text-gray-500 block mb-2">
              EMAIL
            </span>
            <span className="break-all text-sm font-semibold leading-6 text-gray-800">
              {profile.email || 'Chưa cập nhật'}
            </span>
          </div>
        </div>
      </div>

      {/* Block 4: Thông tin sản xuất & Chứng nhận */}
      <div className="space-y-6 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6">
        <div className="flex items-center gap-3 border-b border-gray-100 pb-4">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700">
            <Sprout className="size-[18px]" aria-hidden="true" />
          </span>
          <h2 className="text-base font-bold text-gray-900">Thông tin sản xuất & Chứng nhận</h2>
        </div>
        
        <div className="space-y-4">
          <div>
            <span className="text-[11px] font-semibold uppercase tracking-wide text-gray-500 block mb-3">
              DANH MỤC NÔNG SẢN
            </span>
            <div className="flex flex-wrap gap-2">
              {profile.cropTypes && profile.cropTypes.length > 0 ? (
                profile.cropTypes.map((crop) => (
                  <span 
                    key={crop.cropTypeId} 
                    className="px-3 py-1.5 bg-emerald-50 text-emerald-700 text-xs font-semibold rounded-lg border border-emerald-100"
                  >
                    {crop.cropName}
                  </span>
                ))
              ) : (
                <span className="text-sm text-gray-500">Chưa chọn danh mục</span>
              )}
            </div>
          </div>

          <div>
            <span className="text-[11px] font-semibold uppercase tracking-wide text-gray-500 block mb-3">
              CHỨNG NHẬN
            </span>
            <div className="flex flex-wrap gap-2">
              {profile.certifications && profile.certifications.length > 0 ? (
                profile.certifications.map((cert) => (
                  <span 
                    key={cert.supplierCertificationId} 
                    className="px-3 py-1.5 bg-gray-50 text-gray-700 text-xs font-semibold rounded-lg border border-gray-200"
                  >
                    {cert.certificationName}
                  </span>
                ))
              ) : (
                <span className="text-sm text-gray-500">Không có chứng nhận</span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Block 5: File đính kèm */}
      <div className="space-y-5 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6">
        <div className="flex items-center justify-between gap-3 border-b border-gray-100 pb-4">
          <div className="flex items-center gap-3">
            <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700">
              <Paperclip className="size-[18px]" aria-hidden="true" />
            </span>
            <h2 className="text-base font-bold text-gray-900">File đính kèm</h2>
          </div>
          <span className="rounded-lg border border-gray-200 bg-gray-50 px-2.5 py-1 text-xs font-semibold tabular-nums text-gray-600">
            {profile.documents?.length ?? 0}
          </span>
        </div>
        
        <SupplierDocuments documents={profile.documents ?? []} variant="profile" />
      </div>
    </div>
  );
};
