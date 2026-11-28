export function formatCurrencyInput(value: string) {
  if (!value) return ''
  const [whole, fraction] = value.split('.')
  return whole.replace(/\B(?=(\d{3})+(?!\d))/g, '.') + (fraction !== undefined ? ',' + fraction : '')
}
export function parseCurrencyInput(text: string): string | null {
  const clean = text.replace(/[\s₫đ]/g, '')
  if (!clean) return ''
  // This parser consumes Vietnamese display text, including partially edited grouping.
  // A dot is always a grouping separator; canonical decimals never pass through here.
  let raw = clean.replace(/\./g, '').replace(',', '.')
  if (!/^\d*(?:\.\d{0,2})?$/.test(raw)) return null
  raw = raw.replace(/^0+(?=\d)/, '')
  if (raw.startsWith('.')) raw = '0' + raw
  return raw
}
export function isValidPrice(value: string) {
  if (!/^\d{1,16}(?:\.\d{1,2})?$/.test(value)) return false
  const [whole, fraction = ''] = value.split('.')
  return BigInt(whole) * 100n + BigInt(fraction.padEnd(2, '0')) > 0n
}
