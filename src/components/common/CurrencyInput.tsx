import { useRef } from 'react'
import { formatCurrencyInput, parseCurrencyInput } from '@/utils/currency'
export default function CurrencyInput({ value, onChange, className }: { value: string; onChange: (v: string) => void; className?: string }) {
  const ref = useRef<HTMLInputElement>(null)
  return <input ref={ref} aria-label="Đơn giá thu mua" inputMode="decimal" required className={className} value={formatCurrencyInput(value)} placeholder="Ví dụ: 25.000" onKeyDown={e => {
    const field = e.currentTarget, start = field.selectionStart ?? 0, end = field.selectionEnd ?? start
    if (start !== end || e.ctrlKey || e.metaKey || e.altKey) return
    // Skip a generated grouping separator so backspace/delete removes a digit.
    if (e.key === 'Backspace' && start > 0 && field.value[start - 1] === '.') field.setSelectionRange(start - 1, start - 1)
    if (e.key === 'Delete' && field.value[start] === '.') field.setSelectionRange(start + 1, start + 1)
  }} onChange={e => {
    const raw = e.target.value, pos = e.target.selectionStart ?? raw.length
    const semantic = raw.slice(0, pos).replace(/\./g, '').length
    const parsed = parseCurrencyInput(raw); if (parsed === null) return
    onChange(parsed)
    requestAnimationFrame(() => { const field = ref.current; if (!field) return; let count = 0, caret = 0; for (; caret < field.value.length && count < semantic; caret++) if (field.value[caret] !== '.') count++; field.setSelectionRange(caret, caret) })
  }} />
}
