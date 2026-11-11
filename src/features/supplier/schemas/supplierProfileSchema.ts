import { z } from 'zod';
import { isVietnamPhone, normalizePhone } from '@/utils/contactValidation';

export const supplierContactSchema = z.object({
  phoneNumber: z.string().trim().max(20, 'Số điện thoại không vượt quá 20 ký tự.')
    .refine(value => value === '' || isVietnamPhone(value), 'Số điện thoại Việt Nam không hợp lệ. Nhập 10 chữ số bắt đầu bằng 0 hoặc +84 và 9 chữ số.')
    .transform(normalizePhone).optional(),
  email: z.string().trim().max(150, 'Email không vượt quá 150 ký tự.')
    .refine(value => value === '' || z.email().safeParse(value).success, 'Email không đúng định dạng.').optional(),
});

export const supplierGrowingAreaInputSchema = z.object({
  growingAreaId: z
    .number({ message: 'Vui lòng chọn vùng trồng' })
    .min(1, 'Vui lòng chọn vùng trồng'),
  areaInHectares: z
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
    .trim()
    .min(1, 'Số điện thoại không được để trống.')
    .max(20, 'Số điện thoại không vượt quá 20 ký tự.')
    .refine(isVietnamPhone, 'Số điện thoại Việt Nam không hợp lệ. Nhập 10 chữ số bắt đầu bằng 0 hoặc +84 và 9 chữ số.')
    .transform(normalizePhone),
  // Bỏ optional(), bắt buộc nhập email
  email: z
    .string()
    .trim()
    .min(1, 'Email không được để trống.')
    .max(150, 'Email không vượt quá 150 ký tự.')
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

export const updateSupplierProfileSchema = declareSupplierProfileSchema.pick({
  supplierName: true, taxCode: true, supplierType: true, legalRepresentative: true,
  contactPerson: true, address: true, cropTypeIds: true,
}).extend({
  supplierName: z.string().trim().min(1, 'Tên doanh nghiệp không được để trống.').max(200, 'Tên doanh nghiệp không vượt quá 200 ký tự.'),
  taxCode: z.string().trim().min(1, 'Mã số thuế không được để trống.').max(50, 'Mã số thuế không vượt quá 50 ký tự.'),
  supplierType: z.string().max(100, 'Loại hình không vượt quá 100 ký tự.').optional(),
  legalRepresentative: z.string().trim().min(1, 'Người đại diện pháp lý không được để trống.').max(100, 'Người đại diện không vượt quá 100 ký tự.'),
  contactPerson: z.string().trim().min(1, 'Người liên hệ không được để trống.').max(100, 'Người liên hệ không vượt quá 100 ký tự.'),
  address: z.string().trim().min(1, 'Địa chỉ không được để trống.').max(500, 'Địa chỉ không vượt quá 500 ký tự.'),
  ...supplierContactSchema.shape,
});
