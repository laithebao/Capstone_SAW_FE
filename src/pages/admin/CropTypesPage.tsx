import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router'
import AppIcon from '@/components/common/AppIcon'
import { ROUTES } from '@/constants/routes'
import { getAuthErrorMessage } from '@/services/authService'
import { deleteCropType, getCropTypes, setCropTypeStatus, type CropType } from '@/services/cropTypeService'

export default function CropTypesPage() {
  const navigate = useNavigate()
  const [items, setItems] = useState<CropType[]>([])
  const [selected, setSelected] = useState<CropType | null>(null)
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const load = useCallback(async (query = '') => {
    setLoading(true); setError(null)
    try {
      const result = await getCropTypes(query)
      setItems(result.items)
      setSelected(current => current ? result.items.find(item => item.id === current.id) ?? null : result.items[0] ?? null)
    } catch (requestError) { setError(getAuthErrorMessage(requestError, 'Không thể tải danh sách loại nông sản.')) }
    finally { setLoading(false) }
  }, [])
  useEffect(() => {
    void getCropTypes().then(result => { setItems(result.items); setSelected(result.items[0] ?? null) }).catch(requestError => setError(getAuthErrorMessage(requestError, 'Không thể tải danh sách loại nông sản.'))).finally(() => setLoading(false))
  }, [])
  const activeCount = useMemo(() => items.filter(item => item.isActive).length, [items])

  async function changeStatus(item: CropType) {
    try {
      const updated = await setCropTypeStatus(item.id, !item.isActive)
      setItems(current => current.map(value => value.id === updated.id ? updated : value))
      setSelected(current => current?.id === updated.id ? updated : current)
    } catch (requestError) { setError(getAuthErrorMessage(requestError, 'Không thể đổi trạng thái.')) }
  }
  async function remove(item: CropType) {
    if (!window.confirm(`Xóa loại nông sản “${item.name}”?`)) return
    try { await deleteCropType(item.id); setItems(current => current.filter(value => value.id !== item.id)); setSelected(current => current?.id === item.id ? null : current); setMessage('Đã xóa loại nông sản.') }
    catch (requestError) { setError(getAuthErrorMessage(requestError, 'Không thể xóa vì dữ liệu đang được sử dụng.')) }
  }

  return <div className="mx-auto max-w-[1600px] space-y-5">
    <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end"><div><p className="text-xs font-bold uppercase tracking-wider text-emerald-700">Quản trị · Danh mục</p><h1 className="mt-1 text-2xl font-bold text-slate-950 sm:text-3xl">Loại nông sản</h1><p className="mt-1 text-sm text-slate-500">Chọn một dòng trong danh sách để xem thông tin chi tiết.</p></div><button onClick={() => navigate(ROUTES.ADMIN_CROP_TYPE_NEW)} className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-emerald-700 px-4 text-sm font-semibold text-white hover:bg-emerald-800"><AppIcon name="plus" className="size-4" />Tạo mới loại nông sản</button></div>
    {error && <p role="alert" className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</p>}
    {message && <p role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{message}</p>}
    <div className="grid gap-4 sm:grid-cols-3"><Stat label="Tổng danh mục" value={items.length} /><Stat label="Đang hoạt động" value={activeCount} color="text-emerald-700" /><Stat label="Ngừng hoạt động" value={items.length - activeCount} color="text-slate-600" /></div>
    <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_330px] xl:items-start">
      <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm"><div className="flex flex-col gap-3 border-b border-slate-100 p-4 sm:flex-row sm:items-center sm:justify-between"><h2 className="font-bold">Danh sách loại nông sản <span className="text-slate-400">({items.length})</span></h2><div className="flex gap-2"><input value={search} onChange={event => setSearch(event.target.value)} onKeyDown={event => { if (event.key === 'Enter') void load(search) }} placeholder="Tìm mã hoặc tên..." className="h-9 rounded-lg border border-slate-200 px-3 text-sm" /><button onClick={() => void load(search)} className="h-9 rounded-lg border border-slate-300 px-3 text-sm font-semibold">Tìm</button></div></div><div className="overflow-x-auto"><table className="w-full min-w-[760px] text-left text-sm"><thead className="bg-slate-50 text-[11px] uppercase tracking-wide text-slate-500"><tr><th className="px-5 py-3">Mã</th><th className="px-5 py-3">Tên / nhóm</th><th className="px-5 py-3">Bảo quản</th><th className="px-5 py-3">Trạng thái</th><th className="px-5 py-3 text-right">Thao tác</th></tr></thead><tbody className="divide-y divide-slate-100">{loading ? <tr><td colSpan={5} className="px-5 py-8 text-center text-slate-500">Đang tải dữ liệu...</td></tr> : items.length === 0 ? <tr><td colSpan={5} className="px-5 py-8 text-center text-slate-500">Chưa có loại nông sản.</td></tr> : items.map(item => <tr key={item.id} onClick={() => setSelected(item)} className={`cursor-pointer transition hover:bg-emerald-50 ${selected?.id === item.id ? 'bg-emerald-50/80' : ''}`}><td className="px-5 py-4 font-mono text-xs font-bold text-emerald-700">{item.code}</td><td className="px-5 py-4"><p className="font-semibold">{item.name}</p><p className="text-xs text-slate-500">{item.categoryName}</p></td><td className="px-5 py-4 text-xs text-slate-600">{item.shelfLifeDays ? `${item.shelfLifeDays} ngày` : '—'} · {item.minTemperature ?? '—'}–{item.maxTemperature ?? '—'}°C</td><td className="px-5 py-4"><button onClick={event => { event.stopPropagation(); void changeStatus(item) }} className={`rounded-full px-2.5 py-1 text-[10px] font-bold ${item.isActive ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>{item.isActive ? 'Hoạt động' : 'Ngừng'}</button></td><td className="px-5 py-4 text-right"><button onClick={event => { event.stopPropagation(); navigate(`/admin/crop-types/${item.id}/edit`) }} className="mr-3 text-xs font-semibold text-emerald-700">Sửa</button><button onClick={event => { event.stopPropagation(); void remove(item) }} className="text-xs font-semibold text-rose-600">Xóa</button></td></tr>)}</tbody></table></div></section>
      <CropTypeDetail item={selected} onClose={() => setSelected(null)} onEdit={() => selected && navigate(`/admin/crop-types/${selected.id}/edit`)} onStatus={() => selected && void changeStatus(selected)} />
    </div>
  </div>
}

