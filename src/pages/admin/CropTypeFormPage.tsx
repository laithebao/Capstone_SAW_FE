import { useEffect, useState, type FormEvent, type ReactNode } from 'react'
import { useNavigate, useParams } from 'react-router'
import { getCategories, type Category } from '@/services/categoryService'
import { generateCropCode } from '@/utils/cropCode'
import { capitalizeFirst } from '@/utils/displayName'
import AppIcon from '@/components/common/AppIcon'
import FormNotification from '@/components/common/FormNotification'
import { ROUTES } from '@/constants/routes'
import { getAuthErrorMessage } from '@/services/authService'
import { getCropType, saveCropTypeBasics, type CropType, type SaveCropTypeBasicsRequest } from '@/services/cropTypeService'

type FormValues = { code: string; name: string; categoryName: string; categoryId: string; isActive: boolean }
const emptyForm: FormValues = { code: '', name: '', categoryName: '', categoryId: '', isActive: true }

const input = 'h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-800 outline-none transition focus:border-emerald-600 focus:ring-4 focus:ring-emerald-100'
const toForm = (item: CropType): FormValues => ({ code: item.code, name: item.name, categoryName: item.categoryName, categoryId: item.categoryId?.toString() ?? '', isActive: item.isActive })

function Field({ label, children }: { label: string; children: ReactNode }) { return <label className="space-y-1.5"><span className="text-[11px] font-bold uppercase tracking-wide text-slate-500">{label}</span>{children}</label> }

