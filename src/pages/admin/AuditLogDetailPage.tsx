import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router'
import AppIcon from '@/components/common/AppIcon'
import { ROUTES } from '@/constants/routes'
import { getAuditLog } from '@/services/auditService'
import { getAuthErrorMessage } from '@/services/authService'
import type { AuditLogDetail } from '@/types/audit'

function object(value: string | null): Record<string, unknown> {
  if (!value) return {}
  try { const parsed: unknown = JSON.parse(value); return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed as Record<string, unknown> : { value: parsed } }
  catch { return { value } }
}
const display = (value: unknown) => value === null || value === undefined ? '—' : typeof value === 'object' ? JSON.stringify(value) : String(value)

export default function AuditLogDetailPage() {
  const { id } = useParams()
  const numericId = Number(id)
  const [item, setItem] = useState<AuditLogDetail | null>(null)
  const [error, setError] = useState<string | null>(null)
  useEffect(() => {
    if (!numericId) return
    const timer = window.setTimeout(() => void getAuditLog(numericId).then(setItem).catch((requestError) => setError(getAuthErrorMessage(requestError, 'Không thể tải chi tiết nhật ký.'))), 0)
    return () => window.clearTimeout(timer)
  }, [numericId])
  const changes = useMemo(() => {
    if (!item) return []
    const oldData = object(item.oldDataJson); const newData = object(item.newDataJson)
    return [...new Set([...Object.keys(oldData), ...Object.keys(newData)])].map((field) => ({ field, oldValue: oldData[field], newValue: newData[field], changed: JSON.stringify(oldData[field]) !== JSON.stringify(newData[field]) }))
  }, [item])
  if (!numericId) return <div className="rounded-xl border border-rose-200 bg-rose-50 p-5 text-sm text-rose-700">Mã nhật ký không hợp lệ.</div>
  if (error) return <div className="rounded-xl border border-rose-200 bg-rose-50 p-5 text-sm text-rose-700">{error}</div>
  if (!item) return <p className="text-sm text-slate-500">Đang tải chi tiết nhật ký...</p>
  return <div className="mx-auto max-w-[1400px] space-y-5">
    <header className="flex items-end justify-between"><div><p className="text-xs font-bold uppercase tracking-wider text-emerald-700">Hệ thống · Nhật ký hệ thống · Chi tiết</p><h1 className="mt-1 text-2xl font-bold">Chi tiết nhật ký hệ thống</h1></div><Link to={ROUTES.ADMIN_AUDIT_LOGS} className="rounded-lg border bg-white px-4 py-2 text-sm font-semibold">← Quay lại</Link></header>
    <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm"><div className="flex flex-wrap items-start justify-between gap-4"><div><p className="text-xs text-slate-500">Mã nhật ký</p><p className="mt-1 font-mono font-bold">ALOG-{String(item.id).padStart(6, '0')}</p></div><span className={`rounded-full px-3 py-1 text-xs font-bold ${item.status === 'SUCCESS' ? 'bg-emerald-100 text-emerald-700' : item.status === 'FAILED' ? 'bg-rose-100 text-rose-700' : 'bg-amber-100 text-amber-700'}`}>{item.status}</span></div><div className="mt-5 grid gap-4 border-t pt-5 sm:grid-cols-2 lg:grid-cols-4"><Info label="Thời gian" value={new Date(item.createdAt).toLocaleString('vi-VN')} /><Info label="Người thực hiện" value={item.actorName} /><Info label="Hành động" value={item.actionType} /><Info label="Module" value={item.entityName} /></div></section>
    <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]"><div className="space-y-5"><section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm"><h2 className="font-bold">Thông tin chi tiết bản ghi</h2><div className="mt-4 grid gap-4 sm:grid-cols-2"><Info label="Tên tài khoản" value={item.actorUsername ?? 'Hệ thống'} /><Info label="Vai trò" value={item.actorRole ?? 'Hệ thống'} /><Info label="Email" value={item.actorEmail ?? '—'} /><Info label="Đối tượng" value={`${item.entityName}${item.entityId ? ` · ${item.entityId}` : ''}`} /><Info label="Địa chỉ IP" value={item.ipAddress ?? '—'} /><Info label="Thiết bị" value={item.userAgent ?? '—'} /></div>{item.description && <div className="mt-5 rounded-lg bg-slate-50 p-4 text-sm text-slate-600">{item.description}</div>}</section><section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm"><div className="border-b px-5 py-4"><h2 className="font-bold">Dữ liệu thay đổi</h2><p className="text-xs text-slate-500">{changes.filter((change) => change.changed).length} trường có thay đổi</p></div><div className="overflow-x-auto"><table className="w-full min-w-[620px] text-left text-sm"><thead className="bg-slate-50 text-xs uppercase text-slate-500"><tr><th className="px-5 py-3">Trường dữ liệu</th><th className="px-5 py-3">Giá trị cũ</th><th className="px-5 py-3">Giá trị mới</th><th className="px-5 py-3">Trạng thái</th></tr></thead><tbody className="divide-y">{changes.length === 0 ? <tr><td colSpan={4} className="px-5 py-8 text-center text-slate-500">Bản ghi này không chứa dữ liệu thay đổi.</td></tr> : changes.map((change) => <tr key={change.field} className={change.changed ? 'bg-emerald-50/30' : ''}><td className="px-5 py-4 font-medium">{change.field}</td><td className="px-5 py-4 text-slate-500">{display(change.oldValue)}</td><td className="px-5 py-4 font-medium">{display(change.newValue)}</td><td className="px-5 py-4"><span className={`rounded px-2 py-1 text-[10px] font-bold ${change.changed ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-500'}`}>{change.changed ? 'THAY ĐỔI' : 'GIỮ NGUYÊN'}</span></td></tr>)}</tbody></table></div></section></div><aside className="h-fit rounded-xl border border-slate-200 bg-white p-5 shadow-sm"><div className="flex items-center gap-2"><AppIcon name="pending" className="size-5 text-emerald-700" /><h2 className="font-bold">Dòng thời gian sự kiện</h2></div><ol className="mt-5 space-y-5 border-l border-slate-200 pl-5"><li><p className="text-xs text-slate-400">{new Date(item.createdAt).toLocaleTimeString('vi-VN')}</p><p className="mt-1 text-sm font-semibold">Yêu cầu được ghi nhận</p></li><li><p className="text-xs text-slate-400">Đối tượng</p><p className="mt-1 text-sm">{item.entityName} {item.entityId}</p></li><li><p className="text-xs text-slate-400">Kết quả</p><p className="mt-1 text-sm">{item.status === 'SUCCESS' ? 'Thao tác hoàn tất thành công' : 'Thao tác cần được kiểm tra'}</p></li></ol></aside></div>
  </div>
}

function Info({ label, value }: { label: string; value: string }) { return <div><p className="text-[11px] font-bold uppercase tracking-wide text-slate-400">{label}</p><p className="mt-1 break-words text-sm font-medium text-slate-800">{value}</p></div> }
