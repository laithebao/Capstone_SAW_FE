import { useEffect, useState } from 'react'
import { getAuthErrorMessage } from '@/services/authService'

export function useDistributorResource<T>(load: (signal: AbortSignal) => Promise<T>) {
  const [data, setData] = useState<T | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [version, setVersion] = useState(0)
  useEffect(() => {
    const controller = new AbortController()
    const timer = window.setTimeout(async () => {
      setLoading(true); setData(null); setError(null)
      try { const result = await load(controller.signal); if (!controller.signal.aborted) setData(result) }
      catch (cause) { if (!controller.signal.aborted) setError(getAuthErrorMessage(cause, 'Không thể tải dữ liệu. Vui lòng thử lại.')) }
      finally { if (!controller.signal.aborted) setLoading(false) }
    }, 0)
    return () => { controller.abort(); window.clearTimeout(timer) }
  }, [load, version])
  useEffect(() => {
    const refresh = () => setVersion(v => v + 1)
    window.addEventListener('focus', refresh)
    return () => window.removeEventListener('focus', refresh)
  }, [])
  return { data, loading, error, reload: () => setVersion(v => v + 1) }
}
