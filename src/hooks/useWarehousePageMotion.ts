import { useLayoutEffect } from 'react'
import type { RefObject } from 'react'

const candidateSelector = [
  'header', '.wm-card', '.inv-card', '.cap-stat', '.wm-panel', '.inv-panel', '.cap-panel',
  'section', 'form:not([role=dialog])',
].join(',')

/** Adds entry motion to visible page blocks once per route, without remounting content. */
export function useWarehousePageMotion(active: boolean, route: string, root: RefObject<HTMLElement | null>) {

  useLayoutEffect(() => {
    const container = root.current
    if (!active || !container || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

    const seen = new WeakSet<Element>()
    const chartKeys = new Set<string>()
    const animations = new Set<Animation>()
    let stopped = false
    let frame = 0
    const selectors = container.closest('.saw-admin-ui') ? `${candidateSelector},article,aside` : candidateSelector
    const show = () => {
      frame = 0
      if (stopped) return
      const nodes = [...container.querySelectorAll<HTMLElement>(selectors)].filter(el => {
        if (seen.has(el) || el.matches('.wm-metrics, .inv-metrics, .saw-capacity') || el.closest('[role=dialog], [role=alertdialog]') || !el.getClientRects().length) return false
        const parent = el.parentElement?.closest(selectors)
        return !parent || !container.contains(parent) || parent === container || parent.matches('.wm-metrics, .inv-metrics, .saw-capacity')
      })
      const rowTops = [...new Set(nodes.map(el => Math.round(el.getBoundingClientRect().top + window.scrollY)))].sort((a, b) => a - b)
      for (const el of nodes) {
        seen.add(el)
        const y = Math.round(el.getBoundingClientRect().top + window.scrollY)
        const index = Math.max(0, rowTops.findIndex(top => Math.abs(top - y) < 3))
        const isTableBlock = el.matches('table, .cap-panel, .inv-panel:not(.inv-composition)') || !!el.querySelector('table')
        const keyframes = isTableBlock
          ? [{ opacity: 0 }, { opacity: 1 }]
          : [{ opacity: 0, transform: 'scale(.97)' }, { opacity: 1, transform: 'scale(1.008)', offset: .7 }, { opacity: 1, transform: 'scale(1)' }]
        const animation = el.animate(keyframes, {duration:500,delay:Math.min(index * 150,600),easing:'cubic-bezier(.22,1,.36,1)',fill:'backwards'})
        animations.add(animation)
        animation.finished.catch(() => undefined).finally(() => animations.delete(animation))
      }
      const charts = container.querySelectorAll<HTMLElement>('.wm-bar > span, .wm-stockbar > span, .inv-chart-bar > span, .inv-bar > span, .cap-bar > span, .ad-state-bar > span, [data-saw-donut]')
      charts.forEach(el => {
        if (seen.has(el) || !el.getClientRects().length) return
        const parent = el.parentElement
        const key = parent?.getAttribute('aria-label')
        const chartKey = key ? key + ':' + (parent ? Array.from(parent.children).indexOf(el) : 0) : undefined
        if (chartKey && chartKeys.has(chartKey)) return
        if (chartKey) chartKeys.add(chartKey)
        seen.add(el)
        const donut = el.hasAttribute('data-saw-donut')
        if (donut) { el.classList.add('saw-chart-sweep'); el.addEventListener('animationend', () => el.classList.remove('saw-chart-sweep'), { once:true }); return }
        const animation = el.animate([{transform:'scaleX(0)'},{transform:'scaleX(1)'}], {duration:750,delay:150,easing:'cubic-bezier(.22,1,.36,1)',fill:'backwards'})
        animations.add(animation); animation.finished.catch(() => undefined).finally(() => animations.delete(animation))
      })
    }
    frame = requestAnimationFrame(show)
    const observer = new MutationObserver(() => { if (!frame) frame = requestAnimationFrame(show) })
    observer.observe(container, {childList:true,subtree:true})
    const timer = window.setTimeout(() => observer.disconnect(), 1800)
    return () => { stopped = true; cancelAnimationFrame(frame); clearTimeout(timer); observer.disconnect(); animations.forEach(animation => animation.cancel()) }
  }, [active, route, root])
}
