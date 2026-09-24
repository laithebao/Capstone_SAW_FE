import { z } from 'zod';

export const supplierGrowingAreaInputSchema = z.object({
  growingAreaId: z
    .number({ message: 'Vui lòng chọn vùng trồng' })
    .min(1, 'Vui lòng chọn vùng trồng'),
  areaInHectares: z
    .coerce
    .number({ message: 'Diện tích phải là một số.' })
    .positive('Diện tích phải lớn hơn 0.')
    .optional()
    .nullable(),
});

export const declareSupplierProfileSchema = z.object({
  supplierName: z
    .string()
    .min(1, 'Tên doanh nghiệp / hợp tác xã không được để trống.')
    .max(200, 'Tên doanh nghiệp không vượt quá 200 ký tự.'),
  taxCode: z
    .string()
    .min(1, 'Mã số thuế / Mã số đăng ký không được để trống.')
    .max(50, 'Mã số thuế không vượt quá 50 ký tự.'),
  supplierType: z.string().optional(),
  legalRepresentative: z
    .string()
    .min(1, 'Người đại diện pháp lý không được để trống.')
    .max(100, 'Người đại diện không vượt quá 100 ký tự.'),
  contactPerson: z
    .string()
    .min(1, 'Người liên hệ không được để trống.')
    .max(100, 'Người liên hệ không vượt quá 100 ký tự.'),
  // Bỏ optional(), bắt buộc nhập số điện thoại
  phoneNumber: z
    .string()
    .min(1, 'Số điện thoại không được để trống.')
    .regex(/^[0-9]{10,11}$/, 'Số điện thoại không hợp lệ (10-11 chữ số).'),
  // Bỏ optional(), bắt buộc nhập email
  email: z
    .string()
    .min(1, 'Email không được để trống.')
    .email('Định dạng email không hợp lệ.'),
  logoUrl: z.string().optional(),
  address: z
    .string()
    .min(1, 'Địa chỉ không được để trống.')
    .max(500, 'Địa chỉ không vượt quá 500 ký tự.'),
  growingAreas: z
    .array(supplierGrowingAreaInputSchema)
    .min(1, 'Vui lòng chọn ít nhất một vùng trồng.'),
  cropTypeIds: z
    .array(z.number())
    .min(1, 'Vui lòng chọn ít nhất một danh mục nông sản cung cấp.'),
  certifications: z.array(z.string()),
  evidenceDocumentUrls: z.array(z.string()).optional(),
});

export type DeclareSupplierProfileFormValues = z.infer<
  typeof declareSupplierProfileSchema
>;