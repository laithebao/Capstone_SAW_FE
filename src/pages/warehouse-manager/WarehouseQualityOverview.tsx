import './warehouse-quality.css'
import './warehouse-dashboard.css'
import { useState } from 'react'
import { Award, ClipboardCheck, Clock3, Package } from 'lucide-react'
import { AnimatedNumber } from '@/components/common/AnimatedNumber'
import AppIcon from '@/components/common/AppIcon'
import type { ProductQualityDistributionChart } from '@/types/inventory'

const fmt = new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 1 })
const date = new Intl.DateTimeFormat('vi-VN', { dateStyle: 'short', timeStyle: 'medium' })
const colors: Record<string, string> = { A:'#087F59', B:'#3B82F6', C:'#D99A32', D:'#A855F7', E:'#DB6176', UNGRADED:'#A3ADBA' }
const palette = ['#0f766e','#6366f1','#e07638','#4c86a8','#96733f']
const color = (grade: string) => colors[grade.toUpperCase()] ?? palette[[...grade].reduce((n, c) => n + c.charCodeAt(0), 0) % palette.length]
const name = (grade: string) => grade === 'UNGRADED' ? 'Chưa phân hạng' : `Hạng ${grade}`
const pct = (value: number, total: number) => total > 0 ? value / total * 100 : 0

