import { useCallback } from 'react'
import { Link, useLocation, useNavigate, useParams } from 'react-router'
import { ROUTES } from '@/constants/routes'
import { getDistributorLot } from '@/services/orderService'
import type { CatalogLot } from '@/types/order'
import { DistributorHeader } from '@/features/distributor-orders/shared'
import { date, money, panel, primary, timestamp, weight } from '@/features/distributor-orders/format'
import { useDistributorResource } from '@/features/distributor-orders/useDistributorResource'

const batchLabels: Record<string, string> = { IN_STOCK: 'Trong kho', RESERVED: 'Đã giữ hàng', ISSUED: 'Đã xuất kho', PARTIALLY_ISSUED: 'Đã xuất một phần', REJECTED: 'Bị từ chối', QUARANTINE: 'Cách ly', CANCELLED: 'Đã hủy' }
const range = (min: number | null, max: number | null, unit: string) => min == null && max == null ? 'Chưa có thông tin' : `${min ?? '—'} đến ${max ?? '—'} ${unit}`

export default function DistributorLotDetailPage() {
  const id = Number(useParams().id)
  const navigate = useNavigate()
  const location = useLocation()
  const selected = (location.state as { selectedLots?: CatalogLot[] } | null)?.selectedLots ?? []
  const result = useDistributorResource(useCallback((signal: AbortSignal) => getDistributorLot(id, signal), [id]))
  const lot = result.data
  function choose() {
    if (!lot?.canPurchase || lot.wholeLotPrice == null) return
    const chosen: CatalogLot = { ...lot, wholeLotPrice: lot.wholeLotPrice }
    navigate(ROUTES.DISTRIBUTOR_CATALOG, { state: { selectedLots: [...selected.filter(l => l.batchId !== lot.batchId), chosen] } })
  }
  return <div className="mx-auto max-w-[1100px] space-y-5">
    <DistributorHeader title="Chi tiết lô hàng" description="Xem nguồn gốc, kiểm định, quy cách và giá cả lô trước khi đặt mua." />
    <Link to={ROUTES.DISTRIBUTOR_CATALOG} state={{ selectedLots: selected }} className="inline-block text-sm font-semibold text-emerald-700">← Quay lại lô hàng đang bán</Link>
    {result.error && <div role="alert" className="rounded-lg bg-rose-50 p-4 text-rose-700">{result.error} <button onClick={result.reload} className="underline">Thử lại</button></div>}
    {result.loading ? <p role="status">Đang tải chi tiết lô...</p> : lot && <>
      <section className={panel}><div className="flex flex-wrap justify-between gap-3"><div><p className="font-mono text-sm text-emerald-700">{lot.batchCode}</p><h2 className="mt-2 text-xl font-bold">{lot.productName}</h2></div><span className="h-fit rounded-full bg-emerald-50 px-3 py-1 text-sm text-emerald-800">{batchLabels[lot.batchStatus] ?? lot.batchStatus}</span></div>
        <dl className="mt-5 grid gap-4 text-sm sm:grid-cols-2"><div><dt className="text-slate-500">Loại nông sản / nhóm</dt><dd>{lot.cropName} / {lot.categoryName}</dd></div><div><dt className="text-slate-500">Nhà cung cấp</dt><dd>{lot.supplierName}</dd></div><div><dt className="text-slate-500">Vùng trồng</dt><dd>{lot.origin}</dd></div><div><dt className="text-slate-500">Địa phương</dt><dd>{[lot.ward, lot.district, lot.province].filter(Boolean).join(', ') || 'Chưa có thông tin'}</dd></div><div><dt className="text-slate-500">Ngày thu hoạch</dt><dd>{date(lot.harvestDate)}</dd></div><div><dt className="text-slate-500">Hạn sử dụng</dt><dd>{date(lot.expiryDate)}</dd></div><div><dt className="text-slate-500">Khối lượng nguyên lô</dt><dd className="font-semibold">{weight(lot.weightKg)} kg</dd></div><div><dt className="text-slate-500">Giá bán hiện tại / cả lô</dt><dd className="text-xl font-bold text-emerald-700">{lot.wholeLotPrice == null ? 'Chưa công bố giá' : money(lot.wholeLotPrice)}</dd></div></dl>
      </section>
      <div className="grid gap-5 md:grid-cols-2"><section className={panel}><h2 className="font-bold">Kiểm định chất lượng</h2><dl className="mt-4 space-y-3 text-sm"><div><dt className="text-slate-500">Hạng chất lượng</dt><dd>{lot.qualityGrade ?? 'Chưa có thông tin'}</dd></div><div><dt className="text-slate-500">Kết quả QC mới nhất</dt><dd>{lot.qcResult === 'PASS' ? 'Đạt' : lot.qcResult === 'FAIL' ? 'Không đạt' : 'Chưa hoàn tất'}</dd></div><div><dt className="text-slate-500">Tiêu chuẩn kiểm định áp dụng</dt><dd>{lot.inspectionStandardName ?? 'Chưa có thông tin'}{lot.inspectionStandardName && lot.inspectionStandardVersionNo != null && ` · Phiên bản ${lot.inspectionStandardVersionNo}`}</dd></div><div><dt className="text-slate-500">Thời điểm hoàn tất QC</dt><dd>{lot.qcCompletedAt ? timestamp(lot.qcCompletedAt) : 'Chưa có thông tin'}</dd></div></dl></section>
      <section className={panel}><h2 className="font-bold">Quy cách và điều kiện bảo quản</h2><dl className="mt-4 space-y-3 text-sm"><div><dt className="text-slate-500">Đóng gói</dt><dd>{lot.packagingType ?? 'Chưa có thông tin'}{lot.packageCount != null && ` · ${lot.packageCount} kiện`}{lot.packageUnitWeightKg != null && ` · ${weight(lot.packageUnitWeightKg)} kg/kiện`}</dd></div><div><dt className="text-slate-500">Nhiệt độ dự kiến</dt><dd>{range(lot.minTempC, lot.maxTempC, '°C')}</dd></div><div><dt className="text-slate-500">Độ ẩm dự kiến</dt><dd>{range(lot.minHumidityPct, lot.maxHumidityPct, '%')}</dd></div></dl></section></div>
      <section className={`${panel} space-y-3`}>{lot.canPurchase ? <><p className="text-sm text-slate-600">Mua nguyên lô. Lô được giữ sau khi quản lý kho duyệt đơn; giá và tồn kho được kiểm tra lại khi đặt.</p><button onClick={choose} disabled={selected.length >= 20 && !selected.some(l => l.batchId === lot.batchId)} className={primary}>Chọn mua nguyên lô</button>{selected.length >= 20 && !selected.some(l => l.batchId === lot.batchId) && <p className="text-sm text-amber-700">Đã chọn tối đa 20 lô. Hãy bỏ một lô trước khi chọn thêm.</p>}</> : <p role="status" className="text-sm text-amber-800">Lô hiện không còn khả dụng để đặt mua. Bạn vẫn có thể xem thông tin lô thuộc đơn hàng của mình.</p>}</section>
    </>}
  </div>
}
