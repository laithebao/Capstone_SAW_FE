import { z } from 'zod'
import { isVietnamPhone, normalizePhone } from '@/utils/contactValidation'

const phoneNumberSchema = z.string().trim().max(30, 'Số điện thoại không được vượt quá 30 ký tự.')
  .transform(normalizePhone)
  .refine(value => value === '' || isVietnamPhone(value), 'Số điện thoại Việt Nam không hợp lệ. Nhập 10 chữ số bắt đầu bằng 0 hoặc +84 và 9 chữ số.')
  .transform(value => value || null).nullable()

const emailSchema = z.string().trim().max(255, 'Email liên hệ không được vượt quá 255 ký tự.')
  .refine(value => value === '' || z.email().safeParse(value).success, 'Email liên hệ không đúng định dạng.')
  .transform(value => value || null).nullable()

const optionalText = (max: number, label: string) => z.string().trim().max(max, `${label} không được vượt quá ${max} ký tự.`).transform(value => value || null).nullable()

export const userProfileSchema = z.object({
  fullName: z.string().trim().min(1, 'Họ và tên không được để trống.').max(150, 'Họ và tên không được vượt quá 150 ký tự.'),
  phoneNumber: phoneNumberSchema,
  distributor: z.object({
    distributorName: z.string().trim().min(1, 'Tên nhà phân phối không được để trống.').max(200, 'Tên nhà phân phối không được vượt quá 200 ký tự.'),
    contactPerson: optionalText(150, 'Người liên hệ'),
    phoneNumber: phoneNumberSchema,
    email: emailSchema,
    address: optionalText(500, 'Địa chỉ'),
  }).nullable(),
})
