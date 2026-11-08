import { useEffect, useId, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Search, X } from 'lucide-react'

export default function HomeGradeInfo({ grade }: { grade: string | null }) {
  const [open, setOpen] = useState(false)
  const [placement, setPlacement] = useState({ above: false, shift: 0 })
  const container = useRef<HTMLDivElement>(null)
  const id = useId()
  const show = () => {
    const rect = container.current?.getBoundingClientRect()
    if (rect) {
      const width = Math.min(340, window.innerWidth - 32)
      setPlacement({ above: window.innerHeight - rect.bottom < 290 && rect.top > 290, shift: Math.max(0, Math.min(16 - (rect.right - width), window.innerWidth - 16 - rect.right)) })
    }
    setOpen(true)
  }

  useEffect(() => {
    if (!open) return
    const outside = (event: PointerEvent) => {
      if (event.target instanceof Node && !container.current?.contains(event.target)) setOpen(false)
    }
    const escape = (event: KeyboardEvent) => { if (event.key === 'Escape') setOpen(false) }
    document.addEventListener('pointerdown', outside)
    document.addEventListener('keydown', escape)
    return () => {
      document.removeEventListener('pointerdown', outside)
      document.removeEventListener('keydown', escape)
    }
  }, [open])

  return <div ref={container} className="home-grade-trigger" data-open={open} data-above={placement.above}
    onPointerEnter={(event) => { if (event.pointerType === 'mouse') show() }}
    onPointerLeave={(event) => { if (event.pointerType === 'mouse') setOpen(false) }}
    onBlur={(event) => { if (!(event.relatedTarget instanceof Node) || !event.currentTarget.contains(event.relatedTarget)) setOpen(false) }}>
    <button type="button" className="home-grade-info-button" aria-label="Tìm hiểu hạng chất lượng" aria-expanded={open} aria-controls={open ? id : undefined}
      onFocus={show} onClick={show}><Search size={16} aria-hidden="true" /></button>
    {open && <>
      {createPortal(<div className="home-grade-backdrop" aria-hidden="true" />, document.body)}
      <div className="home-grade-popover-wrap" style={{ right: -placement.shift }}><div id={id} className="home-grade-popover" role="dialog" aria-label="Thông tin hạng chất lượng">
        <div className="home-grade-popover-header"><div><p>THÔNG TIN KIỂM ĐỊNH</p><h3>Hạng chất lượng</h3></div><button type="button" onClick={() => setOpen(false)} aria-label="Đóng thông tin hạng"><X size={16} /></button></div>
        <p className="home-grade-popover-description">Hạng được xác định theo tiêu chuẩn kiểm định của từng lô, từ A cao nhất đến E thấp nhất.</p>
        <div className="home-grade-popover-scale" aria-label="Thứ tự hạng chất lượng từ A đến E">{['A', 'B', 'C', 'D', 'E'].map((item) => <span key={item} className={item === grade ? 'is-current' : undefined}>{item}</span>)}</div>
        <p className="home-grade-popover-note">{grade ? `Lô này được xếp hạng ${grade}. ` : ''}Chỉ các lô đạt kiểm định và đủ điều kiện mới được công bố bán.</p>
      </div></div>
    </>}
  </div>
}
