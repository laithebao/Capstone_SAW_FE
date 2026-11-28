import { useEffect, useState } from 'react'
import { getCategories, type Category } from '@/services/categoryService'
import type { CropType } from '@/services/cropTypeService'
import CropTypeLookupSelect from '@/components/common/CropTypeLookupSelect'
import type { SupplierCropTypeDto } from '@/types/supplier'
export default function SupplierCropSelector({ value, onChange, legacy = [] }: { value: number[]; onChange: (ids: number[]) => void; legacy?: SupplierCropTypeDto[] }) {
  const [categories, setCategories] = useState<Category[]>([]), [known, setKnown] = useState<Record<number, CropType>>({})
  const [parent, setParent] = useState(''), [child, setChild] = useState(''), [error, setError] = useState(''), [loading, setLoading] = useState(true), [attempt, setAttempt] = useState(0)
  useEffect(() => {
    let active = true; setLoading(true); setError('')
    void getCategories(true).then(cats => { if (active) setCategories(cats) }).catch(() => { if (active) setError('Không tải được danh mục nông sản.') }).finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [attempt])
  const selectClass = 'min-w-0 min-h-10 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm disabled:bg-slate-100'
  return <div className="space-y-3">
    {error && <div role="alert" className="text-sm text-rose-700">{error}<button type="button" onClick={() => setAttempt(n => n + 1)} className="ml-2 underline">Thử lại</button></div>}
    {value.map(id => {
      const crop = known[id], old = legacy.find(x => x.cropTypeId === Number(id))
      return <div key={id} className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm"><div className="min-w-0"><p className="text-xs text-slate-500">{crop?.categoryName ?? old?.categoryName ?? 'Lựa chọn đã lưu'}{crop?.childCategoryName ? ` → ${crop.childCategoryName}` : ''}</p><p className="mt-1 break-words font-semibold text-slate-800">{crop?.code ?? old?.cropCode ?? `Nông sản #${id}`} · {crop?.name ?? old?.cropName}</p></div><button type="button" className="shrink-0 rounded-lg px-3 py-2 text-rose-700 hover:bg-rose-50" onClick={() => onChange(value.filter(x => x !== id))}>Xóa</button></div>
    })}
    <div className="grid items-start gap-3 md:grid-cols-3">
      <select aria-label="Category cha" className={selectClass} value={parent} disabled={loading || Boolean(error)} onChange={e => { setParent(e.target.value); setChild('') }}><option value="">{loading ? 'Đang tải danh mục...' : 'Chọn danh mục cha'}</option>{categories.filter(x => x.parentId === null).map(x => <option value={x.categoryId} key={x.categoryId}>{x.name}</option>)}</select>
      <select aria-label="Category con" className={selectClass} value={child} disabled={!parent} onChange={e => setChild(e.target.value)}><option value="">Chọn danh mục con</option>{categories.filter(x => x.parentId === Number(parent)).map(x => <option value={x.categoryId} key={x.categoryId}>{x.name}</option>)}</select>
      <CropTypeLookupSelect key={child} value={0} enabled={Boolean(child)} categoryId={child ? Number(child) : undefined} disabledIds={value} onChange={crop => { setKnown(current => ({ ...current, [crop.id]: crop })); if (!value.includes(crop.id)) onChange([...value, crop.id]) }} />
    </div>
    {!loading && !error && !categories.length && <p className="text-sm text-slate-500">Chưa có danh mục hoạt động.</p>}
  </div>
}
