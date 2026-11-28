import { Link, useNavigate, useOutletContext } from 'react-router'
import AppIcon from '@/components/common/AppIcon'
import DistributorFade from '@/features/distributor-orders/DistributorFade'
import produceImage from '@/assets/images/home-produce.png'
import { ROUTES } from '@/constants/routes'
import type { DistributorOutletContext } from '@/layouts/DistributorLayout'
import { money, panel, primary, weight } from '@/features/distributor-orders/format'

export default function DistributorCartPage() {
  const navigate = useNavigate()
  const { selectedLots, setSelectedLots } = useOutletContext<DistributorOutletContext>()
  const totalWeight = selectedLots.reduce((sum, lot) => sum + lot.weightKg, 0)
  const totalPrice = selectedLots.reduce((sum, lot) => sum + lot.wholeLotPrice, 0)
  return <div className="dist-cart-page">
    <header className="dist-cart-heading"><div><p className="dist-breadcrumb">Mua hàng <span>/</span> Giỏ lô hàng</p><h1>Giỏ lô hàng</h1><p className="dist-page-description">Kiểm tra các lô đã chọn trước khi tạo đơn mua nguyên lô.</p></div><Link to={ROUTES.DISTRIBUTOR_CATALOG}>← Tiếp tục mua hàng</Link></header>
    <DistributorFade changeKey={JSON.stringify(selectedLots.map(lot => lot.batchId))}>
    {selectedLots.length === 0 ? <section className={panel + ' dist-cart-empty'}><span><AppIcon name="shoppingBag" /></span><h2>Giỏ lô hàng đang trống</h2><p>Chọn các lô phù hợp trong danh mục để bắt đầu tạo đơn.</p><Link className={primary} to={ROUTES.DISTRIBUTOR_CATALOG}>Khám phá lô hàng</Link></section> :
      <div className="dist-cart-layout">
        <section className={panel + ' dist-cart-items'} aria-label="Lô hàng đã chọn">
          <div className="dist-cart-items-heading"><b>Các lô đã chọn</b><span>{selectedLots.length}/20 lô</span></div>
          {selectedLots.map(lot => <article className="dist-cart-item" key={lot.batchId}>
            <div className="dist-cart-item-image"><img src={produceImage} alt="" /><span>Ảnh minh họa</span></div>
            <div className="dist-cart-item-info"><Link to={ROUTES.DISTRIBUTOR_LOT_DETAIL.replace(':id', String(lot.batchId))} className="dist-cart-item-title">{lot.productName}</Link><span>{lot.batchCode} · {lot.supplierName}</span><span>Hạng {lot.qualityGrade ?? 'Chưa phân hạng'} · Mua nguyên lô</span></div>
            <div className="dist-cart-item-numbers"><b>{weight(lot.weightKg)} kg</b><strong>{money(lot.wholeLotPrice)}</strong></div>
            <div className="dist-cart-item-actions"><Link to={ROUTES.DISTRIBUTOR_LOT_DETAIL.replace(':id', String(lot.batchId))}>Chi tiết</Link><button type="button" aria-label={'Bỏ ' + lot.batchCode + ' khỏi giỏ'} onClick={() => setSelectedLots(current => current.filter(item => item.batchId !== lot.batchId))}>Bỏ khỏi giỏ</button></div>
          </article>)}
        </section>
        <aside className={panel + ' dist-cart-summary'}><h2>Tóm tắt đơn hàng</h2><div><span>Tổng số lô</span><b>{selectedLots.length}</b></div><div><span>Tổng khối lượng</span><b>{weight(totalWeight)} kg</b></div><div className="dist-cart-total"><span>Tổng giá trị dự kiến</span><strong>{money(totalPrice)}</strong></div><p>Các lô được mua nguyên vẹn. Thêm vào giỏ chưa đồng nghĩa với việc giữ hàng; kho sẽ kiểm tra khi duyệt đơn.</p><button className={primary} type="button" onClick={() => navigate(ROUTES.DISTRIBUTOR_ORDER_CREATE, { state: { lots: selectedLots } })}>Tiến hành đặt hàng</button></aside>
      </div>}
    </DistributorFade>
  </div>
}
