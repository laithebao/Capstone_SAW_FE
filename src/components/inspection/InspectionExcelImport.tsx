import { useRef, useState } from 'react'
import { apiClient } from '@/services/apiClient'
import type { ApiResponse } from '@/types/api'
import type { CreateInspectionStandardRequest } from '@/services/inspectionStandardService'
type Issue = { sheet: string; row: number; column: string; criterion?: string; message: string }
export default function InspectionExcelImport({ dirty, onImport }: { dirty: boolean; onImport: (request: CreateInspectionStandardRequest) => void }) {
  const ref = useRef<HTMLInputElement>(null), [busy, setBusy] = useState(false), [errors, setErrors] = useState<Issue[]>([])
  async function download() {
    setBusy(true); setErrors([])
    try { const result = await apiClient.get('/inspection-standards/template', { responseType: 'blob' }); const url = URL.createObjectURL(result.data); const a = document.createElement('a'); a.href = url; a.download = 'SAW-Tieu-chuan-kiem-dinh.xlsx'; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000) }
    catch { setErrors([{ sheet: 'File', row: 0, column: '', message: 'Không tải được file mẫu.' }]) } finally { setBusy(false) }
  }
  async function upload(file: File) {
    if (dirty && !window.confirm('Thay thế dữ liệu đang nhập bằng nội dung Excel?')) return
    if (!file.name.toLowerCase().endsWith('.xlsx') || file.size > 5 * 1024 * 1024) { setErrors([{ sheet: 'File', row: 0, column: '', message: 'Chỉ nhận xlsx, tối đa 5 MB.' }]); return }
    setBusy(true); setErrors([])
    try { const data = new FormData(); data.append('file', file); const response = await apiClient.post<ApiResponse<{ request: CreateInspectionStandardRequest | null; errors: Issue[] }>>('/inspection-standards/import-preview', data, { headers: { 'Content-Type': 'multipart/form-data' } }); const result = response.data.data; setErrors(result.errors); if (!result.errors.length && result.request) onImport(result.request) }
    catch { setErrors([{ sheet: 'File', row: 0, column: '', message: 'Không đọc được file. Kiểm tra định dạng hoặc thử lại.' }]) } finally { setBusy(false); if (ref.current) ref.current.value = '' }
  }
  return <section className="space-y-3 rounded-xl border bg-white p-4"><div className="flex flex-wrap gap-3"><button type="button" disabled={busy} onClick={() => void download()} className="rounded-lg border border-emerald-700 px-3 py-2 text-sm text-emerald-700">Tải Excel mẫu</button><button type="button" disabled={busy} onClick={() => ref.current?.click()} className="rounded-lg bg-emerald-700 px-3 py-2 text-sm text-white">{busy ? 'Đang xử lý...' : 'Nhập từ Excel'}</button><input ref={ref} type="file" accept=".xlsx" hidden onChange={e => { if (e.target.files?.[0]) void upload(e.target.files[0]) }} /></div><p className="text-xs text-slate-500">Nhập Excel chỉ điền form để xem xét. Bấm tạo bộ tiêu chuẩn để lưu.</p>{errors.length > 0 && <div role="alert" className="max-h-60 overflow-auto"><table className="w-full text-left text-xs"><thead><tr><th>Sheet</th><th>Dòng</th><th>Cột/tiêu chí</th><th>Lỗi</th></tr></thead><tbody>{errors.map((e, i) => <tr className="border-t text-rose-700" key={i}><td>{e.sheet}</td><td>{e.row || '—'}</td><td>{e.column} {e.criterion}</td><td>{e.message}</td></tr>)}</tbody></table></div>}</section>
}
