let homeScrollBeforeNavigation = 0
let pendingHomeScroll: number | null = null

export function restoreInterruptedHomeScroll() {
  if (pendingHomeScroll === null) return
  window.scrollTo({ top: pendingHomeScroll, behavior: 'instant' })
  pendingHomeScroll = null
}

/** Show a non-interactive ripple while navigation proceeds immediately. */
export function showNavigationRipple(button: HTMLElement, direction: 'out' | 'in' | 'back' = 'out') {
  document.querySelectorAll('.home-navigation-ripple--held').forEach((element) => element.remove())
  const previous = document.querySelector<HTMLElement>('.home-navigation-ripple:not(.home-navigation-ripple--held)')
  if (previous) previous.style.animationPlayState = 'paused'
  const previousStyle = previous ? getComputedStyle(previous) : null
  const interrupted = previous && !previous.classList.contains('home-navigation-ripple--back') && !previous.classList.contains(`home-navigation-ripple--${direction}`)
    ? {
        size: parseFloat(previousStyle!.getPropertyValue('--home-wipe-size')),
        x: parseFloat(previousStyle!.getPropertyValue('--ripple-x')),
        y: parseFloat(previousStyle!.getPropertyValue('--ripple-y')),
      }
    : null
  if (direction === 'out') homeScrollBeforeNavigation = window.scrollY
  if (direction !== 'out') pendingHomeScroll = interrupted ? homeScrollBeforeNavigation : null
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    previous?.remove()
    return
  }

  const bounds = button.getBoundingClientRect()
  const page = document.querySelector('#root')?.firstElementChild
  if (!(page instanceof HTMLElement)) {
    previous?.remove()
    return
  }
  const x = bounds.left + bounds.width / 2
  const y = bounds.top + bounds.height / 2
  const radius = Math.hypot(Math.max(x, window.innerWidth - x), Math.max(y, window.innerHeight - y)) + 16
  const startSize = interrupted && Number.isFinite(interrupted.size)
    ? Math.max(0, interrupted.size)
    : direction === 'out' ? 0 : radius
  const startX = interrupted && Number.isFinite(interrupted.x) ? interrupted.x : x
  const startY = interrupted && Number.isFinite(interrupted.y) ? interrupted.y : y
  const distance = direction === 'out' ? Math.max(0, radius - startSize) : startSize
  const duration = direction === 'back' ? 400 : Math.max(180, Math.min(900, 900 * distance / radius))
  const ripple = document.createElement('div')
  ripple.className = `home-navigation-ripple home-navigation-ripple--${direction}`
  ripple.setAttribute('aria-hidden', 'true')
  ripple.inert = true
  ripple.style.setProperty('--ripple-start-x', `${startX}px`)
  ripple.style.setProperty('--ripple-start-y', `${startY}px`)
  ripple.style.setProperty('--ripple-end-x', `${x}px`)
  ripple.style.setProperty('--ripple-end-y', `${y}px`)
  ripple.style.setProperty('--ripple-start-size', `${startSize}px`)
  ripple.style.setProperty('--ripple-radius', `${radius}px`)
  ripple.style.setProperty('--ripple-duration', `${duration}ms`)
  const snapshot = page.cloneNode(true) as HTMLElement
  const animated = new Set(page.getAnimations({ subtree: true }).map((animation) => animation.effect instanceof KeyframeEffect ? animation.effect.target : null))
  const originals = [page, ...page.querySelectorAll<HTMLElement>('*')]
  const copies = [snapshot, ...snapshot.querySelectorAll<HTMLElement>('*')]
  const googleFrames: Array<{ original: HTMLIFrameElement; placeholder: HTMLElement }> = []
  originals.forEach((original, index) => {
    if (original instanceof HTMLIFrameElement && original.src.includes('accounts.google.com/gsi/')) {
      const placeholder = document.createElement('div')
      placeholder.className = 'home-ripple-google-placeholder'
      placeholder.textContent = 'Đăng nhập với Google'
      placeholder.style.width = `${original.getBoundingClientRect().width || 400}px`
      placeholder.style.height = `${original.getBoundingClientRect().height || 44}px`
      copies[index].replaceWith(placeholder)
      googleFrames.push({ original, placeholder })
    }
    if (!animated.has(original)) return
    const copy = copies[index]
    const style = getComputedStyle(original)
    copy.style.setProperty('animation', 'none', 'important')
    copy.style.setProperty('transition', 'none', 'important')
    for (const property of ['opacity', 'transform', 'visibility']) {
      copy.style.setProperty(property, style.getPropertyValue(property), 'important')
    }
  })
  snapshot.removeAttribute('id')
  snapshot.querySelectorAll('[id]').forEach((element) => element.removeAttribute('id'))
  snapshot.style.marginTop = `${-window.scrollY}px`
  ripple.appendChild(snapshot)
  const cleanup = () => {
    ripple.remove()
    previous?.remove()
  }
  ripple.addEventListener('animationend', (event) => {
    if (event.target === ripple) cleanup()
  })
  if (previous && interrupted) {
    previous.style.setProperty('--home-wipe-size', `${interrupted.size}px`)
    previous.style.setProperty('--ripple-x', `${interrupted.x}px`)
    previous.style.setProperty('--ripple-y', `${interrupted.y}px`)
    previous.style.animation = 'none'
    previous.classList.add('home-navigation-ripple--held')
  } else previous?.remove()
  document.body.appendChild(ripple)
  for (const { original, placeholder } of googleFrames) {
    const parent = placeholder.parentElement as (HTMLElement & { moveBefore?: (node: Node, child: Node | null) => void }) | null
    if (!parent?.moveBefore || !original.isConnected) continue
    try {
      // Atomic moves preserve Google's embedded browsing context instead of reloading it.
      parent.moveBefore(original, placeholder)
      placeholder.remove()
    } catch {
      // Browsers without state-preserving moves keep the static visual placeholder.
    }
  }
  window.setTimeout(() => {
    if (!ripple.classList.contains('home-navigation-ripple--held')) cleanup()
  }, 1200)
}
