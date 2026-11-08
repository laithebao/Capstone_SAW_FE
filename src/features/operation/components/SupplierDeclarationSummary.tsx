import type { ReactNode } from 'react'
import type { SubmittedDeclarationDetail } from '@/types/batch'
import { receivingUnit } from '../receivingDetails'

type Declaration = Omit<SubmittedDeclarationDetail, 'id' | 'supplierId' | 'cropTypeId' | 'growingAreaId'>
const number = (value: number) => value.toLocaleString('vi-VN', { maximumFractionDigits: 3 })
const date = (value: string | null) => value ? new Date(`${value}T00:00:00`).toLocaleDateString('vi-VN') : 'Chưa khai báo'
function Field({ label, children }: { label: string; children: ReactNode }) {
  return <div className="min-w-0"><dt className="text-xs font-semibold text-slate-500">{label}</dt><dd className="mt-1 break-words text-sm font-medium text-slate-900">{children}</dd></div>
}
function range(min: number | null, max: number | null, suffix: string) {
  if (min === null && max === null) return 'Chưa khai báo'
  if (min === null) return `Tối đa ${number(max!)} ${suffix}`
  if (max === null) return `Tối thiểu ${number(min)} ${suffix}`
  return `${number(min)} – ${number(max)} ${suffix}`
}

export default function SupplierDeclarationSummary({ declaration: d }: { declaration: Declaration }) {
  const mode = receivingUnit(d.unit), packaged = mode === 'Bao' || mode === 'Thùng'
  const grid = 'mt-4 grid gap-x-6 gap-y-4 sm:grid-cols-2 lg:grid-cols-3'
  return <div className="mt-5 space-y-5">
    <section><h3 className="border-b border-slate-100 pb-2 text-sm font-bold">Thông tin cơ bản</h3><dl className={grid}>
      <Field label="Mã lô">{d.batchCode}</Field><Field label="Nhà cung cấp">{d.supplierName}</Field>
      <Field label="Loại nông sản">{d.categoryName || 'Chưa ghi nhận'}</Field><Field label="Giống / phân loại sản phẩm">{d.cropTypeName}</Field>
      <Field label="Tên sản phẩm khai báo">{d.productName}</Field><Field label="Vùng trồng / trang trại">{d.growingAreaName}</Field>
    </dl></section>
    <section><h3 className="border-b border-slate-100 pb-2 text-sm font-bold">Khối lượng & quy cách đóng gói</h3><dl className={grid}>
      <Field label="Đơn vị / hình thức đóng gói">{packaged ? `${mode} (kiện)` : mode ?? d.unit}</Field>
      <Field label={packaged ? 'Số lượng kiện khai báo' : 'Số lượng khai báo'}>{number(d.declaredQuantity)} {mode ?? d.unit}</Field>
      {(mode !== 'Kg' || d.weightInKg !== d.declaredQuantity) && <Field label="Tổng khối lượng khai báo">{number(d.weightInKg)} kg</Field>}
      {(packaged || d.packageUnitWeightKg !== null) && <Field label="Khối lượng mỗi kiện">{d.packageUnitWeightKg === null ? 'Chưa khai báo' : `${number(d.packageUnitWeightKg)} kg`}</Field>}
      {d.packagingType && d.packagingType !== mode && <Field label="Quy cách đóng gói">{d.packagingType}</Field>}
      {d.packageCount !== null && (!packaged || d.packageCount !== d.declaredQuantity) && <Field label="Số kiện đã khai báo">{number(d.packageCount)}</Field>}
      <Field label="Ngày thu hoạch">{date(d.harvestDate)}</Field><Field label="Ngày giao hàng dự kiến">{date(d.expectedDeliveryDate)}</Field><Field label="Ngày hết hạn sản phẩm">{date(d.expiryDate)}</Field>
    </dl></section>
    <section><h3 className="border-b border-slate-100 pb-2 text-sm font-bold">Điều kiện bảo quản yêu cầu</h3><dl className={grid}>
      <Field label="Nhiệt độ bảo quản">{range(d.expectedMinTempC, d.expectedMaxTempC, '°C')}</Field>
      <Field label="Độ ẩm bảo quản">{range(d.expectedMinHumidityPct, d.expectedMaxHumidityPct, '%')}</Field>
      {d.shelfLifeDaysSnapshot !== null && <Field label="Thời hạn bảo quản đã ghi nhận">{d.shelfLifeDaysSnapshot} ngày</Field>}
    </dl></section>
    <section><h3 className="border-b border-slate-100 pb-2 text-sm font-bold">Mô tả / ghi chú bổ sung</h3><p className="mt-3 whitespace-pre-wrap break-words text-sm text-slate-800">{d.note?.trim() || 'Không có ghi chú.'}</p></section>
  </div>
}
