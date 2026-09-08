export function formatDate(
  value: Date | string | null | undefined,
  options: Intl.DateTimeFormatOptions = {},
  locale = 'vi-VN',
): string {
  if (!value) return '—'

  const date = value instanceof Date ? value : new Date(value)

  if (Number.isNaN(date.getTime())) return '—'

  return new Intl.DateTimeFormat(locale, options).format(date)
}
