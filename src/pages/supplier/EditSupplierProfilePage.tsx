import { SupplierDocumentEditor } from '@/features/supplier/components/SupplierDocuments';
import { optionalNumericInput } from '@/features/supplier/schemas/supplierBatchSchema';
import { updateSupplierProfileSchema } from '@/features/supplier/schemas/supplierProfileSchema';
import FormNotification from '@/components/common/FormNotification';
import { getApiFieldErrors, getHookFormFieldErrors, getValidationFieldErrors, type FormFieldErrors } from '@/utils/formErrors';
import { ROUTES } from '@/constants/routes';
import { supplierAssetUrl, validateSupplierFile } from '@/features/supplier/supplierFiles';
import type { SupplierDocumentDto } from '@/types/supplier';
import { getAuthErrorMessage } from '@/services/authService';
import React, { useEffect, useState, useMemo } from 'react';
import { useForm, useWatch, useFieldArray, type FieldPath, type SubmitHandler } from 'react-hook-form';
import { Link, useNavigate } from 'react-router';
import { supplierService } from '../../services/suppliers/supplierService';
import type {
  DeclareSupplierProfileRequest,
  SupplierCropTypeDto,
  SupplierGrowingAreaDto,
} from '../../types/supplier';

const CERTIFICATE_OPTIONS = ['VietGAP', 'GlobalGAP', 'Organic', 'HACCP', 'Không có chứng nhận'];
const supplierFieldLabels = {
  supplierName: 'Tên doanh nghiệp', taxCode: 'Mã số thuế', supplierType: 'Loại hình',
  legalRepresentative: 'Người đại diện', contactPerson: 'Người liên hệ', phoneNumber: 'Số điện thoại',
  email: 'Email', address: 'Địa chỉ', cropTypeIds: 'Danh mục', growingAreas: 'Vùng trồng',
  logoUrl: 'Ảnh đại diện', evidenceDocumentUrls: 'Tài liệu',
};
const validateField = (field: keyof typeof updateSupplierProfileSchema.shape) => (value: unknown) => {
  const result = updateSupplierProfileSchema.shape[field].safeParse(value);
  return result.success || result.error.issues[0]?.message || 'Giá trị không hợp lệ.';
};

