import type { ComponentProps, ReactNode } from 'react'
import AppIcon from '@/components/common/AppIcon'
import { orderStatuses } from './format'

type IconName = ComponentProps<typeof AppIcon>['name']

export function DistributorHeader({ title, description, icon = 'clipboard', action }: { title: string; description: string; icon?: IconName; action?: ReactNode }) {
  return <header className="dist-page-heading">
    <span className="dist-page-icon"><AppIcon name={icon} className="size-5" /></span>
    <div className="dist-page-heading-copy">
      <p className="dist-breadcrumb">Nhà phân phối <span>/</span> {title}</p>
      <h1>{title}</h1>
      <p className="dist-page-description">{description}</p>
    </div>
    {action && <div className="dist-page-heading-action">{action}</div>}
  </header>
}
export function StatusBadge({ status }: { status: string }) {
  const color = status === 'DELIVERED' ? 'dist-status--success' : status === 'RETURNED' ? 'dist-status--neutral' : ['CANCELLED', 'REJECTED', 'DELIVERY_REFUSED'].includes(status) ? 'dist-status--danger' : ['APPROVED', 'RESERVED', 'PICKED', 'ISSUED', 'DISPATCHED', 'PARTIALLY_PICKED', 'PARTIALLY_ISSUED'].includes(status) ? 'dist-status--info' : 'dist-status--pending'
  return <span className={`dist-status-badge ${color}`} data-status={status}>{orderStatuses[status] ?? status}</span>
}
export function Pagination({ page, pageSize, total, busy, onPage, onSize }: { page: number; pageSize: number; total: number; busy: boolean; onPage: (value: number) => void; onSize: (value: number) => void }) {
  const pages = Math.max(1, Math.ceil(total / pageSize))
  return <footer className="dist-pagination"><label>Số dòng <select aria-label="Số dòng mỗi trang" value={pageSize} onChange={e => onSize(Number(e.target.value))}>{[10, 20, 50].map(size => <option key={size}>{size}</option>)}</select></label><div><button type="button" disabled={busy || page <= 1} onClick={() => onPage(page - 1)}>Trước</button><span>{page}/{pages} · {total} kết quả</span><button type="button" disabled={busy || page >= pages} onClick={() => onPage(page + 1)}>Sau</button></div></footer>
}
