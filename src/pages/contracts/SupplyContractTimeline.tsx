import { Ban, CalendarClock, CircleDashed, CircleMinus, ClipboardCheck, ClipboardX, Clock, FilePenLine, FilePlus, FileX, ShieldCheck, ShieldX, UserCheck, UserRound, UserX } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { SupplyContractDetail } from '@/types/supplyContract';
import './supply-contract-timeline.css';

type Item = { id: string; title: string; icon: LucideIcon; tone: 'blue' | 'green' | 'red' | 'amber' | 'gray' | 'purple'; actor?: string | null; date?: string | null; reason?: string | null; description?: string; future?: boolean };

function buildContractTimeline(contract: SupplyContractDetail): Item[] {
  const { status } = contract;
  const items: Item[] = [{ id: 'create', title: 'Quản lý kho đã tạo và gửi hợp đồng', icon: FilePlus, tone: 'blue', actor: contract.warehouseManagerName, date: contract.createdAt }];
  if (contract.revision > 1) items.push({ id: 'revision', title: `Quản lý kho đã cập nhật hợp đồng · Phiên bản ${contract.revision}`, icon: FilePenLine, tone: 'purple', description: 'Thời gian và người cập nhật chưa được ghi nhận.' });
  if (contract.supplierRespondedAt) {
    const rejected = status === 'SUPPLIER_REJECTED' || Boolean(contract.supplierRejectionReason);
    items.push({ id: 'supplier', title: rejected ? 'Nhà cung cấp đã từ chối hợp đồng' : 'Nhà cung cấp đã xác nhận hợp đồng', icon: rejected ? UserX : UserCheck, tone: rejected ? 'red' : 'green', actor: contract.supplierName, date: contract.supplierRespondedAt, reason: contract.supplierRejectionReason });
  } else if (status === 'PENDING_SUPPLIER') items.push({ id: 'supplier-pending', title: 'Chờ nhà cung cấp xác nhận', icon: Clock, tone: 'amber', description: 'Đang chờ xác nhận.', future: true });

  const cancelledByAdmin = status === 'CANCELLED' && Boolean(contract.cancellationRequestedAt && contract.cancelledAt && contract.adminReviewedAt && Date.parse(contract.cancelledAt) === Date.parse(contract.adminReviewedAt));
  if (status === 'SUPPLIER_REJECTED') items.push({ id: 'admin-skipped', title: 'Admin duyệt cuối cùng', icon: CircleMinus, tone: 'gray', description: 'Không thực hiện do nhà cung cấp từ chối hợp đồng.', future: true });
  else if (status === 'PENDING_SUPPLIER') items.push({ id: 'admin-future', title: 'Admin duyệt cuối cùng', icon: CircleDashed, tone: 'gray', description: 'Chưa đến bước xử lý.', future: true });
  else if (status === 'PENDING_ADMIN') items.push({ id: 'admin-pending', title: 'Chờ Admin duyệt cuối cùng', icon: Clock, tone: 'amber', description: 'Đang chờ xử lý.', future: true });
  else if (contract.adminReviewedAt || cancelledByAdmin) {
    const rejected = status === 'ADMIN_REJECTED' || Boolean(contract.adminRejectionReason);
    items.push({ id: 'admin', title: rejected ? 'Admin đã từ chối hợp đồng' : 'Admin đã duyệt hợp đồng', icon: rejected ? ShieldX : ShieldCheck, tone: rejected ? 'red' : 'green', actor: cancelledByAdmin ? null : contract.adminName, date: cancelledByAdmin ? null : contract.adminReviewedAt, reason: contract.adminRejectionReason });
  }
  if (contract.cancellationRequestedAt) items.push({ id: 'request', title: 'Nhà cung cấp đã gửi yêu cầu hủy hợp đồng', icon: FileX, tone: 'amber', actor: contract.supplierName, date: contract.cancellationRequestedAt, reason: contract.cancellationRequestReason });
  if (status === 'CANCELLATION_REQUESTED') {
    items.push({ id: 'warehouse-pending', title: 'Chờ Quản lý kho xử lý yêu cầu hủy', icon: Clock, tone: 'amber', description: 'Đang chờ xem xét.', future: true }, { id: 'cancel-admin-future', title: 'Admin duyệt hủy', icon: CircleDashed, tone: 'gray', description: 'Chưa đến bước xử lý.', future: true });
  } else if (status === 'CANCELLATION_REJECTED') {
    items.push({ id: 'warehouse-rejected', title: 'Quản lý kho không duyệt yêu cầu hủy', icon: ClipboardX, tone: 'red', reason: contract.cancellationReason }, { id: 'cancel-admin-skipped', title: 'Admin duyệt hủy', icon: CircleMinus, tone: 'gray', description: 'Không thực hiện do yêu cầu hủy không được duyệt.', future: true });
  } else if (status === 'PENDING_ADMIN_CANCELLATION' || cancelledByAdmin) {
    items.push({ id: 'warehouse-approved', title: 'Quản lý kho đã duyệt yêu cầu hủy', icon: ClipboardCheck, tone: 'blue' });
    if (!cancelledByAdmin) items.push({ id: 'cancel-admin-pending', title: 'Chờ Admin duyệt hủy', icon: Clock, tone: 'amber', description: 'Chưa hủy hợp đồng chính thức.', future: true });
  }
  if (status === 'CANCELLED' && contract.cancelledAt) items.push({ id: 'cancelled', title: cancelledByAdmin ? 'Admin đã hủy hợp đồng chính thức' : 'Hợp đồng đã được hủy', icon: Ban, tone: 'red', actor: cancelledByAdmin ? contract.adminName : null, date: contract.cancelledAt, reason: cancelledByAdmin ? null : contract.cancellationReason });
  const dated = items.filter(item => item.date && !Number.isNaN(Date.parse(item.date))).sort((a, b) => Date.parse(a.date!) - Date.parse(b.date!));
  let nextDated = 0;
  return items.map(item => item.date && !Number.isNaN(Date.parse(item.date)) ? dated[nextDated++] : item);
}

export default function SupplyContractTimeline({ contract, formatDateTime }: { contract: SupplyContractDetail; formatDateTime: (date: string) => string }) {
  const items = buildContractTimeline(contract);
  const displayDate = (date: string) => formatDateTime(date).replace(/^(\d{2}:\d{2})\s+(\d{2}\/\d{2}\/\d{4})$/, '$2 · $1');
  return <section className="saw-contract-timeline" aria-label="Lịch sử xử lý">
    <h3 className="saw-contract-timeline__heading">Lịch sử xử lý</h3>
    <ol className="saw-contract-timeline__list">{items.map(({ id, title, icon: Icon, tone, actor, date, reason, description, future }) => <li className="saw-contract-timeline__item" key={id}>
      <span className={`saw-contract-timeline__icon saw-contract-timeline--${tone}`}><Icon aria-hidden="true" /></span>
      <div className="saw-contract-timeline__content"><p className="saw-contract-timeline__title">{title}</p>
        {!future && !description && <><p className="saw-contract-timeline__meta"><UserRound aria-hidden="true" />{actor || 'Người thực hiện: Chưa ghi nhận'}</p><p className="saw-contract-timeline__meta"><CalendarClock aria-hidden="true" />{date && !Number.isNaN(Date.parse(date)) ? displayDate(date) : 'Thời gian: Chưa ghi nhận'}</p></>}
        {description && <p className="saw-contract-timeline__description">{description}</p>}{reason && <p className={`saw-contract-timeline__reason saw-contract-timeline__reason--${tone}`}>Lý do: {reason}</p>}
      </div>
    </li>)}</ol>
  </section>;
}
