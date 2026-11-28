import { useRef, useState } from 'react'
import { apiClient } from '@/services/apiClient'
import { getAuthErrorMessage } from '@/services/authService'
import type { ApiResponse } from '@/types/api'

type Preview = { rows: { row: number; parentCategory: string; childCategory: string; request: { code: string; name: string; isActive: boolean } }[]; errors: { row: number; column: string; message: string }[] }

export default function CropTypeExcelImport({ onCreated }: { onCreated: (count: number) => void }) {
  const input = useRef<HTMLInputElement>(null)
  const [file, setFile] = useState<File>(), [preview, setPreview] = useState<Preview>(), [busy, setBusy] = useState(false), [error, setError] = useState('')
  const button = 'rounded-lg border border-emerald-700 px-4 py-2 text-sm font-semibold text-emerald-700 disabled:opacity-50'
  async function download() {
    setBusy(true); setError('')
    try {
      const response = await apiClient.get('/crop-types/template', { responseType: 'blob' })
      const url = URL.createObjectURL(response.data), a = document.createElement('a'); a.href = url; a.download = 'SAW-Loai-nong-san.xlsx'; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000)
    } catch (e) { setError(getAuthErrorMessage(e, 'Không tải được Excel mẫu.')) } finally { setBusy(false) }
  }
  async function upload(next: File) {
    setFile(undefined); setPreview(undefined); setError('')
    if (!next.name.toLowerCase().endsWith('.xlsx') || !next.size || next.size > 5 * 1024 * 1024) { setError('Chỉ nhận xlsx, tối đa 5 MB.'); return }
    setBusy(true)
    try {
      const data = new FormData(); data.append('file', next)
      const response = await apiClient.post<ApiResponse<Preview>>('/crop-types/import-preview', data, { headers: { 'Content-Type': 'multipart/form-data' }, timeout: 60_000 })
      setFile(next); setPreview(response.data.data)
    } catch (e) { setError(getAuthErrorMessage(e, 'Không đọc được Excel.')) } finally { setBusy(false); if (input.current) input.current.value = '' }
  }
  async function save() {
    if (!file || busy || !preview?.rows.length || preview.errors.length) return
    setBusy(true); setError('')
    try {
      const data = new FormData(); data.append('file', file)
      const response = await apiClient.post<ApiResponse<{ createdCount: number }>>('/crop-types/import', data, { headers: { 'Content-Type': 'multipart/form-data' }, timeout: 120_000 })
      onCreated(response.data.data.createdCount); setPreview(undefined); setFile(undefined)
    } catch (e) { setError(getAuthErrorMessage(e, 'Chưa tạo được danh sách. Kiểm tra lỗi và nhập lại file.')) }
    finally { setBusy(false) }
  }
  return <section className="space-y-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
    <div className="flex flex-wrap items-center gap-3"><button type="button" disabled={busy} className={button} onClick={() => void download()}>Tải Excel mẫu</button><button type="button" disabled={busy} className={button} onClick={() => input.current?.click()}>{busy ? 'Đang xử lý...' : 'Nhập từ Excel'}</button><span className="text-xs text-slate-500">Tạo nhiều loại nông sản · Tối đa 200 loại/file</span><input ref={input} hidden type="file" accept=".xlsx" onChange={e => { if (e.target.files?.[0]) void upload(e.target.files[0]) }} /></div>
    {error && <p role="alert" className="whitespace-pre-line text-sm text-rose-700">{error}</p>}
    {preview && <div className="space-y-3"><p className="text-sm font-semibold">Xem trước: {file?.name} · {preview.rows.length} loại</p>
      {preview.errors.length > 0 && <ul role="alert" className="max-h-52 space-y-1 overflow-auto rounded-lg bg-rose-50 p-3 text-sm text-rose-700">{preview.errors.map((e, i) => <li key={i}>Dòng {e.row || '—'} · {e.column}: {e.message}</li>)}</ul>}
      <div className="max-h-72 overflow-auto"><table className="w-full text-left text-sm"><thead className="sticky top-0 bg-slate-50"><tr>{['Dòng', 'Danh mục cha', 'Danh mục con', 'Tên', 'Mã', 'Trạng thái'].map(x => <th className="p-2" key={x}>{x}</th>)}</tr></thead><tbody>{preview.rows.map(x => <tr className="border-t border-slate-100" key={x.row}><td className="p-2">{x.row}</td><td className="p-2">{x.parentCategory}</td><td className="p-2">{x.childCategory}</td><td className="p-2">{x.request.name}</td><td className="break-all p-2">{x.request.code}</td><td className="p-2">{x.request.isActive ? 'Hoạt động' : 'Ngừng hoạt động'}</td></tr>)}</tbody></table></div>
      <div className="flex flex-wrap items-center gap-3"><button type="button" disabled={busy || !!preview.errors.length || !preview.rows.length} onClick={() => void save()} className="rounded-lg bg-emerald-700 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">Xác nhận tạo {preview.rows.length} loại nông sản</button><button type="button" disabled={busy} onClick={() => { setPreview(undefined); setFile(undefined); setError('') }} className="text-sm text-slate-600">Hủy</button><span className="text-xs text-slate-500">Có lỗi sẽ không lưu dòng nào; không cập nhật loại đã tồn tại.</span></div>
    </div>}
  </section>
}
