import React from 'react';
import { 
  Building2, 
  MapPin, 
  FileText, 
  Download, 
  Pencil 
} from 'lucide-react';
import type { SupplierProfileResponse } from '../../types/supplier';

interface SupplierProfileViewProps {
  profile: SupplierProfileResponse;
  onEdit?: () => void;
}

export const SupplierProfileView: React.FC<SupplierProfileViewProps> = ({ profile, onEdit }) => {
  return (
    <div className="max-w-6xl mx-auto space-y-6 p-6 bg-gray-50 min-h-screen">
      {/* Header Page */}
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">Hồ sơ Nhà cung cấp</h1>
        {onEdit && (
          <button
            onClick={onEdit}
            className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white font-medium rounded-lg shadow-sm transition-colors"
          >
            <Pencil className="w-4 h-4" />
            Chỉnh sửa thông tin
          </button>
        )}
      </div>

      {/* Block 1: Thông tin cơ bản */}
      <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 space-y-6">
        <h2 className="text-lg font-semibold text-gray-800">Thông tin cơ bản</h2>
        
        <div className="flex items-start gap-4 pb-6 border-b border-gray-100">
          <div className="w-20 h-20 rounded-2xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600 font-bold text-xl overflow-hidden shrink-0">
            {profile.logoUrl ? (
              <img src={profile.logoUrl} alt={profile.supplierName} className="w-full h-full object-cover" />
            ) : (
              <Building2 className="w-10 h-10 text-emerald-500" />
            )}
          </div>
          <div>
            <h3 className="text-xl font-bold text-gray-900">{profile.supplierName}</h3>
            {profile.operatingRegion && (
              <p className="flex items-center gap-1.5 text-sm text-gray-500 mt-1">
                <MapPin className="w-4 h-4 text-gray-400" />
                {profile.operatingRegion}
              </p>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-y-4 gap-x-8">
          <div>
            <span className="text-xs font-semibold uppercase tracking-wider text-gray-400 block mb-1">
              LOẠI HÌNH
            </span>
            <span className="text-sm font-medium text-gray-800">
              {profile.supplierType || 'N/A'}
            </span>
          </div>

          <div>
            <span className="text-xs font-semibold uppercase tracking-wider text-gray-400 block mb-1">
              MÃ SỐ THUẾ / ĐKKD
            </span>
            <span className="text-sm font-medium text-gray-800">
              {profile.taxCode}
            </span>
          </div>

          <div className="md:col-span-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-gray-400 block mb-1">
              ĐỊA CHỈ
            </span>
            <span className="text-sm font-medium text-gray-800">
              {profile.address}
            </span>
          </div>

          <div className="md:col-span-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-gray-400 block mb-1">
              VÙNG HOẠT ĐỘNG
            </span>
            <span className="text-sm font-medium text-gray-800">
              {profile.operatingRegion || 'Chưa cập nhật'}
            </span>
          </div>
        </div>
      </div>

      {/* Block 2: Thông tin liên hệ */}
      <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 space-y-6">
        <h2 className="text-lg font-semibold text-gray-800">Thông tin liên hệ</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-y-4 gap-x-8">
          <div>
            <span className="text-xs font-semibold uppercase tracking-wider text-gray-400 block mb-1">
              NGƯỜI ĐẠI DIỆN PHÁP LÝ
            </span>
            <span className="text-sm font-medium text-gray-800">
              {profile.legalRepresentative || 'Chưa cập nhật'}
            </span>
          </div>

          <div>
            <span className="text-xs font-semibold uppercase tracking-wider text-gray-400 block mb-1">
              NGƯỜI LIÊN HỆ
            </span>
            <span className="text-sm font-medium text-gray-800">
              {profile.contactPerson}
            </span>
          </div>

          <div>
            <span className="text-xs font-semibold uppercase tracking-wider text-gray-400 block mb-1">
              SỐ ĐIỆN THOẠI
            </span>
            <span className="text-sm font-medium text-gray-800">
              {profile.phoneNumber || 'Chưa cập nhật'}
            </span>
          </div>

          <div>
            <span className="text-xs font-semibold uppercase tracking-wider text-gray-400 block mb-1">
              EMAIL
            </span>
            <span className="text-sm font-medium text-gray-800">
              {profile.email || 'Chưa cập nhật'}
            </span>
          </div>
        </div>
      </div>

      {/* Block 3: Thông tin sản xuất */}
      <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 space-y-6">
        <h2 className="text-lg font-semibold text-gray-800">Thông tin sản xuất</h2>
        
        <div className="space-y-4">
          <div>
            <span className="text-xs font-semibold uppercase tracking-wider text-gray-400 block mb-2">
              DANH MỤC NÔNG SẢN
            </span>
            <div className="flex flex-wrap gap-2">
              {profile.cropTypes && profile.cropTypes.length > 0 ? (
                profile.cropTypes.map((crop) => (
                  <span 
                    key={crop.cropTypeId} 
                    className="px-3 py-1 bg-emerald-50 text-emerald-700 text-sm font-medium rounded-md border border-emerald-100"
                  >
                    {crop.cropName}
                  </span>
                ))
              ) : (
                <span className="text-sm text-gray-400">Chưa chọn danh mục</span>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-y-4 gap-x-8 pt-2">
            <div>
              <span className="text-xs font-semibold uppercase tracking-wider text-gray-400 block mb-1">
                VÙNG TRỒNG CHI TIẾT
              </span>
              <span className="text-sm font-medium text-gray-800">
                {profile.detailedPlantingArea || 'Chưa cập nhật'}
              </span>
            </div>

            <div>
              <span className="text-xs font-semibold uppercase tracking-wider text-gray-400 block mb-1">
                DIỆN TÍCH CANH TÁC
              </span>
              <span className="text-sm font-medium text-gray-800">
                {profile.farmingAreaHa ? `${profile.farmingAreaHa} ha` : 'Chưa cập nhật'}
              </span>
            </div>
          </div>

          <div>
            <span className="text-xs font-semibold uppercase tracking-wider text-gray-400 block mb-2">
              CHỨNG NHẬN
            </span>
            <div className="flex flex-wrap gap-2">
              {profile.certifications && profile.certifications.length > 0 ? (
                profile.certifications.map((cert) => (
                  <span 
                    key={cert.supplierCertificationId} 
                    className="px-3 py-1 bg-gray-100 text-gray-700 text-sm font-medium rounded-md"
                  >
                    {cert.certificationName}
                  </span>
                ))
              ) : (
                <span className="text-sm text-gray-400">Không có chứng nhận</span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Block 4: File đính kèm */}
      <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 space-y-4">
        <h2 className="text-lg font-semibold text-gray-800">File đính kèm</h2>
        
        {profile.documents && profile.documents.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {profile.documents.map((doc, idx) => (
              <div 
                key={idx} 
                className="flex items-center justify-between p-4 rounded-lg border border-gray-200 hover:border-gray-300 transition-colors bg-white"
              >
                <div className="flex items-center gap-3 overflow-hidden">
                  <div className="p-2 rounded-lg bg-gray-50 text-gray-500 shrink-0">
                    <FileText className="w-5 h-5" />
                  </div>
                  <div className="truncate">
                    <p className="text-sm font-medium text-gray-800 truncate">{doc.fileName}</p>
                    {doc.fileSizeMb && (
                      <p className="text-xs text-gray-400">{doc.fileSizeMb} MB</p>
                    )}
                  </div>
                </div>
                <a 
                  href={doc.fileUrl} 
                  target="_blank" 
                  rel="noreferrer" 
                  className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <Download className="w-4 h-4" />
                </a>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-gray-400 italic">Không có tài liệu đính kèm.</p>
        )}
      </div>
    </div>
  );
};