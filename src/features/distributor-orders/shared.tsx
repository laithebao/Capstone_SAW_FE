import { orderStatuses } from './format'

export function DistributorHeader({ title, description }: { title: string; description: string }) {
  return <header><p className="text-xs font-semibold text-emerald-700">CỔNG NHÀ PHÂN PHỐI</p><h1 className="mt-1 text-2xl font-bold">{title}</h1><p className="mt-1 text-sm text-slate-500">{description}</p></header>
}
export function StatusBadge({ status }: { status: string }) {
  const color = status === 'DELIVERED' ? 'bg-emerald-50 text-emerald-700' : ['CANCELLED', 'REJECTED'].includes(status) ? 'bg-rose-50 text-rose-700' : 'bg-amber-50 text-amber-800'
  return <span className={`inline-block whitespace-nowrap rounded-full px-3 py-1 text-xs font-semibold ${color}`}>{orderStatuses[status] ?? status}</span>
}
export function Pagination({ page, pageSize, total, busy, onPage, onSize }: { page: number; pageSize: number; total: number; busy: boolean; onPage: (value: number) => void; onSize: (value: number) => void }) {
  const pages = Math.max(1, Math.ceil(total / pageSize))
  return <footer className="flex flex-wrap items-center justify-between gap-3 py-4 text-sm"><label>Số dòng <select aria-label="Số dòng mỗi trang" value={pageSize} onChange={e => onSize(Number(e.target.value))} className="ml-2 rounded border p-1">{[10, 20, 50].map(size => <option key={size}>{size}</option>)}</select></label><div className="flex items-center gap-4"><button disabled={busy || page <= 1} onClick={() => onPage(page - 1)} className="disabled:opacity-40">Trước</button><span>{page}/{pages} · {total} kết quả</span><button disabled={busy || page >= pages} onClick={() => onPage(page + 1)} className="disabled:opacity-40">Sau</button></div></footer>
}
