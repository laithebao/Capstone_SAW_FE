import { z } from 'zod'

const vietnamPhonePattern = /^(?:0\d{9}|\+84\d{9})$/

export const registerSchema = z
  .object({
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
    password: z
      .string()
      .min(8, 'Mật khẩu phải có ít nhất 8 ký tự.')
      .max(72, 'Mật khẩu không được vượt quá 72 ký tự.')
      .regex(/[a-z]/, 'Mật khẩu cần có chữ thường.')
      .regex(/[A-Z]/, 'Mật khẩu cần có chữ hoa.')
      .regex(/\d/, 'Mật khẩu cần có chữ số.'),
    confirmPassword: z.string().min(1, 'Vui lòng xác nhận mật khẩu.'),
    acceptTerms: z.boolean().refine((value) => value, 'Bạn cần đồng ý với điều khoản sử dụng.'),
  })
  .refine((values) => values.password === values.confirmPassword, {
    message: 'Mật khẩu xác nhận không khớp.',
    path: ['confirmPassword'],
  })

export type RegisterFormValues = z.input<typeof registerSchema>
