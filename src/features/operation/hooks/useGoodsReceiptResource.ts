import { useEffect, useState } from 'react'
import { getAuthErrorMessage } from '@/services/authService'

// Abort stale selection/page requests; focus refresh follows the receiving update screen.
export function useGoodsReceiptResource<T>(load: (signal: AbortSignal) => Promise<T>, refreshOnFocus = false) {
  const [data, setData] = useState<T | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [version, setVersion] = useState(0)
  useEffect(() => {
    const controller = new AbortController()
    const timer = window.setTimeout(async () => {
      setLoading(true); setError(null)
      try {
        const result = await load(controller.signal)
        if (!controller.signal.aborted) setData(result)
      } catch (cause) {
        if (!controller.signal.aborted) { setData(null); setError(getAuthErrorMessage(cause, 'Không thể tải dữ liệu phiếu nhập. Vui lòng thử lại.')) }
      } finally { if (!controller.signal.aborted) setLoading(false) }
    }, 0)
    return () => { controller.abort(); window.clearTimeout(timer) }
  }, [load, version])
  useEffect(() => {
    if (!refreshOnFocus) return
    const refresh = () => setVersion(v => v + 1)
    window.addEventListener('focus', refresh)
    return () => window.removeEventListener('focus', refresh)
  }, [refreshOnFocus])
  return { data, loading, error, reload: () => setVersion(v => v + 1) }
}
