import { z } from 'zod'

export const loginSchema = z.object({
  identifier: z.string().trim().min(1, 'Vui lòng nhập email hoặc tên đăng nhập.'),
  password: z.string().min(1, 'Vui lòng nhập mật khẩu.'),
  rememberMe: z.boolean(),
})

export type LoginFormValues = z.infer<typeof loginSchema>