export const EditSupplierProfilePage: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState<boolean>(true);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [growingAreaOptions, setGrowingAreaOptions] = useState<SupplierGrowingAreaDto[]>([]);
  const [cropTypeOptions, setCropTypeOptions] = useState<SupplierCropTypeDto[]>([]);
  const [canCompleteTaxCode, setCanCompleteTaxCode] = useState(false);
  const [notification, setNotification] = useState('');

  // File Upload States
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string>('');
  
  const [existingDocuments, setExistingDocuments] = useState<SupplierDocumentDto[]>([]);
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
    setValue,
    setError,
    clearErrors,
    getFieldState,
    control,
    formState,
  } = useForm<DeclareSupplierProfileRequest>({
    shouldFocusError: false,
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

  const selectedCrops = useWatch({ control, name: 'cropTypeIds' }) || [];
  const selectedCerts = useWatch({ control, name: 'certifications' }) || [];

  const fieldProps = (name: FieldPath<DeclareSupplierProfileRequest>, base = inputStyle) => {
    const error = getFieldState(name, formState).error;
    return { id: `supplier-${name}`, 'aria-invalid': Boolean(error), 'aria-describedby': error ? `supplier-${name}-error` : undefined,
      style: { ...base, ...(error ? { borderColor: '#e11d48', outlineColor: '#e11d48' } : {}) } };
  };
  const fieldError = (name: FieldPath<DeclareSupplierProfileRequest>) => {
    const error = getFieldState(name, formState).error;
    return error?.message && <p id={`supplier-${name}-error`} data-field-error={name} style={{ marginTop: '4px', fontSize: '12px', color: '#b91c1c' }}>{error.message}</p>;
  };
  const showFieldErrors = (fields: FormFieldErrors) => {
    for (const [name, message] of Object.entries(fields)) setError(name as FieldPath<DeclareSupplierProfileRequest>, { type: 'validate', message });
    const first = Object.values(fields)[0];
    setNotification(first ? `${first} Vui lòng kiểm tra các ô được đánh dấu đỏ.` : 'Vui lòng kiểm tra các ô được đánh dấu đỏ.');
  };
  const focusFirstError = () => {
    const input = document.getElementById('supplier-profile-form')?.querySelector<HTMLElement>('[aria-invalid="true"]');
    input?.focus({ preventScroll: true });
    input?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  };

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

  useEffect(() => {
    const fetchCurrentProfile = async () => {
      try {
        setLoading(true);
        const [profile, areas, crops] = await Promise.all([
          supplierService.getMyProfile(),
          supplierService.getGrowingAreas(),
          supplierService.getCropTypes(),
        ]);

        setGrowingAreaOptions(Array.isArray(areas) ? areas : []);
        setCropTypeOptions(Array.isArray(crops) ? crops : []);

        if (profile) {
          setCanCompleteTaxCode(profile.profileStatus === 'PENDING_REVIEW' && profile.taxCode.startsWith('GOOGLE-'));
          const cropTypeIds = profile.cropTypes ? profile.cropTypes.map((c) => Number(c.cropTypeId)) : [];
          const certificationsList = profile.certifications ? profile.certifications.map((c) => c.certificationName) : [];
          const docs = profile.documents ? profile.documents.map((d) => d.fileUrl) : [];

          setExistingDocuments(profile.documents ?? []);
          if (profile.logoUrl) setAvatarPreview(supplierAssetUrl(profile.logoUrl));
          if (profile.supplierCode) setMetaInfo((prev) => ({ ...prev, code: profile.supplierCode }));

          const formattedAreas = (profile.growingAreas || []).map((ga) => ({
            growingAreaId: ga.growingAreaId,
            areaInHectares: ga.areaInHectares || undefined,
          }));

          let rawContact = profile.contactPerson || '';
          let legalRep = profile.legalRepresentative || '';

          if (rawContact.includes('| Đại diện PL:')) {
            const parts = rawContact.split('| Đại diện PL:');
            rawContact = parts[0].trim();
            if (!legalRep) {
              legalRep = parts[1]?.trim() || '';
            }
          }

          reset({
            supplierName: profile.supplierName || '',
            taxCode: profile.taxCode || '',
            supplierType: profile.supplierType || profile.detailedPlantingArea || 'Hợp tác xã',
            legalRepresentative: legalRep,
            contactPerson: rawContact,
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
      const invalid = validateSupplierFile(file, true);
      if (invalid) { setError('logoUrl', { type: 'validate', message: invalid }); setNotification(invalid); return; }
      clearErrors('logoUrl');
      setAvatarFile(file);
      setAvatarPreview(URL.createObjectURL(file));
    }
  };

  const handleCropToggle = (id: number) => {
    const numericId = Number(id);
    if (!numericId) return;

    const current = [...selectedCrops].map(Number);
    const idx = current.indexOf(numericId);
    if (idx > -1) current.splice(idx, 1);
    else current.push(numericId);
    
    setValue('cropTypeIds', current);
    if (current.length > 0) clearErrors('cropTypeIds');
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
    if (isSubmitting) return;
    setNotification('');
    clearErrors();
    const validation = updateSupplierProfileSchema.safeParse(values);
    if (!validation.success) {
      showFieldErrors(getValidationFieldErrors(validation.error.issues));
      return;
    }
    const hasInvalidArea = values.growingAreas?.some(
      (ga) => !ga.growingAreaId || Number(ga.growingAreaId) === 0
    );
    if (hasInvalidArea) {
      showFieldErrors(Object.fromEntries(values.growingAreas.map((area, index) => [index, area] as const)
        .filter(([, area]) => !area.growingAreaId || Number(area.growingAreaId) === 0)
        .map(([index]) => [`growingAreas.${index}.growingAreaId`, 'Vui lòng chọn vùng trồng hợp lệ.'])));
      return;
    }

    setIsSubmitting(true);
    try {
      let finalLogoUrl = values.logoUrl || '';
      if (avatarFile) {
        finalLogoUrl = await supplierService.uploadFile(avatarFile, true);
      }

      let newUploadedUrls: string[] = [];
      if (uploadedFiles.length > 0) {
        newUploadedUrls = await Promise.all(
          uploadedFiles.map((file) => supplierService.uploadFile(file))
        );
      }

      const finalEvidenceUrls = [
        ...existingDocuments.map(doc => doc.fileUrl),
        ...newUploadedUrls.filter(Boolean),
      ];

      const validGrowingAreas = (values.growingAreas || [])
        .filter((ga) => ga && Number(ga.growingAreaId) > 0)
        .map((ga) => ({
          growingAreaId: Number(ga.growingAreaId),
          areaInHectares: ga.areaInHectares ? Number(ga.areaInHectares) : undefined,
        }));

      const payload: DeclareSupplierProfileRequest = {
        ...values,
        ...validation.data,
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
    } catch (err) {
      const labels: Record<string, string> = { ...supplierFieldLabels };
      values.growingAreas.forEach((_, index) => {
        labels[`growingAreas.${index}.growingAreaId`] = 'Vùng trồng';
        labels[`growingAreas.${index}.areaInHectares`] = 'Diện tích';
      });
      const fields = getApiFieldErrors(err, labels);
      for (const [name, message] of Object.entries(fields)) setError(name as FieldPath<DeclareSupplierProfileRequest>, { type: 'server', message });
      const first = Object.values(fields)[0];
      setNotification(first ? `${first} Vui lòng kiểm tra các ô được đánh dấu đỏ.` : getAuthErrorMessage(err, 'Cập nhật thất bại. Vui lòng thử lại.'));
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return <div style={{ padding: '40px', textAlign: 'center', color: '#666' }}>Đang tải thông tin...</div>;
  }

  return (
    <div style={{ backgroundColor: '#f8f9fa', minHeight: '100vh', padding: '24px', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
      <FormNotification message={notification} onDismiss={() => setNotification('')} onViewErrors={Object.keys(formState.errors).length ? focusFirstError : undefined} />
      <form id="supplier-profile-form" noValidate onSubmit={handleSubmit(onSubmit, errors => showFieldErrors(getHookFormFieldErrors(errors)))} style={{ maxWidth: '1200px', margin: '0 auto' }}>
        
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
                      <input type="file" accept="image/jpeg,image/png,image/webp" onChange={handleAvatarChange} style={{ display: 'none' }} />
                    </label>
                  </div>
                  <span style={{ fontSize: '11px', fontWeight: 'bold', color: '#374151', marginTop: '8px', letterSpacing: '0.5px' }}>
                    LOGO / Ảnh ĐẠI DIỆN
                  </span>
                  {fieldError('logoUrl')}
                </div>

                {/* FORM INPUTS */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <div>
                    <label style={labelStyle}>TÊN DOANH NGHIỆP / HỢP TÁC XÃ *</label>
                    <input {...register('supplierName', { validate: validateField('supplierName') })} maxLength={200} {...fieldProps('supplierName')} />
                    {fieldError('supplierName')}
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                    <div>
                      <label style={labelStyle}>MST / MÃ SỐ ĐĂNG KÝ *</label>
                      <input {...register('taxCode', { validate: validateField('taxCode') })} maxLength={50} readOnly={!canCompleteTaxCode} aria-readonly={!canCompleteTaxCode} {...fieldProps('taxCode', { ...inputStyle, ...(!canCompleteTaxCode ? { backgroundColor: '#f1f5f9', color: '#64748b' } : {}) })} />
                      {fieldError('taxCode')}
                      {!canCompleteTaxCode && <p style={{ marginTop: '4px', fontSize: '12px', color: '#64748b' }}>Mã số thuế đã đăng ký không thể thay đổi.</p>}
                    </div>
                    <div>
                      <label style={labelStyle}>LOẠI HÌNH NHÀ CUNG CẤP *</label>
                      <select {...register('supplierType', { validate: validateField('supplierType') })} {...fieldProps('supplierType', selectStyle)}>
                        <option value="Hợp tác xã">Hợp tác xã</option>
                        <option value="Doanh nghiệp">Doanh nghiệp</option>
                        <option value="Hộ kinh doanh">Hộ kinh doanh</option>
                        <option value="Trang trại">Trang trại</option>
                      </select>
                      {fieldError('supplierType')}
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                    <div>
                      <label style={labelStyle}>NGƯỜI ĐẠI DIỆN PHÁP LÝ *</label>
                      <input {...register('legalRepresentative', { validate: validateField('legalRepresentative') })} maxLength={100} placeholder="Họ và tên" {...fieldProps('legalRepresentative')} />
                      {fieldError('legalRepresentative')}
                    </div>
                    <div>
                      <label style={labelStyle}>NGƯỜI LIÊN HỆ *</label>
                      <input {...register('contactPerson', { validate: validateField('contactPerson') })} maxLength={100} placeholder="Họ và tên / SĐT" {...fieldProps('contactPerson')} />
                      {fieldError('contactPerson')}
                    </div>
                  </div>
                </div>

              </div>
            </div>

            <div style={cardStyle}>
              <div style={cardHeaderStyle}>Thông tin liên hệ</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px', padding: '24px' }}>
                <div>
                  <label style={labelStyle}>SỐ ĐIỆN THOẠI LIÊN HỆ</label>
                  <input {...register('phoneNumber', { validate: validateField('phoneNumber') })} type="tel" maxLength={20} placeholder="0901234567 hoặc +84901234567" {...fieldProps('phoneNumber')} />
                  {fieldError('phoneNumber')}
                </div>
                <div>
                  <label style={labelStyle}>EMAIL LIÊN HỆ</label>
                  <input {...register('email', { validate: validateField('email') })} type="email" maxLength={150} {...fieldProps('email')} />
                  {fieldError('email')}
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
                      growingAreaId: 0,
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
                  <input {...register('address', { validate: validateField('address') })} maxLength={500} placeholder="Số nhà, đường, xã/phường, tỉnh/thành..." {...fieldProps('address')} />
                  {fieldError('address')}
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <label style={labelStyle}>DANH SÁCH VÙNG TRỒNG KHAI THÁC *</label>
                  {fieldError('growingAreas')}
                  
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
                            {...register(`growingAreas.${index}.growingAreaId` as const, { valueAsNumber: true, validate: value => value > 0 || 'Vui lòng chọn vùng trồng hợp lệ.' })}
                            {...fieldProps(`growingAreas.${index}.growingAreaId`, { ...selectStyle, backgroundColor: '#ffffff' })}
                          >
                            <option value={0}>-- Chọn Vùng trồng --</option>
                            {growingAreaOptions.map((area) => (
                              <option key={area.growingAreaId} value={area.growingAreaId}>
                                {area.areaName} ({[area.ward, area.district, area.province].filter(Boolean).join(', ')})
                              </option>
                            ))}
                          </select>
                          {fieldError(`growingAreas.${index}.growingAreaId`)}
                        </div>

                        <div>
                          <label style={{ ...labelStyle, fontSize: '10px', color: '#6b7280' }}>
                            DIỆN TÍCH (HA)
                          </label>
                          <input
                            type="number"
                            step="0.1"
                            {...register(`growingAreas.${index}.areaInHectares` as const, { setValueAs: optionalNumericInput })}
                            placeholder="VD: 5.5"
                            {...fieldProps(`growingAreas.${index}.areaInHectares`, { ...inputStyle, backgroundColor: '#ffffff' })}
                          />
                          {fieldError(`growingAreas.${index}.areaInHectares`)}
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
            <div style={cardStyle} id="supplier-cropTypeIds" tabIndex={-1} aria-invalid={Boolean(getFieldState('cropTypeIds', formState).error)} aria-describedby={getFieldState('cropTypeIds', formState).error ? 'supplier-cropTypeIds-error' : undefined}>
              <div style={cardHeaderStyle}>🚜 Thông tin sản xuất</div>
              <div style={{ padding: '20px' }}>
                <label style={{ ...labelStyle, marginBottom: '12px', display: 'block' }}>DANH MỤC NÔNG SẢN *</label>
                
                {Object.keys(groupedCropTypes).length === 0 ? (
                  <div style={{ fontSize: '13px', color: '#6b7280', fontStyle: 'italic' }}>
                    Chưa có dữ liệu cây trồng hoặc đang tải...
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    {Object.entries(groupedCropTypes).map(([category, crops]) => (
                      <div key={category} style={{ borderBottom: '1px dashed #e5e7eb', paddingBottom: '12px' }}>
                        <div style={{ fontSize: '12px', fontWeight: 'bold', color: '#059669', marginBottom: '8px', textTransform: 'uppercase' }}>
                          📁 {category}
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
                          {crops.map((crop) => {
                            const isChecked = selectedCrops.map(Number).includes(Number(crop.cropTypeId));
                            return (
                              <label key={crop.cropTypeId} style={{ display: 'flex', alignItems: 'center', fontSize: '14px', color: '#374151', cursor: 'pointer' }}>
                                <input
                                  type="checkbox"
                                  checked={isChecked}
                                  onChange={() => handleCropToggle(crop.cropTypeId)}
                                  style={{ marginRight: '8px' }}
                                />
                                {crop.cropName}
                              </label>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                {fieldError('cropTypeIds')}
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
                <Link to={ROUTES.CHANGE_PASSWORD} className="inline-flex min-h-11 items-center justify-center rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50">Đổi mật khẩu</Link>
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
                
                <SupplierDocumentEditor existing={existingDocuments} pending={uploadedFiles}
                  onExistingChange={setExistingDocuments} onPendingChange={setUploadedFiles} disabled={isSubmitting} variant="profile" />


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
