import type { SupplierBatchStatusResponse } from '../../types/supplierBatch';
import { supplierBatchStatusLabel } from './batchStatus.ts';

export type ProgressState = 'complete' | 'current' | 'pending' | 'stopped' | 'warning';
export interface SupplierProgressStep {
  id: string;
  label: string;
  phase: string;
  state: ProgressState;
  at?: string | null;
  note?: string;
}

const storedStatuses = new Set(['IN_STOCK', 'RESERVED', 'PARTIALLY_ISSUED', 'ISSUED']);
const hiddenStatuses = new Set(['RESERVED', 'PARTIALLY_ISSUED', 'ISSUED']);
const timestamp = (value: string) => Date.parse(/(?:Z|[+-]\d{2}:\d{2})$/.test(value) ? value : `${value}Z`);

export function getSupplierBatchProgress(data: SupplierBatchStatusResponse) {
  // The API orders equal timestamps by descending history ID; retain that order.
  const chronological = [...data.statusHistory].sort((a, b) => timestamp(b.changedAt) - timestamp(a.changedAt)).reverse();
  const storedIndex = chronological.findIndex(item => storedStatuses.has(item.newStatus) || storedStatuses.has(item.oldStatus));
  const storedEvent = storedIndex < 0 ? undefined : chronological[storedIndex];
  const isStored = Boolean(data.warehousedAt) || data.receivedQuantity > 0 || storedStatuses.has(data.currentStatus) || Boolean(storedEvent);
  const storedAt = data.warehousedAt ?? (storedEvent?.newStatus === 'IN_STOCK' ? storedEvent.changedAt : undefined);
  const visible = chronological.filter((item, index) => {
    if (hiddenStatuses.has(item.newStatus) || storedStatuses.has(item.oldStatus)) return false;
    if (isStored && storedIndex >= 0 && index > storedIndex) return false;
    return !storedAt || timestamp(item.changedAt) <= timestamp(storedAt);
  });
  const event = (status: string) => [...visible].reverse().find(item => item.newStatus === status && item.oldStatus !== status);
  const rejection = !isStored && data.currentStatus === 'REJECTED' ? event('REJECTED') : undefined;
  const inspection = data.qcInspectionStatus;
  const hasCurrentResult = inspection === 'COMPLETED' || (!inspection && Boolean(data.qcResult));
  const qcPhase = hasCurrentResult ? 5 : inspection === 'IN_PROGRESS' ? 4 : 3;
  let current = 1;
  if (isStored) current = 7;
  else if (data.currentStatus === 'PENDING_PREDECLARATION') current = 0;
  else if (data.currentStatus === 'PENDING_QC') current = qcPhase;
  else if (data.currentStatus === 'QUARANTINE') current = 5;
  else if (['APPROVED_FOR_STORAGE', 'RECEIVED'].includes(data.currentStatus)) current = 6;
  else if (data.currentStatus === 'REJECTED') {
    current = rejection?.oldStatus === 'SUBMITTED' ? 2
      : rejection?.oldStatus === 'PENDING_QC' ? qcPhase
      : rejection?.oldStatus === 'QUARANTINE' ? 5
      : rejection?.oldStatus === 'APPROVED_FOR_STORAGE' ? 6 : 1;
  }
  const definitions = [
    ['declared', 'Đã khai báo', 'Trước kiểm định'],
    ['submitted', 'Chờ tiếp nhận', 'Trước kiểm định'],
    ['accepted', 'Đã tiếp nhận', 'Trước kiểm định'],
    ['waiting-qc', 'Chờ kiểm định', 'Kiểm định chất lượng'],
    ['inspecting', 'Đang kiểm định', 'Kiểm định chất lượng'],
    ['qc-result', 'Kết quả kiểm định', 'Kiểm định chất lượng'],
    ['waiting-storage', 'Chờ nhập kho', 'Sau kiểm định'],
    ['stored', 'Đã nhập kho', 'Sau kiểm định'],
  ];
  const steps: SupplierProgressStep[] = definitions.map(([id, label, phase], index) => ({
    id, label, phase, state: index < current ? 'complete' : index === current ? 'current' : 'pending',
  }));
  steps[0].at = data.createdAt;
  steps[1].at = event('SUBMITTED')?.changedAt;
  steps[2].at = visible.find(item => item.oldStatus === 'SUBMITTED' && item.newStatus === 'PENDING_QC')?.changedAt;
  steps[3].at = event('PENDING_QC')?.changedAt;
  // StartedAt records draft creation, so it cannot date the IN_PROGRESS milestone.
  steps[5].at = hasCurrentResult || isStored ? data.qcCompletedAt : undefined;
  steps[6].at = event('APPROVED_FOR_STORAGE')?.changedAt;
  steps[7].at = storedAt;
  if ((hasCurrentResult || isStored) && data.qcResult) {
    const result = ['PASS', 'PASSED'].includes(data.qcResult) ? 'Đạt' : ['FAIL', 'FAILED'].includes(data.qcResult) ? 'Không đạt' : data.qcResult;
    steps[5].note = `Kết quả: ${result}${data.qualityGrade ? ` · Hạng ${data.qualityGrade}` : ''}`;
  }
  let fallbackRejection: string | undefined;
  if (!isStored && data.currentStatus === 'CANCELLED') {
    steps[1].label = 'Đã hủy';
    steps[1].state = 'stopped';
    steps[1].at = event('CANCELLED')?.changedAt;
    steps[1].note = event('CANCELLED')?.changeReason || 'Lô hàng đã được hủy trước khi tiếp nhận.';
  } else if (!isStored && data.currentStatus === 'REJECTED') {
    const reason = data.rejectionReason || rejection?.changeReason || 'Không có ghi chú từ chối.';
    if (rejection && ['SUBMITTED', 'PENDING_QC', 'QUARANTINE', 'APPROVED_FOR_STORAGE'].includes(rejection.oldStatus)) {
      if (rejection.oldStatus === 'SUBMITTED') steps[current].label = 'Tiếp nhận lô hàng';
      steps[current].state = 'stopped';
      steps[current].note = [steps[current].note, `Bị từ chối: ${reason}`].filter(Boolean).join('\n');
      steps[current].at = rejection.changedAt;
    } else {
      fallbackRejection = `Bị từ chối: ${reason} Chưa xác định được giai đoạn từ lịch sử.`;
      steps[1].state = 'pending';
    }
  } else if (!isStored && data.currentStatus === 'QUARANTINE') {
    steps[5].state = 'warning';
    steps[5].note = [steps[5].note, 'Lô hàng đang cách ly, chưa được duyệt nhập kho.'].filter(Boolean).join('\n');
  }
  if (isStored) steps[7].state = 'complete';
  return {
    steps, fallbackRejection, isStored,
    statusLabel: isStored ? 'Đã nhập kho' : data.statusDisplayName || supplierBatchStatusLabel(data.currentStatus),
    history: visible.reverse(),
  };
}
