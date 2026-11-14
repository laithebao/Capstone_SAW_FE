export const normalizePhone = (value: string) => value.trim().replace(/[\s.-]/g, '')

export const isVietnamPhone = (value: string) => /^(?:0\d{9}|\+84\d{9})$/.test(normalizePhone(value))
