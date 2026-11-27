import { useEffect, useState } from 'react'
import { previewSupplyContract } from '@/services/supplyContractService'
import type { CreateSupplyContractRequest } from '@/types/supplyContract'
import ContractDocument from './ContractDocument'
export default function ContractPreview({ request }: { request: CreateSupplyContractRequest }) {
  const [content, setContent] = useState(''), [error, setError] = useState(''), [loading, setLoading] = useState(false)
  const serialized = JSON.stringify(request)
  useEffect(() => { const controller = new AbortController(); const timer = setTimeout(() => {
    setLoading(true); setError('')
    void previewSupplyContract(JSON.parse(serialized), controller.signal).then(text => { if (!controller.signal.aborted) setContent(text) }).catch(() => { if (!controller.signal.aborted) setError('Không tải được bản xem trước. Kiểm tra kết nối và thông tin hợp đồng.') }).finally(() => { if (!controller.signal.aborted) setLoading(false) })
  }, 350); return () => { clearTimeout(timer); controller.abort() } }, [serialized])
  return <section aria-label="Xem trước hợp đồng" className="min-w-0 bg-slate-100/70 p-4 sm:p-6 lg:col-start-1 lg:row-start-1"><h3 className="mb-3 text-sm font-semibold text-slate-600">Xem trước hợp đồng {loading ? '· Đang cập nhật...' : ''}</h3>{error && <p role="alert" className="mb-3 rounded-lg bg-rose-50 p-3 text-sm text-rose-700">{error}</p>}{content ? <ContractDocument content={content} /> : <p className="rounded-xl bg-white p-8 text-sm text-slate-500">Nhập thông tin để xem trước nội dung hợp đồng.</p>}</section>
}
