import { z } from 'zod'

const vietnamPhonePattern = /^(?:0\d{9}|\+84\d{9})$/

export const registerSchema = z
  .object({
    username: z.string().trim().min(3, 'Tên đăng nhập phải có ít nhất 3 ký tự.').max(100),
    fullName: z
      .string()
      .trim()
      .min(2, 'Họ và tên phải có ít nhất 2 ký tự.')
      .max(150, 'Họ và tên không được vượt quá 150 ký tự.'),
    email: z
      .string()
      .trim()
      .min(1, 'Vui lòng nhập email.')
      .email('Email không đúng định dạng.')
      .max(255, 'Email không được vượt quá 255 ký tự.'),
    phoneNumber: z
      .string()
      .trim()
      .transform((value) => value.replace(/[\s.-]/g, ''))
      .refine((value) => vietnamPhonePattern.test(value), 'Số điện thoại Việt Nam không hợp lệ.'),
    roleId: z.coerce.number().refine((value) => value === 5 || value === 6, 'Vui lòng chọn vai trò hợp lệ.'),
    organizationName: z.string().trim().min(2, 'Vui lòng nhập tên tổ chức.').max(200),
    taxCode: z.string().trim().min(3, 'Vui lòng nhập mã số thuế.').max(50),
    address: z.string().trim().max(500).optional(),
    password: z
      .string()
      .min(8, 'Mật khẩu phải có ít nhất 8 ký tự.')
      .max(72, 'Mật khẩu không được vượt quá 72 ký tự.')
      .regex(/[a-z]/, 'Mật khẩu cần có chữ thường.')
      .regex(/[A-Z]/, 'Mật khẩu cần có chữ hoa.')
      .regex(/\d/, 'Mật khẩu cần có chữ số.')
      .regex(/[^A-Za-z0-9]/, 'Mật khẩu cần có ký tự đặc biệt.'),
    confirmPassword: z.string().min(1, 'Vui lòng xác nhận mật khẩu.'),
    acceptTerms: z.boolean().refine((value) => value, 'Bạn cần đồng ý với điều khoản sử dụng.'),
  })
  .refine((values) => values.password === values.confirmPassword, {
    message: 'Mật khẩu xác nhận không khớp.',
    path: ['confirmPassword'],
  })

export type RegisterFormValues = z.input<typeof registerSchema>