type Props = { quality: ProductQualityDistributionChart | null; loading: boolean; error: string; onRefresh: () => void }
export default function WarehouseQualityOverview({ quality, loading, error, onRefresh }: Props) {
  const [hovered, setHovered] = useState<string | null>(null)
  const total = quality?.totalQuantityOnHandKg ?? 0
  const graded = quality && quality.totalBatchCount ? pct(quality.gradedBatchCount, quality.totalBatchCount) : 0
  const lead = quality?.grades.find(g => g.grade === quality.leadingGrade)
  return <div className="saw-quality-page">
    <header className="quality-header"><div><p>Quản lý kho / Phân bố chất lượng</p><h1>Phân bố chất lượng</h1><span>Theo dõi kết quả phân hạng và tỷ trọng chất lượng của các lô hàng đang tồn kho.</span></div><div className="saw-wm-dashboard"><button type="button" className="wm-refresh" onClick={onRefresh} disabled={loading}><AppIcon name="refresh" className={loading ? 'wm-spin' : ''} /> Làm mới</button></div></header>
    {error && <div className="quality-error" role="alert">{error} <button type="button" onClick={onRefresh} disabled={loading}>Thử lại</button></div>}
    {!quality ? <div className="quality-loading" role="status">{loading ? 'Đang tải dữ liệu chất lượng…' : 'Chưa tải được dữ liệu chất lượng.'}</div> : <>
      <div className="quality-stats">
        {[
          { label:'Lô đang tồn', value:quality.totalBatchCount, note:`${fmt.format(total)} kg đang lưu trữ`, Icon:Package, tone:'green' },
          { label:'Đã phân hạng', value:quality.gradedBatchCount, note:quality.totalBatchCount ? `${fmt.format(graded)}% số lô đang tồn` : 'Chưa có lô đang tồn', Icon:ClipboardCheck, tone:'blue' },
          { label:'Chưa phân hạng', value:quality.ungradedBatchCount, note:quality.totalBatchCount ? `${fmt.format(pct(quality.ungradedBatchCount,quality.totalBatchCount))}% số lô đang tồn` : 'Chưa có lô đang tồn', Icon:Clock3, tone:'amber' },
          { label:'Hạng chủ đạo', value:quality.leadingGrade ? `Hạng ${quality.leadingGrade}` : 'Chưa ghi nhận', note:lead && total > 0 ? `${fmt.format(pct(lead.quantityOnHandKg,total))}% khối lượng tồn` : 'Chưa có dữ liệu khối lượng', Icon:Award, tone:'purple' },
        ].map(({label,value,note,Icon,tone}) => <article className="quality-stat wm-card" key={label}><div className="quality-stat-head"><span>{label}</span><i className={`quality-icon quality-icon--${tone}`}><Icon /></i></div><strong>{typeof value === 'number' ? <AnimatedNumber value={value} /> : value}</strong><small>{note}</small></article>)}
      </div>
      <div className="quality-updated">Cập nhật {date.format(new Date(quality.generatedAt))}</div>
      <div className="quality-analysis"><section className="quality-panel"><h2>Tỷ trọng chất lượng</h2><p>Tỷ lệ phân bố theo khối lượng đang lưu trữ.</p>
        {total > 0 && quality.grades.length ? <><div className="quality-donut-wrap"><svg viewBox="0 0 200 200" data-saw-donut className="quality-donut" role="img" aria-label="Tỷ trọng chất lượng theo khối lượng"><circle cx="100" cy="100" r="78" fill="none" stroke="#e9edf0" strokeWidth="30" />{quality.grades.map((g,index)=>{const share=Math.max(0,pct(g.quantityOnHandKg,total));const start=quality.grades.slice(0,index).reduce((sum,item)=>sum+Math.max(0,pct(item.quantityOnHandKg,total)),0);return share>0?<circle key={g.grade} cx="100" cy="100" r="78" fill="none" stroke={color(g.grade)} strokeWidth="30" pathLength="100" strokeDasharray={`${share} ${100-share}`} strokeDashoffset={-start} transform="rotate(-90 100 100)" onMouseEnter={()=>setHovered(g.grade)} onMouseLeave={()=>setHovered(null)} onFocus={()=>setHovered(g.grade)} onBlur={()=>setHovered(null)} tabIndex={0}><title>{`${name(g.grade)} · ${g.batchCount} lô · ${fmt.format(g.quantityOnHandKg)} kg · ${fmt.format(share)}%`}</title></circle>:null})}</svg><div className="quality-donut-center"><strong><AnimatedNumber value={fmt.format(total)} /></strong><span>Tổng khối lượng (kg)</span></div>{hovered && (()=>{const g=quality.grades.find(x=>x.grade===hovered);return g?<div role="tooltip" className="quality-tooltip"><strong>{name(g.grade)}</strong><span>{g.batchCount} lô · {fmt.format(g.quantityOnHandKg)} kg</span><span>{fmt.format(pct(g.quantityOnHandKg,total))}% khối lượng</span></div>:null})()}</div><div className="quality-legend">{quality.grades.map(g=><span key={g.grade}><i style={{background:color(g.grade)}} />{name(g.grade)} <b>{fmt.format(pct(g.quantityOnHandKg,total))}%</b></span>)}</div></> : <div className="quality-empty">Chưa có khối lượng tồn để phân tích chất lượng.</div>}
      </section><section className="quality-panel"><h2>Chi tiết phân bố chất lượng</h2><p>Đối chiếu số lô và khối lượng theo từng hạng chất lượng.</p><div className="quality-table-wrap"><table><thead><tr><th>Hạng chất lượng</th><th>Số lô</th><th>Khối lượng tồn</th><th>Tỷ trọng</th></tr></thead><tbody>{quality.grades.map(g=>{const share=pct(g.quantityOnHandKg,total);return <tr key={g.grade}><td><span className="quality-grade"><i style={{background:color(g.grade)}} />{name(g.grade)}</span></td><td>{g.batchCount}</td><td>{fmt.format(g.quantityOnHandKg)} kg</td><td><div className="quality-share"><span>{fmt.format(share)}%</span><div className="quality-track inv-bar"><span style={{width:`${Math.min(100,Math.max(0,share))}%`,background:color(g.grade)}} /></div></div></td></tr>})}<tr className="quality-total"><td>Tổng cộng</td><td>{quality.totalBatchCount}</td><td>{fmt.format(total)} kg</td><td>{total > 0 ? `${fmt.format(pct(quality.grades.reduce((sum,g)=>sum+g.quantityOnHandKg,0),total))}%` : '0%'}</td></tr></tbody></table></div></section></div>
      <section className="quality-panel quality-classification"><div><h2>Tiến độ phân hạng chất lượng</h2><p>{quality.totalBatchCount ? `Đã phân hạng: ${quality.gradedBatchCount}/${quality.totalBatchCount} lô · Chưa phân hạng: ${quality.ungradedBatchCount} lô` : 'Chưa có lô đang tồn để phân hạng.'}</p></div><div className="quality-completion"><strong><AnimatedNumber value={`${fmt.format(graded)}%`} /></strong><div className="quality-track inv-bar"><span style={{width:`${Math.min(100,Math.max(0,graded))}%`}} /></div></div></section>
    </>}
  </div>
}
