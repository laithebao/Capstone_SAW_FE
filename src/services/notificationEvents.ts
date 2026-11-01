export const NOTIFICATIONS_CHANGED_EVENT = 'saw:notifications-changed'

export function announceNotificationMutation(method?: string, url?: string) {
  if (!['post', 'put', 'patch', 'delete'].includes(method?.toLowerCase() ?? '')) return
  if (url?.startsWith('/auth/') || url?.startsWith('/notifications')) return
  if (typeof window !== 'undefined') window.dispatchEvent?.(new Event(NOTIFICATIONS_CHANGED_EVENT))
}

// Other users' actions are checked while this tab is visible. Local actions and
// returning to a tab refresh sooner, without reading/acknowledging notifications.
export function watchNotificationUpdates(refresh: () => void) {
  const visibleRefresh = () => { if (document.visibilityState !== 'hidden') refresh() }
  let mutationTimer: ReturnType<typeof window.setTimeout> | undefined
  const onMutation = () => {
    window.clearTimeout(mutationTimer)
    mutationTimer = window.setTimeout(visibleRefresh, 150)
  }
  const interval = window.setInterval(visibleRefresh, 5_000)
  window.addEventListener('focus', visibleRefresh)
  window.addEventListener(NOTIFICATIONS_CHANGED_EVENT, onMutation)
  document.addEventListener('visibilitychange', visibleRefresh)
  return () => {
    window.clearInterval(interval)
    window.clearTimeout(mutationTimer)
    window.removeEventListener('focus', visibleRefresh)
    window.removeEventListener(NOTIFICATIONS_CHANGED_EVENT, onMutation)
    document.removeEventListener('visibilitychange', visibleRefresh)
  }
}
