import { useLayoutEffect, useRef, useState } from 'react'
import type { HTMLAttributes, ReactNode } from 'react'

interface Props extends HTMLAttributes<HTMLElement> {
  children: ReactNode
  changeKey: string | null
  as?: 'div' | 'main' | 'aside'
  enabled?: boolean
}

/** Fades the previous content before showing the latest change, without remounting stable children. */
export default function DistributorFade({ children, changeKey, as: Tag = 'div', enabled = true, ...attributes }: Props) {
  const [shown, setShown] = useState({ key: changeKey, content: children })
  const elementRef = useRef<HTMLElement>(null)
  const nextContent = useRef(children)
  const interruptedOpacity = useRef<number | null>(null)
  const changing = shown.key !== changeKey

  if (enabled && (!changing || shown.key === null) && (changing || shown.content !== children)) {
    setShown({ key: changeKey, content: children })
  }

  useLayoutEffect(() => {
    nextContent.current = children
  }, [children])

  useLayoutEffect(() => {
    if (!enabled) return
    const element = elementRef.current
    const canAnimate = element?.animate && !window.matchMedia('(prefers-reduced-motion: reduce)').matches

    if (!canAnimate) {
      if (!changing) return
      const frame = requestAnimationFrame(() => setShown({ key: changeKey, content: nextContent.current }))
      return () => cancelAnimationFrame(frame)
    }

    const startOpacity = interruptedOpacity.current ?? (changing ? 1 : 0.15)
    interruptedOpacity.current = null
    const animation = changing
      ? element.animate([{ opacity: startOpacity }, { opacity: 0.15 }], { duration: 105, easing: 'ease-in', fill: 'forwards' })
      : element.animate([{ opacity: startOpacity }, { opacity: 1 }], { duration: 185, easing: 'ease-out' })

    if (changing) {
      void animation.finished.then(
        () => setShown({ key: changeKey, content: nextContent.current }),
        () => undefined,
      )
    }

    return () => {
      if (animation.playState === 'running') interruptedOpacity.current = Number(getComputedStyle(element).opacity)
      animation.cancel()
    }
  }, [changeKey, changing, enabled])

  if (!enabled) return children
  if (shown.key === null) return null
  return <Tag {...attributes} ref={element => { elementRef.current = element }} inert={changing}>{changing ? shown.content : children}</Tag>
}
