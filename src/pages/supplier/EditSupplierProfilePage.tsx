import React, { useEffect, useState } from 'react';
import { useForm, useFieldArray, type SubmitHandler } from 'react-hook-form';
import { useNavigate } from 'react-router';
import { supplierService } from '../../services/suppliers/supplierService';
import type {
  DeclareSupplierProfileRequest,
  SupplierGrowingAreaDto,
  SupplierProfileResponse,
} from '../../types/supplier';

const CERTIFICATE_OPTIONS = ['VietGAP', 'GlobalGAP', 'Organic', 'HACCP', 'Không có chứng nhận'];

const CROP_OPTIONS = [
  { id: 1, label: 'Lúa gạo' },
  { id: 2, label: 'Ngô' },
  { id: 3, label: 'Cà phê' },
  { id: 4, label: 'Trái cây' },
  { id: 5, label: 'Rau củ' },
];

export const EditSupplierProfilePage: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState<boolean>(true);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [growingAreaOptions, setGrowingAreaOptions] = useState<SupplierGrowingAreaDto[]>([]);

  // File Upload States
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string>('');
  
  const [existingDocumentUrls, setExistingDocumentUrls] = useState<string[]>([]);
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);

  // System Metadata Info
  const [metaInfo, setMetaInfo] = useState({
    code: 'NCC-2023-089',
    createdAt: '12/08/2023 14:30',
    updatedAt: '15/09/2023 09:15',
    createdBy: 'Nguyễn Văn A',
  });

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    control,
  } = useForm<DeclareSupplierProfileRequest>({
    defaultValues: {
      supplierName: '',
      taxCode: '',
      supplierType: 'Hợp tác xã',
      legalRepresentative: '',
      contactPerson: '',
      phoneNumber: '',
      email: '',
      logoUrl: '',
      address: '',
      growingAreas: [],
      cropTypeIds: [],
      certifications: [],
      evidenceDocumentUrls: [],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'growingAreas',
  });

  const selectedCrops = watch('cropTypeIds') || [];
  const selectedCerts = watch('certifications') || [];

  useEffect(() => {
    const fetchCurrentProfile = async () => {
      try {
        setLoading(true);
        const [profile, areas] = await Promise.all([
          supplierService.getMyProfile(),
          supplierService.getGrowingAreas(),
        ]);

        setGrowingAreaOptions(areas || []);

        if (profile) {
          const cropTypeIds = profile.cropTypes ? profile.cropTypes.map((c) => c.cropTypeId) : [];
          const certificationsList = profile.certifications ? profile.certifications.map((c) => c.certificationName) : [];
          const docs = profile.documents ? profile.documents.map((d) => d.fileUrl) : [];

          setExistingDocumentUrls(docs);
          if (profile.logoUrl) setAvatarPreview(profile.logoUrl);
          if (profile.supplierCode) setMetaInfo((prev) => ({ ...prev, code: profile.supplierCode }));

          const formattedAreas = (profile.growingAreas || []).map((ga) => ({
            growingAreaId: ga.growingAreaId,
            areaInHectares: ga.areaInHectares || undefined,
          }));

          reset({
            supplierName: profile.supplierName || '',
            taxCode: profile.taxCode || '',
            supplierType: profile.supplierType || 'Hợp tác xã',
            legalRepresentative: profile.legalRepresentative || '',
            contactPerson: profile.contactPerson || '',
            phoneNumber: profile.phoneNumber || '',
            email: profile.email || '',
            logoUrl: profile.logoUrl || '',
            address: profile.address || '',
            growingAreas: formattedAreas,
            cropTypeIds: cropTypeIds,
            certifications: certificationsList,
            evidenceDocumentUrls: docs,
          });
        }
      } catch (err) {
        console.error('Lỗi khi tải thông tin:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchCurrentProfile();
  }, [reset]);

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setAvatarFile(file);
      setAvatarPreview(URL.createObjectURL(file));
    }
  };

  const handleDocumentChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newFiles = Array.from(e.target.files);
      setUploadedFiles((prev) => [...prev, ...newFiles]);
    }
  };

  const handleCropToggle = (id: number) => {
    const current = [...selectedCrops];
    const idx = current.indexOf(id);
    if (idx > -1) current.splice(idx, 1);
    else current.push(id);
    setValue('cropTypeIds', current);
  };

  const handleCertToggle = (cert: string) => {
    let current = [...selectedCerts];
    if (cert === 'Không có chứng nhận') {
      current = ['Không có chứng nhận'];
    } else {
      current = current.filter((c) => c !== 'Không có chứng nhận');
      const idx = current.indexOf(cert);
      if (idx > -1) current.splice(idx, 1);
      else current.push(cert);
    }
    setValue('certifications', current);
  };

  const onSubmit: SubmitHandler<DeclareSupplierProfileRequest> = async (values) => {
    // 1. Kiểm tra nếu người dùng thêm vùng trồng nhưng chưa chọn từ dropdown (đang là 0 hoặc chưa chọn)
    const hasInvalidArea = values.growingAreas?.some(
      (ga) => !ga.growingAreaId || Number(ga.growingAreaId) === 0
    );
    if (hasInvalidArea) {
      alert('Vui lòng chọn tên Vùng trồng hợp lệ cho tất cả các dòng đã thêm!');
      return;
    }

    setIsSubmitting(true);
    try {
      let finalLogoUrl = values.logoUrl || '';
      if (avatarFile) {
        finalLogoUrl = await supplierService.uploadFile(avatarFile);
      }

      let newUploadedUrls: string[] = [];
      if (uploadedFiles.length > 0) {
        newUploadedUrls = await Promise.all(
          uploadedFiles.map((file) => supplierService.uploadFile(file))
        );
      }

      const finalEvidenceUrls = [
        ...existingDocumentUrls,
        ...newUploadedUrls.filter(Boolean),
      ];

      // 2. Lọc bỏ tuyệt đối các vùng trồng rỗng/không hợp lệ để ngăn chặn gửi ID = 0 lên server
      const validGrowingAreas = (values.growingAreas || [])
        .filter((ga) => ga && Number(ga.growingAreaId) > 0)
        .map((ga) => ({
          growingAreaId: Number(ga.growingAreaId),
          areaInHectares: ga.areaInHectares ? Number(ga.areaInHectares) : undefined,
        }));

      const payload: DeclareSupplierProfileRequest = {
        ...values,
        address: values.address.trim(),
        logoUrl: finalLogoUrl,
        growingAreas: validGrowingAreas,
        cropTypeIds: (values.cropTypeIds || []).map((id) => Number(id)),
        certifications: values.certifications || [],
        evidenceDocumentUrls: finalEvidenceUrls,
      };

      await supplierService.updateProfile(payload);
      alert('Cập nhật thông tin thành công!');
      navigate('/supplier/profile');
    } catch (err: any) {
      console.error('Submit Error:', err);
      alert('Cập nhật thất bại: ' + (err?.response?.data?.message || err.message));
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return <div style={{ padding: '40px', textAlign: 'center', color: '#666' }}>Đang tải thông tin...</div>;
  }

  return (
    <div style={{ backgroundColor: '#f8f9fa', minHeight: '100vh', padding: '24px', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
      <form onSubmit={handleSubmit(onSubmit)} style={{ maxWidth: '1200px', margin: '0 auto' }}>
        
        {/* HEADER TRANG */}
        <div style={{ marginBottom: '20px' }}>
          <h1 style={{ fontSize: '26px', fontWeight: 'bold', margin: '0 0 4px 0', color: '#111' }}>Chỉnh sửa Nhà cung cấp</h1>
          <p style={{ color: '#6b7280', fontSize: '14px', margin: 0 }}>Cập nhật thông tin chi tiết cho {metaInfo.code}</p>
        </div>

        {/* BỐ CỤC 2 CỘT */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: '20px', alignItems: 'start' }}>
          
          {/* ================= CỘT TRÁI (FORM CHÍNH) ================= */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            
            {/* CARD 1: THÔNG TIN CƠ BẢN */}
            <div style={cardStyle}>
              <div style={cardHeaderStyle}>📄 Thông tin cơ bản</div>
              <div style={{ padding: '20px' }}>
                
                {/* LOGO UPLOAD */}
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '24px' }}>
                  <div style={{ position: 'relative', width: '90px', height: '90px', borderRadius: '12px', overflow: 'hidden', border: '1px solid #e5e7eb', backgroundColor: '#f3f4f6' }}>
                    <img
                      src={avatarPreview || 'https://via.placeholder.com/90'}
                      alt="Avatar"
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                    <label style={{ position: 'absolute', bottom: '4px', right: '4px', backgroundColor: '#333', color: '#fff', borderRadius: '50%', padding: '6px', cursor: 'pointer', display: 'flex' }}>
                      📷
                      <input type="file" accept="image/*" onChange={handleAvatarChange} style={{ display: 'none' }} />
                    </label>
                  </div>
                  <span style={{ fontSize: '11px', fontWeight: 'bold', color: '#374151', marginTop: '8px', letterSpacing: '0.5px' }}>
                    LOGO / Ảnh ĐẠI DIỆN
                  </span>
                </div>

                {/* FORM INPUTS */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <div>
                    <label style={labelStyle}>TÊN DOANH NGHIỆP / HỢP TÁC XÃ *</label>
                    <input {...register('supplierName', { required: true })} style={inputStyle} />
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                    <div>
                      <label style={labelStyle}>MST / MÃ SỐ ĐĂNG KÝ *</label>
                      <input {...register('taxCode', { required: true })} style={inputStyle} />
                    </div>
                    <div>
                      <label style={labelStyle}>LOẠI HÌNH NHÀ CUNG CẤP *</label>
                      <select {...register('supplierType')} style={selectStyle}>
                        <option value="Hợp tác xã">Hợp tác xã</option>
                        <option value="Doanh nghiệp">Doanh nghiệp</option>
                        <option value="Hộ kinh doanh">Hộ kinh doanh</option>
                        <option value="Trang trại">Trang trại</option>
                      </select>
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                    <div>
                      <label style={labelStyle}>NGƯỜI ĐẠI DIỆN PHÁP LÝ *</label>
                      <input {...register('legalRepresentative')} placeholder="Họ và tên" style={inputStyle} />
                    </div>
                    <div>
                      <label style={labelStyle}>NGƯỜI LIÊN HỆ *</label>
                      <input {...register('contactPerson')} placeholder="Họ và tên / SĐT" style={inputStyle} />
                    </div>
                  </div>
                </div>

              </div>
            </div>

            {/* CARD 2: VÙNG TRỒNG CHI TIẾT & ĐỊA CHỈ */}
            <div style={cardStyle}>
              <div style={{ ...cardHeaderStyle, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span>📍 Vùng trồng chi tiết & Địa chỉ</span>
                <button
                  type="button"
                  onClick={() =>
                    append({
                      growingAreaId: 0, // Mặc định hiển thị option "-- Chọn Vùng trồng --"
                      areaInHectares: undefined,
                    })
                  }
                  style={{
                    backgroundColor: '#059669',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: '6px',
                    padding: '6px 12px',
                    fontSize: '12px',
                    fontWeight: 'bold',
                    cursor: 'pointer',
                  }}
                >
                  + Thêm vùng trồng
                </button>
              </div>
              <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                
                <div>
                  <label style={labelStyle}>ĐỊA CHỈ TRỤ SỞ CHI TIẾT *</label>
                  <input {...register('address', { required: true })} placeholder="Số nhà, đường, xã/phường, tỉnh/thành..." style={inputStyle} />
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <label style={labelStyle}>DANH SÁCH VÙNG TRỒNG KHAI THÁC *</label>
                  
                  {fields.length === 0 ? (
                    <div style={{ padding: '16px', border: '1px dashed #d1d5db', borderRadius: '6px', textAlign: 'center', fontSize: '13px', color: '#6b7280' }}>
                      Chưa chọn vùng trồng nào. Hãy bấm nút "+ Thêm vùng trồng" ở trên.
                    </div>
                  ) : (
                    fields.map((field, index) => (
                      <div
                        key={field.id}
                        style={{
                          display: 'grid',
                          gridTemplateColumns: '1fr 140px 40px',
                          gap: '12px',
                          alignItems: 'center',
                          backgroundColor: '#fafafa',
                          padding: '12px',
                          borderRadius: '6px',
                          border: '1px solid #e5e7eb',
                        }}
                      >
                        <div>
                          <label style={{ ...labelStyle, fontSize: '10px', color: '#6b7280' }}>
                            VÙNG TRỒNG #{index + 1}
                          </label>
                          <select
                            {...register(`growingAreas.${index}.growingAreaId` as const, { valueAsNumber: true })}
                            style={{ ...selectStyle, backgroundColor: '#ffffff' }}
                          >
                            <option value={0}>-- Chọn Vùng trồng --</option>
                            {growingAreaOptions.map((area) => (
                              <option key={area.growingAreaId} value={area.growingAreaId}>
                                {area.areaName} ({[area.ward, area.district, area.province].filter(Boolean).join(', ')})
                              </option>
                            ))}
                          </select>
                        </div>

                        <div>
                          <label style={{ ...labelStyle, fontSize: '10px', color: '#6b7280' }}>
                            DIỆN TÍCH (HA)
                          </label>
                          <input
                            type="number"
                            step="0.1"
                            {...register(`growingAreas.${index}.areaInHectares` as const, { valueAsNumber: true })}
                            placeholder="VD: 5.5"
                            style={{ ...inputStyle, backgroundColor: '#ffffff' }}
                          />
                        </div>

                        <button
                          type="button"
                          onClick={() => remove(index)}
                          style={{
                            marginTop: '16px',
                            backgroundColor: 'transparent',
                            color: '#ef4444',
                            border: 'none',
                            fontSize: '18px',
                            cursor: 'pointer',
                          }}
                          title="Xóa vùng trồng"
                        >
                          🗑️
                        </button>
                      </div>
                    ))
                  )}
                </div>

              </div>
            </div>

            {/* CARD 3: THÔNG TIN SẢN XUẤT */}
            <div style={cardStyle}>
              <div style={cardHeaderStyle}>🚜 Thông tin sản xuất</div>
              <div style={{ padding: '20px' }}>
                <label style={{ ...labelStyle, marginBottom: '12px', display: 'block' }}>DANH MỤC NÔNG SẢN *</label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
                  {CROP_OPTIONS.map((crop) => {
                    const isChecked = selectedCrops.includes(crop.id);
                    return (
                      <label key={crop.id} style={{ display: 'flex', alignItems: 'center', fontSize: '14px', color: '#374151', cursor: 'pointer' }}>
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => handleCropToggle(crop.id)}
                          style={{ marginRight: '8px' }}
                        />
                        {crop.label}
                      </label>
                    );
                  })}
                </div>
              </div>
            </div>

          </div>


          {/* ================= CỘT PHẢI (SIDEBAR ACTION) ================= */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            
            {/* HÀNH ĐỘNG */}
            <div style={cardStyle}>
              <div style={{ padding: '16px', fontWeight: 'bold', fontSize: '15px', borderBottom: '1px solid #eee' }}>
                Hành động
              </div>
              <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  style={{
                    backgroundColor: '#374151',
                    color: '#fff',
                    border: 'none',
                    padding: '10px',
                    borderRadius: '6px',
                    fontWeight: 'bold',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                  }}
                >
                  💾 {isSubmitting ? 'Đang lưu...' : 'Lưu thay đổi'}
                </button>

                <button
                  type="button"
                  onClick={() => navigate(-1)}
                  style={{
                    backgroundColor: '#fff',
                    color: '#374151',
                    border: '1px solid #d1d5db',
                    padding: '10px',
                    borderRadius: '6px',
                    fontWeight: '500',
                    cursor: 'pointer',
                  }}
                >
                  ✕ Hủy
                </button>
              </div>

              {/* METADATA */}
              <div style={{ padding: '16px', borderTop: '1px solid #eee', fontSize: '12px', color: '#6b7280', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Tạo lúc:</span>
                  <span style={{ color: '#374151' }}>{metaInfo.createdAt}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Cập nhật cuối:</span>
                  <span style={{ color: '#374151' }}>{metaInfo.updatedAt}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Người tạo:</span>
                  <span style={{ color: '#374151' }}>{metaInfo.createdBy}</span>
                </div>
              </div>
            </div>

            {/* CHỨNG NHẬN */}
            <div style={cardStyle}>
              <div style={{ padding: '16px', fontWeight: 'bold', fontSize: '15px', borderBottom: '1px solid #eee' }}>
                Chứng nhận
              </div>
              <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {CERTIFICATE_OPTIONS.map((cert) => {
                  const isChecked = selectedCerts.includes(cert);
                  return (
                    <label
                      key={cert}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        padding: '10px 12px',
                        backgroundColor: '#f3f4f6',
                        border: isChecked ? '1px solid #4b5563' : '1px solid #e5e7eb',
                        borderRadius: '6px',
                        fontSize: '14px',
                        color: '#374151',
                        cursor: 'pointer',
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => handleCertToggle(cert)}
                        style={{ marginRight: '10px' }}
                      />
                      {cert}
                    </label>
                  );
                })}
              </div>
            </div>

            {/* FILE ĐÍNH KÈM */}
            <div style={cardStyle}>
              <div style={{ padding: '16px', fontWeight: 'bold', fontSize: '15px', borderBottom: '1px solid #eee' }}>
                📎 File đính kèm
              </div>
              <div style={{ padding: '16px' }}>
                
                {/* DRAG DROP AREA */}
                <label style={{
                  border: '2px dashed #d1d5db',
                  borderRadius: '8px',
                  padding: '20px 12px',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: '#fafafa',
                  cursor: 'pointer',
                }}>
                  <div style={{ fontSize: '28px', color: '#9ca3af', marginBottom: '8px' }}>☁️</div>
                  <span style={{ fontSize: '13px', fontWeight: 'bold', color: '#374151', textAlign: 'center' }}>
                    Kéo thả hoặc nhấn để tải lên
                  </span>
                  <span style={{ fontSize: '11px', color: '#9ca3af', marginTop: '4px' }}>
                    Hỗ trợ: PDF, JPG, PNG (Tối đa 10MB/file)
                  </span>
                  <input type="file" multiple onChange={handleDocumentChange} style={{ display: 'none' }} />
                </label>

                {/* DANH SÁCH TỆP */}
                <div style={{ marginTop: '16px' }}>
                  <div style={{ fontSize: '11px', fontWeight: 'bold', color: '#6b7280', marginBottom: '8px' }}>
                    DANH SÁCH TÀI LIỆU ĐÃ CHỌN
                  </div>
                  
                  {existingDocumentUrls.length === 0 && uploadedFiles.length === 0 ? (
                    <span style={{ fontSize: '13px', color: '#9ca3af', fontStyle: 'italic' }}>Chưa có tệp nào được chọn</span>
                  ) : (
                    <ul style={{ paddingLeft: '16px', margin: 0, fontSize: '12px', color: '#374151' }}>
                      {existingDocumentUrls.map((url, i) => (
                        <li key={`exist-${i}`} style={{ marginBottom: '4px' }}>
                          <a href={url} target="_blank" rel="noreferrer" style={{ color: '#2563eb' }}>Tài liệu {i + 1}</a>
                        </li>
                      ))}
                      {uploadedFiles.map((file, i) => (
                        <li key={`new-${i}`} style={{ color: '#059669', marginBottom: '4px' }}>
                          {file.name} (mới)
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

              </div>
            </div>

          </div>

        </div>
      </form>
    </div>
  );
};

// CSS STYLES
const cardStyle: React.CSSProperties = {
  backgroundColor: '#ffffff',
  borderRadius: '8px',
  border: '1px solid #e5e7eb',
  overflow: 'hidden',
};

const cardHeaderStyle: React.CSSProperties = {
  backgroundColor: '#f3f4f6',
  padding: '12px 20px',
  fontWeight: 'bold',
  fontSize: '15px',
  color: '#1f2937',
  borderBottom: '1px solid #e5e7eb',
};

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: '11px',
  fontWeight: 'bold',
  color: '#4b5563',
  marginBottom: '6px',
  letterSpacing: '0.3px',
};

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '10px 12px',
  backgroundColor: '#eeeeee',
  border: '1px solid #d1d5db',
  borderRadius: '6px',
  fontSize: '14px',
  color: '#1f2937',
  boxSizing: 'border-box',
};

const selectStyle: React.CSSProperties = {
  width: '100%',
  padding: '10px 12px',
  backgroundColor: '#eeeeee',
  border: '1px solid #d1d5db',
  borderRadius: '6px',
  fontSize: '14px',
  color: '#1f2937',
  boxSizing: 'border-box',
};

export default EditSupplierProfilePage;