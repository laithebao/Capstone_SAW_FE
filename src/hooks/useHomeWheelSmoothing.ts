import { useEffect } from 'react'

/** Smooth discrete mouse-wheel steps without taking over touch or small trackpad gestures. */
export function useHomeWheelSmoothing() {
  useEffect(() => {
    const motionAllowed = window.matchMedia('(pointer: fine) and (prefers-reduced-motion: no-preference)')
    let frame = 0
    let target = window.scrollY
    let lastTime = 0

    const stop = () => {
      if (frame) cancelAnimationFrame(frame)
      frame = 0
      lastTime = 0
      target = window.scrollY
    }

    const animate = (time: number) => {
      const elapsed = lastTime ? Math.min(time - lastTime, 50) : 16
      lastTime = time
      const next = window.scrollY + (target - window.scrollY) * (1 - Math.exp(-elapsed / 140))
      if (Math.abs(target - next) < 0.5 || Math.abs(next - window.scrollY) < 0.5) {
        window.scrollTo({ top: target, behavior: 'instant' })
        stop()
        return
      }
      window.scrollTo({ top: next, behavior: 'instant' })
      frame = requestAnimationFrame(animate)
    }

    const onWheel = (event: WheelEvent) => {
      const delta = event.deltaMode === WheelEvent.DOM_DELTA_LINE ? event.deltaY * 16 : event.deltaY
      const isDiscreteWheel = event.deltaMode === WheelEvent.DOM_DELTA_LINE ||
        (event.deltaMode === WheelEvent.DOM_DELTA_PIXEL && Math.abs(event.deltaY) >= 80 && Number.isInteger(event.deltaY))
      if (!motionAllowed.matches || !event.cancelable || event.defaultPrevented || event.ctrlKey || event.metaKey || !isDiscreteWheel || Math.abs(event.deltaX) > Math.abs(event.deltaY)) {
        stop()
        return
      }

      let element = event.target instanceof Element ? event.target : null
      if (element?.closest('input, textarea, select, [contenteditable="true"]')) return
      while (element && element !== document.body && element !== document.documentElement) {
        const style = getComputedStyle(element)
        if (/(auto|scroll)/.test(style.overflowY) && element.scrollHeight > element.clientHeight &&
          (delta < 0 ? element.scrollTop > 0 : element.scrollTop + element.clientHeight < element.scrollHeight - 1)) {
          stop()
          return
        }
        element = element.parentElement
      }

      const max = Math.max(0, document.documentElement.scrollHeight - window.innerHeight)
      if (!frame || Math.sign(target - window.scrollY) !== Math.sign(delta)) target = window.scrollY
      const nextTarget = Math.max(0, Math.min(max, target + delta))
      if (nextTarget === window.scrollY && !frame) return
      event.preventDefault()
      target = nextTarget
      if (!frame) frame = requestAnimationFrame(animate)
    }

    const onPreferenceChange = () => { if (!motionAllowed.matches) stop() }
    window.addEventListener('wheel', onWheel, { passive: false })
    window.addEventListener('keydown', stop)
    window.addEventListener('pointerdown', stop)
    window.addEventListener('touchstart', stop, { passive: true })
    motionAllowed.addEventListener('change', onPreferenceChange)
    return () => {
      stop()
      window.removeEventListener('wheel', onWheel)
      window.removeEventListener('keydown', stop)
      window.removeEventListener('pointerdown', stop)
      window.removeEventListener('touchstart', stop)
      motionAllowed.removeEventListener('change', onPreferenceChange)
    }
  }, [])
}
