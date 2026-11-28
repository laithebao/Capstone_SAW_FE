import { normalizeCropWords } from './cropCode.ts'

export function generateCategoryCode(name: string, isChild: boolean): string {
  const words = normalizeCropWords(name)
  return (isChild || words.length < 2 ? words.join('') : words.map(word => word[0]).join('')).slice(0, 30)
}