function CropTypeDetail({ item, onClose, onEdit, onStatus }: { item: CropType | null; onClose: () => void; onEdit: () => void; onStatus: () => void }) {
  if (!item) return <aside className="rounded-xl border border-dashed border-slate-300 bg-white p-6 text-center text-sm text-slate-500">Chọn một loại nông sản để xem chi tiết.</aside>
  return <aside className="rounded-xl border border-slate-200 bg-white shadow-sm"><div className="flex items-start justify-between border-b border-slate-100 p-5"><div className="flex items-center gap-3"><span className="grid size-11 place-items-center rounded-full bg-emerald-100 text-xl">🌾</span><div><h2 className="font-bold">{item.name}</h2><p className="text-xs text-slate-500">{item.code}</p></div></div><button onClick={onClose} className="text-slate-400 hover:text-slate-700">×</button></div><div className="space-y-5 p-5"><Detail label="Nhóm ngành" value={item.categoryName} /><Detail label="Tên khoa học" value={item.scientificName || 'Chưa cập nhật'} /><div className="border-t border-slate-100 pt-4"><h3 className="text-sm font-bold">Bảo quản & chất lượng</h3><div className="mt-3 space-y-3"><Detail label="Nhiệt độ" value={item.minTemperature != null || item.maxTemperature != null ? `${item.minTemperature ?? '—'} – ${item.maxTemperature ?? '—'} °C` : 'Chưa thiết lập'} /><Detail label="Độ ẩm" value={item.minHumidity != null || item.maxHumidity != null ? `${item.minHumidity ?? '—'} – ${item.maxHumidity ?? '—'} %` : 'Chưa thiết lập'} /><Detail label="Thời hạn bảo quản" value={item.shelfLifeDays ? `${item.shelfLifeDays} ngày` : 'Chưa thiết lập'} /><Detail label="Tồn an toàn" value={item.safetyStockLevelKg != null ? `${item.safetyStockLevelKg} kg` : 'Chưa thiết lập'} /><Detail label="Đơn vị mặc định" value={item.defaultUnit} /></div></div><div className="border-t border-slate-100 pt-4"><span className={`rounded-full px-2.5 py-1 text-[10px] font-bold ${item.isActive ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>{item.isActive ? 'ĐANG HOẠT ĐỘNG' : 'NGỪNG HOẠT ĐỘNG'}</span></div><button onClick={onEdit} className="h-10 w-full rounded-lg border border-emerald-700 text-sm font-bold text-emerald-700 hover:bg-emerald-50">Chỉnh sửa loại nông sản</button><button onClick={onStatus} className="h-10 w-full rounded-lg bg-emerald-700 text-sm font-bold text-white hover:bg-emerald-800">{item.isActive ? 'Ngừng hoạt động' : 'Kích hoạt'}</button></div></aside>
}

function Detail({ label, value }: { label: string; value: string }) { return <div className="flex items-start justify-between gap-4 text-sm"><span className="text-slate-500">{label}</span><b className="text-right text-slate-800">{value}</b></div> }
function Stat({ label, value, color = 'text-slate-950' }: { label: string; value: number; color?: string }) { return <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm"><p className="text-xs font-bold uppercase text-slate-500">{label}</p><p className={`mt-2 text-3xl font-bold ${color}`}>{value}</p></div> }
