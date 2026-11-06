import { useEffect, useState, type MouseEvent } from 'react'
import { ArrowRight, PackageOpen } from 'lucide-react'
import { Link } from 'react-router'
import { ROUTES } from '@/constants/routes'
import { ROLES } from '@/constants/roles'
import { useAuth } from '@/hooks/useAuth'
import { useHomeSequentialReveal } from '@/hooks/useHomeSequentialReveal'
import { showNavigationRipple } from '@/hooks/showNavigationRipple'
import { apiClient } from '@/services/apiClient'
import type { ApiResponse, PagedResponse } from '@/types/api'
import HomeGradeInfo from './HomeGradeInfo'

interface PublicLot {
  batchId: number
  batchCode: string
  productName: string
  cropName: string
  qualityGrade: string | null
  expiryDate: string | null
  weightKg: number
  wholeLotPrice: number
}

const number = new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 2 })
const money = new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' })

export default function HomeCatalog() {
  const { user, isAuthenticated } = useAuth()
  const [page, setPage] = useState(1)
  const [data, setData] = useState<PagedResponse<PublicLot> | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [retry, setRetry] = useState(0)
  useHomeSequentialReveal('catalog', loading || error ? null : data)

  useEffect(() => {
    const controller = new AbortController()
    setLoading(true)
    setError(false)
    apiClient.get<ApiResponse<PagedResponse<PublicLot>>>('/public/catalog', { params: { page, pageSize: 10 }, headers: { 'Cache-Control': 'no-cache' }, signal: controller.signal })
      .then((response) => setData(response.data.data))
      .catch(() => { if (!controller.signal.aborted) setError(true) })
      .finally(() => { if (!controller.signal.aborted) setLoading(false) })
    return () => controller.abort()
  }, [page, retry])

  const canOrder = !isAuthenticated || user?.role === ROLES.DISTRIBUTOR
  const orderLink = isAuthenticated ? ROUTES.DISTRIBUTOR_CATALOG : ROUTES.LOGIN
  const openOrdering = (event: MouseEvent<HTMLAnchorElement>) => {
    if (isAuthenticated || event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return
    showNavigationRipple(event.currentTarget)
  }
  return (
    <section id="lo-hang" className="home-catalog">
      <div className="home-container home-catalog-inner">
        <div className="home-catalog-heading">
          <div><p className="home-eyebrow">NÔNG SẢN SẴN SÀNG PHÂN PHỐI</p><h2>Lô hàng đang bán.</h2><p>Các lô đã qua kiểm định và được công bố bán trên hệ thống.</p></div>
          {canOrder && <Link className="home-catalog-action" to={orderLink} onClick={openOrdering}>{isAuthenticated ? 'Đến trang đặt mua' : 'Đăng nhập để đặt mua'} <ArrowRight size={17} /></Link>}
        </div>
        {loading ? <p className="home-catalog-message" role="status">Đang tải các lô hàng...</p>
          : error ? <div className="home-catalog-message" role="alert">Không thể tải danh sách lô hàng. <button type="button" onClick={() => setRetry((value) => value + 1)}>Thử lại</button></div>
          : !data?.items.length ? <div className="home-catalog-message"><PackageOpen size={22} /> Hiện chưa có lô hàng nào đang bán.</div>
          : <div className="home-catalog-grid">{data.items.map((lot) => <article className="home-catalog-card" key={lot.batchId}>
            <div className="home-catalog-card-top"><span>{lot.cropName}</span><span>Đang bán</span></div>
            <h3>{lot.productName}</h3><p className="home-catalog-code">{lot.batchCode}</p>
            <div className="home-catalog-details"><div>Khối lượng <strong>{number.format(lot.weightKg)} kg</strong></div><div>Chất lượng <div className="home-grade-value"><strong>{lot.qualityGrade ? `Hạng ${lot.qualityGrade}` : 'Đã kiểm định'}</strong><HomeGradeInfo grade={lot.qualityGrade} /></div></div></div>
            <div className="home-catalog-price"><span>Giá cả lô</span><strong>{money.format(lot.wholeLotPrice)}</strong></div>
          </article>)}</div>}
        {data && data.totalCount > data.pageSize && !loading && !error && <div className="home-catalog-pagination"><button type="button" disabled={page <= 1} onClick={() => setPage((value) => value - 1)}>Trước</button><span>Trang {page} / {Math.ceil(data.totalCount / data.pageSize)}</span><button type="button" disabled={page * data.pageSize >= data.totalCount} onClick={() => setPage((value) => value + 1)}>Sau</button></div>}
      </div>
    </section>
  )
}
