import { useEffect, useRef, useState } from 'react'
import { Download, ExternalLink, QrCode, RefreshCw } from 'lucide-react'
import { getAuthErrorMessage } from '@/services/authService'
import { downloadQrPng, getProductBatchQrCode } from '@/services/qrCodeService'
import type { ProductBatchQrCode } from '@/types/qrCode'

export default function ProductBatchQrCodeCard({ batchId }: { batchId: number }) {
  const [qr, setQr] = useState<ProductBatchQrCode | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [downloadError, setDownloadError] = useState<string | null>(null)
  const [downloading, setDownloading] = useState(false)
  const [reloadKey, setReloadKey] = useState(0)
  const downloadController = useRef<AbortController | null>(null)

  useEffect(() => {
    const controller = new AbortController()
    let timer: number | undefined
    const load = async () => {
      setLoading(true)
      setError(null)
      try {
        const result = await getProductBatchQrCode(batchId, controller.signal)
        if (controller.signal.aborted) return
        setQr(result)
        if (result.status === 'PENDING') timer = window.setTimeout(() => setReloadKey((key) => key + 1), 15000)
      } catch (err) {
        if (!controller.signal.aborted) setError(getAuthErrorMessage(err, 'Không tải được thông tin QR.'))
      } finally {
        if (!controller.signal.aborted) setLoading(false)
      }
    }
    timer = window.setTimeout(() => { void load() }, 0)
    return () => { controller.abort(); window.clearTimeout(timer) }
  }, [batchId, reloadKey])

  useEffect(() => {
    const refresh = () => { if (document.visibilityState === 'visible') setReloadKey((key) => key + 1) }
    window.addEventListener('focus', refresh)
    document.addEventListener('visibilitychange', refresh)
    return () => {
      window.removeEventListener('focus', refresh)
      document.removeEventListener('visibilitychange', refresh)
      downloadController.current?.abort()
    }
  }, [])

  const download = async () => {
    const controller = new AbortController()
    downloadController.current?.abort()
    downloadController.current = controller
    setDownloading(true)
    setDownloadError(null)
    try {
      const current = await getProductBatchQrCode(batchId, controller.signal)
      if (controller.signal.aborted) return
      setQr(current)
      if (current.status !== 'READY' || !current.qrImageUrl) return
      await downloadQrPng(current.qrImageUrl, current.batchCode, controller.signal)
    } catch (err) {
      if (!controller.signal.aborted) setDownloadError(getAuthErrorMessage(err, 'Không tải được ảnh QR. Vui lòng thử lại.'))
    } finally {
      if (!controller.signal.aborted) setDownloading(false)
    }
  }

  return <section aria-label="Mã QR truy xuất lô hàng" className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
    <div className="flex items-center justify-between gap-3">
      <h2 className="flex items-center gap-2 text-lg font-bold text-slate-900"><QrCode className="size-5 text-emerald-700" aria-hidden="true" />Mã QR truy xuất</h2>
      <button type="button" title="Tải lại thông tin QR" aria-label="Tải lại thông tin QR" disabled={loading} onClick={() => setReloadKey((key) => key + 1)} className="rounded-lg border border-slate-200 p-2 text-slate-600 hover:bg-slate-50 disabled:opacity-50"><RefreshCw className={`size-4 ${loading ? 'animate-spin' : ''}`} /></button>
    </div>
    {loading ? <p role="status" className="mt-4 text-sm text-slate-500">Đang tải thông tin QR...</p>
      : error ? <p role="alert" className="mt-4 text-sm text-rose-700">{error}</p>
        : qr?.status === 'READY' && qr.qrImageUrl && qr.traceabilityUrl ? <div className="mt-4 flex flex-col gap-5 sm:flex-row sm:items-center">
          <img src={qr.qrImageUrl} alt={`Mã QR lô ${qr.batchCode}`} className="size-52 shrink-0 object-contain" onError={() => setError('Không tải được ảnh QR. Vui lòng tải lại thông tin.')} />
          <div className="min-w-0 space-y-3">
            <p className="font-mono font-bold text-emerald-700">{qr.batchCode}</p>
            <p className="break-all text-sm text-slate-600">{qr.traceabilityUrl}</p>
            <p className="text-xs text-slate-500">Tạo lúc: {qr.generatedAt ? new Intl.DateTimeFormat('vi-VN', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(qr.generatedAt)) : '—'}</p>
            <div className="flex flex-wrap gap-2">
              <button type="button" disabled={downloading} onClick={() => { void download() }} className="inline-flex items-center gap-2 rounded-lg bg-emerald-700 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-800 disabled:opacity-50"><Download className="size-4" />{downloading ? 'Đang tải...' : 'Tải PNG'}</button>
              <a href={qr.traceabilityUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"><ExternalLink className="size-4" />Mở truy xuất</a>
            </div>
          </div>
        </div> : <p role="status" className={`mt-4 rounded-lg p-3 text-sm ${qr?.status === 'UNAVAILABLE' ? 'bg-amber-50 text-amber-800' : 'bg-slate-50 text-slate-600'}`}>{qr?.message}</p>}
    {downloadError && <p role="alert" className="mt-3 text-sm text-rose-700">{downloadError}</p>}
  </section>
}
