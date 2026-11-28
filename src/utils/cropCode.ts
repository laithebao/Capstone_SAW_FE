export const normalizeCropWords = (text: string) => text.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[đĐ]/g, 'D').toUpperCase().match(/[A-Z0-9]+/g) ?? []
const words = normalizeCropWords
export function generateCropCode(parentCode: string, childCode: string, childName: string, name: string, createdAt = new Date()) {
  const tokens = words(name), prefix = words(childName)
  const remainder = prefix.length && prefix.every((token, i) => tokens[i] === token) ? tokens.slice(prefix.length) : tokens
  const normalized = (remainder.length ? remainder : tokens).join('')
  if (!parentCode || !childCode || !normalized) return ''
  const parts = new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Ho_Chi_Minh', day: '2-digit', month: '2-digit', year: 'numeric' }).formatToParts(createdAt)
  const date = ['day', 'month', 'year'].map(type => parts.find(p => p.type === type)?.value).join('')
  return `${parentCode}_${childCode}_${normalized}_${date}`
}
