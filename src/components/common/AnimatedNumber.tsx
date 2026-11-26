import { useLayoutEffect, useRef } from 'react'

type Props = { value: string | number; delay?: number }

/** Presentation-only count-up for explicitly selected, formatted metrics. */
export function AnimatedNumber({ value, delay = 150 }: Props) {
  const text = typeof value === 'number' && Number.isFinite(value) ? new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 12 }).format(value) : String(value)
  const match = text.match(/^(-?[\d.]+(?:,\d+)?)(\s*(?:kg|%|lô|vị trí)?)$/i)
  const target = typeof value === 'number' ? value : match ? Number(match[1].replace(/\./g, '').replace(',', '.')) : NaN
  const digits = match?.[1].split(',')[1]?.length ?? 0
  const suffix = match?.[2] ?? ''
  const ref = useRef<HTMLSpanElement>(null)
  const displayed = useRef<number | null>(null)
  const previous = useRef<number | null>(null)

  useLayoutEffect(() => {
    const el = ref.current
    if (!el || !Number.isFinite(target)) { displayed.current = null; previous.current = null; return }
    if (previous.current === target && displayed.current === target) return
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)')
    const formatter = new Intl.NumberFormat('vi-VN', { maximumFractionDigits: digits, minimumFractionDigits: digits })
    const start = displayed.current ?? 0
    const first = previous.current === null
    previous.current = target
    let frame = 0
    let begin: number | undefined
    const render = (valueToShow: number) => { displayed.current = valueToShow; el.textContent = `${formatter.format(valueToShow)}${suffix}` }
    const tick = (timestamp: number) => {
      begin ??= timestamp + (first ? delay : 0)
      const block = el.closest<HTMLElement>('.wm-card, .inv-card, .cap-stat')
      if (first && timestamp >= begin && block && Number.parseFloat(getComputedStyle(block).opacity) < 0.02) {
        begin = timestamp
        frame = requestAnimationFrame(tick)
        return
      }
      const progress = Math.min(1, Math.max(0, (timestamp - begin) / 750))
      render(start + (target - start) * (1 - (1 - progress) ** 3))
      if (progress < 1) frame = requestAnimationFrame(tick)
      else if (start !== target) el.animate([{ transform: 'scale(1)' }, { transform: 'scale(1.06)', offset: .5 }, { transform: 'scale(1)' }], { duration: 230, easing: 'ease-out' })
    }
    if (reduce.matches) render(target)
    else { render(start); frame = requestAnimationFrame(tick) }
    const onReduce = () => { if (reduce.matches) { cancelAnimationFrame(frame); render(target) } }
    reduce.addEventListener('change', onReduce)
    return () => { cancelAnimationFrame(frame); reduce.removeEventListener('change', onReduce) }
  }, [target, digits, suffix, delay])

  if (!match || !Number.isFinite(target)) return <>{value}</>
  return <span className="saw-number" aria-label={text}><span ref={ref} aria-hidden="true">{text}</span></span>
}
