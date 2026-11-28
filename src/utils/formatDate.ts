import { formatVietnam } from './vietnamTime'

export function formatDate(
  value: Date | string | null | undefined,
  options: Intl.DateTimeFormatOptions = {},
  locale = 'vi-VN',
): string {
  return formatVietnam(value, options, locale)
}
