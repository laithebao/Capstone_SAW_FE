export function formatNumber(
  value: number | null | undefined,
  options: Intl.NumberFormatOptions = {},
  locale = 'vi-VN',
): string {
  if (value == null || !Number.isFinite(value)) return '—'

  return new Intl.NumberFormat(locale, options).format(value)
}
