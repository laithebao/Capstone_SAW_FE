import { Link } from 'react-router';

export function SupplierBatchBreadcrumb({ batchId, batchCode, editing = false }: {
  batchId: number; batchCode: string; editing?: boolean;
}) {
  return <nav aria-label="Đường dẫn" className="flex flex-wrap items-center gap-2 text-xs text-gray-500 mb-2">
    <Link to="/supplier/batches" className="hover:text-emerald-700">Quản lý lô hàng</Link>
    <span aria-hidden="true">/</span>
    {editing ? <Link to={`/supplier/batches/${batchId}`}>Chi tiết lô hàng</Link> : <span aria-current="page">Chi tiết lô hàng</span>}
    {editing && <><span aria-hidden="true">/</span><span aria-current="page">Chỉnh sửa lô hàng</span></>}
    <span className="font-mono">#{batchCode}</span>
  </nav>;
}
