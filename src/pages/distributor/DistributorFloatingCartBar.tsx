import { Link } from 'react-router'
import AppIcon from '@/components/common/AppIcon'
import DistributorFade from '@/features/distributor-orders/DistributorFade'
import { ROUTES } from '@/constants/routes'
import type { CatalogLot } from '@/types/order'
import { money, primary, weight } from '@/features/distributor-orders/format'

export default function DistributorFloatingCartBar({ selectedLots }: { selectedLots: CatalogLot[] }) {

  const totalWeight = selectedLots.reduce((sum, lot) => sum + lot.weightKg, 0)
  const totalPrice = selectedLots.reduce((sum, lot) => sum + lot.wholeLotPrice, 0)
  return <DistributorFade as="aside" changeKey={selectedLots.length ? 'selected' : null} className="dist-selection-bar" aria-label="Giỏ lô hàng đã chọn" aria-live="polite">
    <div className="dist-selection-leading">
      <span className="dist-selection-icon" aria-hidden="true"><AppIcon name="shoppingCart" /></span>
      <div className="dist-selection-summary"><b>Đã thêm {selectedLots.length}/20 lô vào giỏ</b><span>{weight(totalWeight)} kg · Mua nguyên lô</span></div>
    </div>
    <div className="dist-selection-total"><small>Tổng dự kiến</small><b>{money(totalPrice)}</b></div>
    <Link to={ROUTES.DISTRIBUTOR_CART} className={primary + ' dist-selection-cta'}>Xem giỏ lô <span aria-hidden="true">→</span></Link>
  </DistributorFade>
}
