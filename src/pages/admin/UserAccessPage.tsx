import { useCallback, useEffect, useMemo, useState } from 'react'
import AppIcon from '@/components/common/AppIcon'
import { getAuthErrorMessage } from '@/services/authService'
import {
  getAccountAccess, getAccounts, getPermissions, getRoles, updateAccountAccess, updateAccountStatus,
  type PermissionOption, type RoleOption, type UserAccessDetail, type UserAccessListItem,
} from '@/services/userAccessService'

const statusLabel: Record<string, string> = { ACTIVE: 'Hoạt động', INACTIVE: 'Vô hiệu', PENDING: 'Chờ kích hoạt', LOCKED: 'Tạm khóa' }
const statusTone: Record<string, string> = { ACTIVE: 'bg-emerald-50 text-emerald-700', INACTIVE: 'bg-slate-100 text-slate-600', PENDING: 'bg-amber-50 text-amber-700', LOCKED: 'bg-rose-50 text-rose-700' }

export default function UserAccessPage() {
  const [accounts, setAccounts] = useState<UserAccessListItem[]>([])
  const [roles, setRoles] = useState<RoleOption[]>([])
  const [permissions, setPermissions] = useState<PermissionOption[]>([])
  const [selected, setSelected] = useState<UserAccessDetail | null>(null)
  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [selectedRoleId, setSelectedRoleId] = useState<number | null>(null)
  const [overrides, setOverrides] = useState<Record<number, boolean>>({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true); setError(null)
    try {
      const [data, roleData, permissionData] = await Promise.all([
        getAccounts(search, roleFilter ? Number(roleFilter) : undefined, statusFilter || undefined),
        getRoles(), getPermissions(),
      ])
      setAccounts(data.items); setRoles(roleData); setPermissions(permissionData)
    } catch (requestError) { setError(getAuthErrorMessage(requestError, 'Không thể tải dữ liệu phân quyền.')) }
    finally { setLoading(false) }
  }, [search, roleFilter, statusFilter])

  useEffect(() => { const timer = window.setTimeout(() => void load(), 0); return () => window.clearTimeout(timer) }, [load])

  const activeAccounts = useMemo(() => accounts.filter((account) => account.status === 'ACTIVE').length, [accounts])
  async function selectAccount(item: UserAccessListItem) {
    setError(null); setMessage(null)
    try {
      const detail = await getAccountAccess(item.id)
      setSelected(detail); setSelectedRoleId(detail.roleId)
      setOverrides(Object.fromEntries(detail.permissionOverrides.map((permission) => [permission.permissionId, permission.isGranted])))
    } catch (requestError) { setError(getAuthErrorMessage(requestError, 'Không thể tải quyền tài khoản.')) }
  }
  function resetFilter() { setSearch(''); setRoleFilter(''); setStatusFilter('') }
  function toggleOverride(permissionId: number) {
    setOverrides((current) => ({ ...current, [permissionId]: !(current[permissionId] ?? false) }))
  }
  async function save() {
    if (!selected || !selectedRoleId) return
    setSaving(true); setError(null)
    try {
      const permissionOverrides = Object.entries(overrides).map(([permissionId, isGranted]) => ({ permissionId: Number(permissionId), isGranted }))
      const detail = await updateAccountAccess(selected.user.id, selectedRoleId, permissionOverrides)
      setSelected(detail); setMessage('Đã lưu thay đổi quyền tài khoản.'); await load()
    } catch (requestError) { setError(getAuthErrorMessage(requestError, 'Không thể cập nhật quyền.')) }
    finally { setSaving(false) }
  }
  async function changeStatus(account: UserAccessListItem) {
    const nextStatus = account.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE'
    try {
      const updated = await updateAccountStatus(account.id, nextStatus)
      setAccounts((current) => current.map((item) => item.id === updated.id ? updated : item))
      setSelected((current) => current?.user.id === updated.id ? { ...current, user: updated } : current)
      setMessage('Đã cập nhật trạng thái tài khoản.')
    }
    catch (requestError) { setError(getAuthErrorMessage(requestError, 'Không thể đổi trạng thái tài khoản.')) }
  }

  return <div className="mx-auto max-w-[1600px] space-y-5">
    <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-end"><div><p className="text-xs font-bold uppercase tracking-wider text-emerald-700">Quản trị · Quản lý người dùng · Phân quyền</p><h1 className="mt-1 text-2xl font-bold text-slate-950 sm:text-3xl">Phân quyền tài khoản người dùng</h1><p className="mt-1 text-sm text-slate-500">Quản lý vai trò hệ thống và quyền ngoại lệ theo từng tài khoản.</p></div><div className="flex gap-2"><button onClick={resetFilter} className="h-10 rounded-lg border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-700">Đặt lại bộ lọc</button><button disabled={!selected || saving} onClick={() => void save()} className="inline-flex h-10 items-center gap-2 rounded-lg bg-emerald-700 px-4 text-sm font-semibold text-white disabled:opacity-60"><AppIcon name="shield" className="size-4" />{saving ? 'Đang lưu...' : 'Cập nhật quyền'}</button></div></div>
    {error && <p role="alert" className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</p>}{message && <p role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{message}</p>}
    <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_330px]">
      <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm"><div className="flex flex-col gap-3 border-b border-slate-100 p-4"><div className="flex items-center justify-between"><h2 className="font-bold">Người dùng hệ thống <span className="text-slate-400">({accounts.length})</span></h2><span className="text-xs text-emerald-700">{activeAccounts} đang hoạt động</span></div><div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_170px_150px]"><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Tìm tài khoản, họ tên, email..." className="h-10 rounded-lg border border-slate-200 px-3 text-sm outline-none focus:ring-2 focus:ring-emerald-500" /><select value={roleFilter} onChange={(event) => setRoleFilter(event.target.value)} className="h-10 rounded-lg border border-slate-200 px-3 text-sm"><option value="">Tất cả vai trò</option>{roles.map((role) => <option key={role.id} value={role.id}>{role.name}</option>)}</select><select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} className="h-10 rounded-lg border border-slate-200 px-3 text-sm"><option value="">Tất cả trạng thái</option>{Object.entries(statusLabel).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></div></div><div className="overflow-x-auto"><table className="w-full min-w-[740px] text-left text-sm"><thead className="bg-slate-50 text-[11px] uppercase tracking-wide text-slate-500"><tr><th className="px-5 py-3">Người dùng</th><th className="px-5 py-3">Vai trò</th><th className="px-5 py-3">Trạng thái</th><th className="px-5 py-3">Đăng nhập cuối</th><th className="px-5 py-3 text-right">Thao tác</th></tr></thead><tbody className="divide-y divide-slate-100">{loading ? <tr><td colSpan={5} className="px-5 py-9 text-center text-slate-500">Đang tải dữ liệu...</td></tr> : accounts.length === 0 ? <tr><td colSpan={5} className="px-5 py-9 text-center text-slate-500">Không có tài khoản phù hợp.</td></tr> : accounts.map((account) => <tr key={account.id} className={`cursor-pointer hover:bg-slate-50 ${selected?.user.id === account.id ? 'bg-emerald-50/50' : ''}`} onClick={() => void selectAccount(account)}><td className="px-5 py-4"><div className="flex items-center gap-3"><span className="grid size-8 place-items-center rounded-full bg-slate-100 text-xs font-bold text-slate-600">{account.fullName.slice(0, 2).toUpperCase()}</span><div><p className="font-semibold">{account.fullName}</p><p className="text-xs text-slate-500">{account.email}</p></div></div></td><td className="px-5 py-4"><span className="rounded bg-slate-100 px-2 py-1 text-xs font-medium text-slate-600">{account.roleName}</span></td><td className="px-5 py-4"><span className={`rounded-full px-2.5 py-1 text-[10px] font-bold ${statusTone[account.status] ?? 'bg-slate-100 text-slate-600'}`}>{statusLabel[account.status] ?? account.status}</span></td><td className="px-5 py-4 text-xs text-slate-500">{account.lastLoginAt ? new Intl.DateTimeFormat('vi-VN', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(account.lastLoginAt)) : 'Chưa đăng nhập'}</td><td className="px-5 py-4 text-right"><button onClick={(event) => { event.stopPropagation(); void selectAccount(account) }} className="mr-3 text-xs font-semibold text-emerald-700">Phân quyền</button><button onClick={(event) => { event.stopPropagation(); void changeStatus(account) }} className="text-xs font-semibold text-rose-600">{account.status === 'ACTIVE' ? 'Vô hiệu' : 'Kích hoạt'}</button></td></tr>)}</tbody></table></div></section>
      <aside className="min-h-[520px] rounded-xl border border-slate-200 bg-white p-5 shadow-sm">{selected ? <div className="space-y-5"><div className="flex items-start justify-between"><div className="flex gap-3"><span className="grid size-11 place-items-center rounded-full bg-emerald-100 font-bold text-emerald-700">{selected.user.fullName.slice(0, 2).toUpperCase()}</span><div><h2 className="font-bold">{selected.user.fullName}</h2><p className="text-xs text-slate-500">{selected.user.email}</p></div></div><button onClick={() => setSelected(null)} className="text-slate-400 hover:text-slate-700">×</button></div><div className="border-y border-slate-100 py-4"><label className="block text-[11px] font-bold uppercase tracking-wide text-slate-500">Gán vai trò hệ thống</label><select value={selectedRoleId ?? ''} onChange={(event) => setSelectedRoleId(Number(event.target.value))} className="mt-2 h-10 w-full rounded-lg border border-slate-200 px-3 text-sm">{roles.map((role) => <option key={role.id} value={role.id}>{role.name}</option>)}</select><p className="mt-2 text-xs leading-5 text-slate-500">Vai trò cung cấp quyền mặc định. Quyền dưới đây là ngoại lệ riêng cho tài khoản.</p></div><div><div className="mb-3 flex items-center justify-between"><h3 className="text-sm font-bold">Quyền ngoại lệ</h3><span className="text-xs text-slate-500">{Object.keys(overrides).length} đã cấu hình</span></div><div className="max-h-64 space-y-2 overflow-y-auto pr-1">{permissions.length === 0 ? <p className="text-sm text-slate-500">Chưa có quyền nào trong hệ thống.</p> : permissions.map((permission) => <label key={permission.id} className="flex cursor-pointer items-start gap-3 rounded-lg border border-slate-100 p-3 hover:bg-slate-50"><input type="checkbox" checked={overrides[permission.id] ?? false} onChange={() => toggleOverride(permission.id)} className="mt-0.5 size-4 accent-emerald-700" /><span><b className="block text-xs">{permission.name}</b><small className="text-[11px] text-slate-500">{permission.code}{permission.description ? ` · ${permission.description}` : ''}</small></span></label>)}</div></div><button disabled={saving} onClick={() => void save()} className="h-11 w-full rounded-lg bg-emerald-700 text-sm font-bold text-white hover:bg-emerald-800 disabled:opacity-60">Lưu thay đổi</button></div> : <div className="grid h-full min-h-[450px] place-items-center text-center text-sm text-slate-500"><div><span className="mx-auto grid size-12 place-items-center rounded-full bg-slate-100 text-slate-400"><AppIcon name="users" className="size-6" /></span><p className="mt-3 font-semibold text-slate-700">Chọn một người dùng</p><p className="mt-1 text-xs">Chọn dòng trong danh sách để gán role và quyền.</p></div></div>}</aside>
    </div>
    <section className="rounded-xl border border-slate-200 bg-amber-50/50 p-4"><div className="flex gap-3"><span className="grid size-8 shrink-0 place-items-center rounded-lg bg-amber-100 text-amber-700"><AppIcon name="shield" className="size-4" /></span><div><h2 className="text-sm font-bold text-slate-800">Khuyến nghị an ninh</h2><p className="mt-1 text-xs leading-5 text-slate-600">Không tự hạ quyền hoặc vô hiệu hóa tài khoản Admin đang đăng nhập. Khi cần ngăn truy cập tạm thời, dùng “Vô hiệu” thay vì xóa tài khoản để giữ lịch sử nghiệp vụ.</p></div></div></section>
  </div>
}
