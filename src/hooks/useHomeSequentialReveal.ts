import { useEffect } from 'react'

/** Reveal each visible group in order and hide it in reverse when scrolling past. */
export function useHomeSequentialReveal(scope: 'home' | 'catalog' = 'home', catalogVersion?: unknown) {
  useEffect(() => {
    const page = document.querySelector<HTMLElement>('.saw-home')
    if (!page || !('IntersectionObserver' in window)) return

    const preference = window.matchMedia('(prefers-reduced-motion: reduce)')
    const definitions: Array<[string, string]> = scope === 'catalog' ? [
      ['.home-catalog-grid', ':scope > article'],
    ] : [
      ['.home-overview-heading', ':scope > *'],
      ['.home-features', ':scope > article'],
      ['.home-catalog-heading > div', ':scope > *'],
      ['.home-quality-copy', ':scope > *'],
      ['.home-quality', ':scope > .home-quality-image'],
      ['.home-process-heading > div', ':scope > *'],
      ['.home-steps', ':scope > article'],
      ['.home-partner-heading', ':scope > *'],
      ['.home-partner-list', ':scope > article'],
      ['.home-faq-heading', ':scope > *'],
      ['.home-faq-list', ':scope > details'],
      ['.home-footer-inner', ':scope > div'],
    ]
    let disconnect = () => {}

    const setup = () => {
      disconnect()
      if (preference.matches) return
      const observers: IntersectionObserver[] = []
      const managed: HTMLElement[] = []
      const groups: HTMLElement[] = []
      for (const [containerSelector, itemSelector] of definitions) {
        const container = page.querySelector<HTMLElement>(containerSelector)
        if (!container) continue
        const items = Array.from(container.querySelectorAll<HTMLElement>(itemSelector))
        if (!items.length) continue
        let wasVisible = false

        const itemObserver = new IntersectionObserver((entries) => {
          for (const entry of entries) {
            if (!entry.isIntersecting) continue
            const item = entry.target as HTMLElement
            item.style.setProperty('--home-sequence-delay', `${items.indexOf(item) * 150}ms`)
            item.classList.add('home-sequence-shown')
          }
        }, { rootMargin: '0px 0px -8% 0px', threshold: 0 })

        const groupObserver = new IntersectionObserver(([entry]) => {
          if (entry.isIntersecting) {
            wasVisible = true
            items.forEach((item) => itemObserver.observe(item))
            // Some items can remain in the viewport while the group crosses its
            // narrower boundary, so their individual observers may not fire again.
            items.forEach((item, index) => {
              const bounds = item.getBoundingClientRect()
              if (bounds.bottom > 0 && bounds.top < window.innerHeight * 0.92) {
                item.style.setProperty('--home-sequence-delay', `${index * 150}ms`)
                item.classList.add('home-sequence-shown')
              }
            })
            return
          }
          if (!wasVisible) return
          itemObserver.disconnect()
          const exitingAtTop = entry.boundingClientRect.bottom <= (entry.rootBounds?.top ?? 0)
          items.forEach((item, index) => {
            item.style.setProperty('--home-sequence-delay', exitingAtTop ? `${(items.length - index - 1) * 150}ms` : '0ms')
            item.classList.remove('home-sequence-shown')
          })
          wasVisible = false
        }, { rootMargin: '-25% 0px -8% 0px', threshold: 0 })

        container.classList.add('home-sequence-group')
        groups.push(container)
        items.forEach((item) => {
          item.classList.add('home-sequence-item')
          managed.push(item)
          itemObserver.observe(item)
        })
        groupObserver.observe(container)
        observers.push(itemObserver, groupObserver)
      }
      disconnect = () => {
        observers.forEach((observer) => observer.disconnect())
        managed.forEach((item) => {
          item.classList.remove('home-sequence-item', 'home-sequence-shown')
          item.style.removeProperty('--home-sequence-delay')
        })
        groups.forEach((group) => group.classList.remove('home-sequence-group'))
      }
    }

    setup()
    preference.addEventListener('change', setup)
    return () => {
      preference.removeEventListener('change', setup)
      disconnect()
    }
  }, [scope, catalogVersion])
}
