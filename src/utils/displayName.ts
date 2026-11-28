export function capitalizeFirst(value: string) {
  const [first = '', ...rest] = Array.from(value.trim().normalize('NFC'))
  return first.toLocaleUpperCase('vi-VN') + rest.join('')
}
