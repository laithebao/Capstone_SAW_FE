type BrandMarkProps = {
  compact?: boolean
  inverted?: boolean
}

export default function BrandMark({ compact = false, inverted = false }: BrandMarkProps) {
  return (
    <div className="flex items-center gap-3" aria-label="Smart Agri-Warehouse">
      <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-emerald-600 shadow-lg shadow-emerald-950/20" aria-hidden="true">
        <svg viewBox="0 0 24 24" className="size-6 fill-none stroke-white" strokeWidth="1.8">
          <path d="M4 10.5 12 5l8 5.5V20H4v-9.5Z" />
          <path d="M8 20v-6h8v6M12 13c0-3 1.8-5.1 5-6-1 3.5-2.8 5-5 5.8M12 13c0-2.3-1.5-3.8-4-4.5.5 2.7 1.8 4 4 4.5Z" />
        </svg>
      </span>
      {!compact && (
        <span className={inverted ? 'text-white' : 'text-slate-950'}>
          <span className="block text-sm font-bold tracking-tight">SMART AGRI-WAREHOUSE</span>
          <span className={`block text-[10px] font-medium tracking-[0.18em] ${inverted ? 'text-white/55' : 'text-slate-400'}`}>
            WAREHOUSE INTELLIGENCE
          </span>
        </span>
      )}
    </div>
  )
}