export default function CropTypeFormPage() {
  const navigate = useNavigate(), { id } = useParams()
  const editId = id ? Number(id) : undefined
  const isEdit = Number.isInteger(editId) && editId! > 0
  const [categories, setCategories] = useState<Category[]>([])
  const [parentId, setParentId] = useState('')
  const [isCodeDirty, setCodeDirty] = useState(isEdit)
  const [createdAt, setCreatedAt] = useState(new Date())
  const [categoryLoading, setCategoryLoading] = useState(true)
  const [form, setForm] = useState<FormValues>(emptyForm)
  const [loading, setLoading] = useState(isEdit)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [actionError, setActionError] = useState('')
  const update = <K extends keyof FormValues>(key: K, value: FormValues[K]) => { if (key === 'code') setCodeDirty(true); setForm(current => ({ ...current, [key]: value })) }
  useEffect(() => { void getCategories().then(setCategories).catch(e => setError(getAuthErrorMessage(e, 'Không tải được danh mục.'))).finally(() => setCategoryLoading(false)) }, [])
  useEffect(() => { if (isCodeDirty) return; const child = categories.find(c => c.categoryId === Number(form.categoryId)); const parent = categories.find(c => c.categoryId === Number(parentId)); setForm(f => ({ ...f, categoryName: parent?.name ?? '', code: generateCropCode(parent?.code ?? '', child?.code ?? '', child?.name ?? '', f.name, createdAt) })) }, [form.name, form.categoryId, parentId, categories, isCodeDirty, createdAt])

  useEffect(() => {
    if (!isEdit || !editId) return
    void getCropType(editId).then(item => { setForm(toForm(item)); setParentId(item.parentCategoryId?.toString() ?? ''); setCreatedAt(new Date(/(?:Z|[+-]\d\d:\d\d)$/.test(item.createdAt) ? item.createdAt : item.createdAt + 'Z')) }).catch(requestError => setError(getAuthErrorMessage(requestError, 'Không thể tải loại nông sản.'))).finally(() => setLoading(false))
  }, [editId, isEdit])

  async function submit(event: FormEvent) {
    event.preventDefault(); setSaving(true); setError(null); setActionError('')
    const child = categories.find(c => c.categoryId === Number(form.categoryId)), parent = categories.find(c => c.categoryId === Number(parentId))
    const code = !isEdit && !isCodeDirty ? generateCropCode(parent?.code ?? '', child?.code ?? '', child?.name ?? '', form.name, new Date()) : form.code
    setForm(current => ({ ...current, code }))
    const request: SaveCropTypeBasicsRequest = { code, name: capitalizeFirst(form.name), categoryId: form.categoryId ? Number(form.categoryId) : null, isActive: form.isActive }
    try { await saveCropTypeBasics(request, isEdit ? editId : undefined); navigate(ROUTES.ADMIN_CROP_TYPES, { replace: true }) }
    catch (requestError) { setActionError(getAuthErrorMessage(requestError, 'Không thể lưu loại nông sản.')) }
    finally { setSaving(false) }
  }

  if (loading) return <div className="rounded-xl border border-slate-200 bg-white p-10 text-center text-sm text-slate-500">Đang tải thông tin loại nông sản...</div>
  return <div className="mx-auto max-w-[1200px] space-y-5">
    <FormNotification warehouse message={actionError} onDismiss={() => setActionError('')} />
    <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end"><div><button onClick={() => navigate(ROUTES.ADMIN_CROP_TYPES)} className="mb-2 inline-flex items-center gap-1 text-sm font-semibold text-emerald-700 hover:underline">← Danh sách loại nông sản</button><p className="text-xs font-bold uppercase tracking-wider text-emerald-700">Quản trị · Loại nông sản</p><h1 className="mt-1 text-2xl font-bold text-slate-950 sm:text-3xl">{isEdit ? 'Cập nhật loại nông sản' : 'Tạo mới loại nông sản'}</h1><p className="mt-1 text-sm text-slate-500">Thiết lập danh mục, tên và mã loại nông sản.</p></div></div>
    {error && <p role="alert" className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</p>}
    <div className="grid gap-5 xl:grid-cols-[minmax(0,1.7fr)_minmax(280px,.7fr)]"><form onSubmit={event => void submit(event)} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm"><Section title="Thông tin cơ bản" icon="package"><div className="grid gap-4 sm:grid-cols-2"><Field label="Danh mục cha *"><select required disabled={categoryLoading} className={input} value={parentId} onChange={e => { setParentId(e.target.value); update('categoryId', ''); update('categoryName', categories.find(c => c.categoryId === Number(e.target.value))?.name ?? '') }}><option value="">Chọn danh mục cha</option>{categories.filter(c => c.parentId === null).map(c => <option key={c.categoryId} value={c.categoryId} disabled={!c.isActive}>{c.name}{!c.isActive ? ' (ngừng hoạt động)' : ''}</option>)}</select></Field><Field label="Danh mục con *"><select required disabled={!parentId} className={input} value={form.categoryId} onChange={e => update('categoryId', e.target.value)}><option value="">Chọn danh mục con</option>{categories.filter(c => c.parentId === Number(parentId)).map(c => <option key={c.categoryId} value={c.categoryId} disabled={!c.isActive}>{c.name}{!c.isActive ? ' (ngừng hoạt động)' : ''}</option>)}</select></Field><Field label="Tên loại nông sản *"><input required maxLength={150} value={form.name} onChange={e => update('name', e.target.value)} onBlur={() => update('name', capitalizeFirst(form.name))} className={input} /></Field><Field label="Mã loại nông sản *"><input required maxLength={50} pattern="[A-Z0-9_]+" value={form.code} onChange={e => update('code', e.target.value.toUpperCase())} className={input} />{error?.toLocaleLowerCase().includes('mã') && <p role="alert" className="text-xs text-rose-700">{error}</p>}{form.code.length > 50 && <p role="alert" className="text-xs text-rose-700">Mã tự sinh vượt 50 ký tự. Hãy rút gọn mã trước khi lưu.</p>}</Field></div></Section><label className="mt-5 flex items-center gap-3 text-sm font-semibold text-slate-700"><input type="checkbox" checked={form.isActive} onChange={event => update('isActive', event.target.checked)} className="size-4 accent-emerald-700" />Đang hoạt động</label><div className="mt-6 flex justify-end gap-3 border-t border-slate-100 pt-4"><button type="button" onClick={() => navigate(ROUTES.ADMIN_CROP_TYPES)} className="h-10 rounded-lg border border-slate-300 px-4 text-sm font-semibold text-slate-700">Hủy</button><button disabled={saving} className="h-10 rounded-lg bg-emerald-700 px-5 text-sm font-bold text-white hover:bg-emerald-800 disabled:opacity-60">{saving ? 'Đang lưu...' : isEdit ? 'Lưu thay đổi' : 'Lưu loại nông sản'}</button></div></form><aside className="space-y-4"><section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm"><p className="text-[11px] font-bold uppercase tracking-wide text-slate-500">Xem trước thẻ</p><div className="mt-4 flex gap-3 rounded-lg border border-slate-200 bg-slate-50 p-3"><span className="grid size-12 shrink-0 place-items-center rounded-lg bg-emerald-100 text-xl">🌾</span><div className="min-w-0"><div className="flex gap-2"><span className="min-w-0 break-all text-[10px] font-bold text-slate-400">{form.code || 'CRP-XXX'}</span><span className={`text-[10px] font-bold ${form.isActive ? 'text-emerald-700' : 'text-slate-500'}`}>{form.isActive ? 'HOẠT ĐỘNG' : 'NGỪNG'}</span></div><h3 className="truncate font-bold">{form.name || 'Tên nông sản mới'}</h3><p className="text-xs text-slate-500">{form.categoryName}</p></div></div></section><section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm"><h2 className="text-sm font-bold">Hướng dẫn</h2><ul className="mt-3 space-y-2 text-xs leading-5 text-slate-600"><li>✓ Mã và tên không được trùng.</li><li>✓ Chọn đúng danh mục cha và danh mục con.</li><li>✓ Danh mục đã được sử dụng không thể xóa.</li></ul></section></aside></div>
  </div>
}

function Section({ title, icon, children }: { title: string; icon: 'package' | 'shield'; children: ReactNode }) { return <section className="border-b border-slate-100 pb-5 last:border-0"><div className="mb-5 flex items-center gap-2"><span className="grid size-8 place-items-center rounded-lg bg-emerald-50 text-emerald-700"><AppIcon name={icon} className="size-4" /></span><h2 className="font-bold">{title}</h2></div>{children}</section> }
