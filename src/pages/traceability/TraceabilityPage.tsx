import axios from 'axios'
import { useEffect, useState, type ReactNode } from 'react'
import { useParams } from 'react-router'
import { CircleAlert, LoaderCircle, RefreshCw, Wheat } from 'lucide-react'
import { getPublicTraceability, isValidPublicToken } from '@/services/traceabilityService'
import type { PublicTraceability, PublicTraceabilityCriterion, PublicTraceabilityGradeRule } from '@/types/traceability'

type Result =
  | { status: 'loading' }
  | { status: 'success'; data: PublicTraceability }
  | { status: 'notFound' | 'unavailable' | 'error' }

const number = (value: number) => new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 3 }).format(value)
const dateOnly = (value: string) => new Intl.DateTimeFormat('vi-VN', { dateStyle: 'medium' }).format(new Date(`${value}T00:00:00`))
const dateTime = (value: string) => new Intl.DateTimeFormat('vi-VN', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Asia/Ho_Chi_Minh' }).format(new Date(value))

export default function TraceabilityPage() {
  const { qrCode = '' } = useParams<'qrCode'>()
  return <TraceabilityResult key={qrCode} publicToken={qrCode} />
}

function TraceabilityResult({ publicToken }: { publicToken: string }) {
  const validToken = isValidPublicToken(publicToken)
  const [result, setResult] = useState<Result>({ status: validToken ? 'loading' : 'notFound' })
  const [reloadKey, setReloadKey] = useState(0)

  useEffect(() => {
    if (!validToken) return
    const controller = new AbortController()
    const timer = window.setTimeout(async () => {
      setResult({ status: 'loading' })
      try {
        const data = await getPublicTraceability(publicToken, controller.signal)
        if (!controller.signal.aborted) setResult({ status: 'success', data })
      } catch (err) {
        if (!controller.signal.aborted) {
          const status = axios.isAxiosError(err) ? err.response?.status : undefined
          setResult({ status: status === 404 ? 'notFound' : status === 410 ? 'unavailable' : 'error' })
        }
      }
    }, 0)
    return () => { window.clearTimeout(timer); controller.abort() }
  }, [publicToken, validToken, reloadKey])

  useEffect(() => {
    const refresh = () => { if (document.visibilityState === 'visible') setReloadKey(key => key + 1) }
    window.addEventListener('focus', refresh)
    document.addEventListener('visibilitychange', refresh)
    return () => { window.removeEventListener('focus', refresh); document.removeEventListener('visibilitychange', refresh) }
  }, [])

  const data = result.status === 'success' ? result.data : null
  const quality = data?.quality
  const groups = [...new Set(quality?.criteria.map(c => c.groupLabel) ?? [])]
  const locality = data ? [...new Set([data.origin.province, data.origin.region].filter(value => value && value !== data.origin.areaName))].join(' · ') : ''
  return <div className="mx-auto w-full min-w-0 max-w-3xl space-y-4 pb-6 text-slate-800">
    <header className="flex items-center gap-2 border-b border-emerald-100 pb-3">
      <Wheat className="size-6 shrink-0 text-emerald-700" aria-hidden="true" />
      <div><p className="text-xs font-bold uppercase tracking-wider text-emerald-700">Smart Agri-Warehouse</p><h1 className="text-sm font-medium text-slate-600">Truy xuất nguồn gốc</h1></div>
    </header>
    {result.status === 'loading' && <div role="status" className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white p-4 text-sm"><LoaderCircle className="size-5 shrink-0 animate-spin text-emerald-700" aria-hidden="true" />Đang tải thông tin truy xuất...</div>}
    {(result.status === 'notFound' || result.status === 'unavailable' || result.status === 'error') && <section role="alert" className="rounded-xl border border-amber-200 bg-amber-50 p-4">
      <CircleAlert className="mb-2 size-6 text-amber-700" aria-hidden="true" />
      <h2 className="font-bold">{result.status === 'notFound' ? 'Không tìm thấy lô hàng' : result.status === 'unavailable' ? 'Lô hàng không còn khả dụng' : 'Không tải được thông tin'}</h2>
      <p className="mt-2 break-words text-sm">{result.status === 'notFound' ? 'Batch information not found.' : result.status === 'unavailable' ? 'This batch is no longer available.' : 'Không thể kết nối để tải thông tin truy xuất. Vui lòng thử lại.'}</p>
      {result.status === 'error' && <button type="button" onClick={() => setReloadKey(key => key + 1)} className="mt-3 inline-flex items-center gap-2 rounded-lg bg-emerald-700 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-800"><RefreshCw className="size-4" />Thử lại</button>}
    </section>}
    {data && quality && <>
      <section className="rounded-xl border border-emerald-200 bg-white p-4 shadow-sm sm:p-5">
        <p className="break-all font-mono text-xs text-slate-500">Mã lô: {data.batchCode}</p>
        <h2 className="mt-1 break-words text-2xl font-bold text-slate-950">{data.productName}</h2>
        {data.cropTypeName && !data.productName.toLocaleLowerCase('vi').includes(data.cropTypeName.toLocaleLowerCase('vi')) && <p className="mt-1 text-sm text-slate-500">{data.cropTypeName}</p>}
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <span className="rounded-lg bg-emerald-700 px-3 py-1.5 text-base font-bold text-white">Hạng {quality.grade}</span>
          <span className="text-sm font-semibold text-emerald-800">{quality.result === 'PASS' ? 'Đạt kiểm định' : 'Không đạt kiểm định'}</span>
        </div>
        {quality.standard && <p className="mt-2 break-words text-sm">Đạt theo bộ tiêu chuẩn kiểm định <strong>{quality.standard.name}</strong>.</p>}
        <p className="mt-2 text-xs text-slate-500">Hoàn tất kiểm định: {dateTime(quality.completedAt)}</p>
        <p className="mt-3 border-t border-emerald-100 pt-3 text-xs leading-relaxed text-slate-600">Kết quả áp dụng cho lô sản phẩm tại thời điểm kiểm định, không xác nhận từng đơn vị bán lẻ đã được kiểm riêng.</p>
      </section>

      <Section title="Nguồn gốc">
        <dl className="grid min-w-0 gap-3 sm:grid-cols-2">
          <Info label="Nhà cung cấp" value={data.supplierName} />
          {data.origin.areaName && <Info label="Vùng trồng" value={data.origin.areaName} />}
          {locality && <Info label="Địa phương" value={locality} />}
          <Info label="Ngày thu hoạch" value={dateOnly(data.harvestDate)} />
          {data.expiryDate && <Info label="Hạn sử dụng đã ghi nhận của lô" value={dateOnly(data.expiryDate)} />}
        </dl>
      </Section>

      <Section title="Kết quả kiểm định">
        <h3 className="text-xs font-semibold text-slate-500">Tiêu chuẩn áp dụng</h3>
        {quality.standard ? <p className="mt-1 break-words text-sm"><strong>{quality.standard.name}</strong><span className="mt-1 block text-xs text-slate-500">{quality.standard.code} · Phiên bản {quality.standard.version}</span></p> : <p className="mt-1 text-sm text-slate-600">Hồ sơ chưa có thông tin tiêu chuẩn áp dụng.</p>}
        <p className="mt-3 text-xs text-slate-500">Bắt đầu: {dateTime(quality.startedAt)}<br />Hoàn tất: {dateTime(quality.completedAt)}<br />Giờ Việt Nam (UTC+7)</p>
        {quality.sampling && <p className="mt-3 rounded-lg bg-slate-50 p-3 text-sm">Lấy mẫu: <strong>{number(quality.sampling.ratioPercent)}%</strong> · Khối lượng mẫu: <strong>{number(quality.sampling.sampleWeightKg)} kg</strong></p>}
        {quality.criteria.length > 0 ? <details className="mt-4 border-t border-slate-100 pt-3">
          <summary className="cursor-pointer text-sm font-semibold text-emerald-700">Xem kết quả từng tiêu chí ({quality.criteria.length})</summary>
          <div className="mt-4 space-y-4">{groups.map(group => <div key={group}><h3 className="mb-2 text-sm font-bold">{group}</h3><div className="space-y-3">{quality.criteria.filter(c => c.groupLabel === group).map(c => <Criterion key={c.code} criterion={c} />)}</div></div>)}</div>
        </details> : <p className="mt-3 text-sm text-slate-600">Chưa có kết quả từng tiêu chí để công khai.</p>}
      </Section>

      <Section title={`Vì sao được xếp hạng ${quality.grade}?`}>
        <p className="text-sm leading-relaxed text-slate-700">{quality.gradeExplanation}</p>
        {quality.determiningCriteria.length > 0 && <ul className="mt-3 list-disc space-y-1 pl-5 text-sm">{quality.determiningCriteria.map((name, i) => <li className="break-words" key={`${name}-${i}`}>{name} — hạng {quality.grade}</li>)}</ul>}
      </Section>

      <details className="rounded-xl border border-slate-200 bg-white p-4">
        <summary className="cursor-pointer text-sm font-semibold">Các mốc truy xuất</summary>
        <ol className="mt-3 space-y-3 border-l-2 border-emerald-100 pl-3">
          <li><p className="text-sm font-medium">Thu hoạch</p><p className="text-xs text-slate-500">{dateOnly(data.harvestDate)}</p></li>
          {data.milestones.map((m, i) => <li key={`${m.type}-${i}`}><p className="text-sm font-medium">{m.label}</p><p className="text-xs text-slate-500">{dateTime(m.occurredAt)}</p></li>)}
        </ol>
      </details>
    </>}
  </div>
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return <section className="min-w-0 rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5"><h2 className="mb-3 text-base font-bold text-slate-950">{title}</h2>{children}</section>
}
function Info({ label, value }: { label: string; value: string }) {
  return <div className="min-w-0"><dt className="text-xs text-slate-500">{label}</dt><dd className="mt-1 break-words text-sm font-medium">{value}</dd></div>
}
function measuredValue(c: PublicTraceabilityCriterion): string {
  if (!c.hasResult) return 'Chưa có kết quả'
  if (c.dataType === 'NUMBER' && c.numericValue !== null) return `${number(c.numericValue)}${c.unit ? ` ${c.unit}` : ''}`
  if (c.dataType === 'TEXT') return c.textValue || 'Chưa có kết quả'
  if (c.dataType === 'BOOLEAN') return c.booleanValue ? 'Đạt' : 'Không đạt'
  return 'Chưa có kết quả'
}
function ruleValue(r: PublicTraceabilityGradeRule, c: PublicTraceabilityCriterion): string {
  if (c.dataType === 'TEXT') return r.requiredTextValue || 'Chưa ghi nhận yêu cầu'
  const bounds = [r.minValue !== null ? `≥ ${number(r.minValue)}` : '', r.maxValue !== null ? `≤ ${number(r.maxValue)}` : ''].filter(Boolean)
  return `${bounds.join(' và ') || 'Không giới hạn khoảng'}${c.unit ? ` ${c.unit}` : ''}`
}
function Criterion({ criterion: c }: { criterion: PublicTraceabilityCriterion }) {
  const conclusion = !c.hasResult ? 'Chưa có kết quả' : c.isPassed ? 'Đạt' : 'Không đạt'
  const tone = !c.hasResult ? 'bg-slate-100 text-slate-600' : c.isPassed ? 'bg-emerald-50 text-emerald-800' : 'bg-rose-50 text-rose-700'
  return <article className="min-w-0 rounded-lg border border-slate-200 p-3">
    <div className="flex flex-wrap items-start justify-between gap-2"><h4 className="min-w-0 break-words text-sm font-semibold">{c.name}</h4><span className={`rounded-full px-2 py-1 text-xs font-semibold ${tone}`}>{conclusion}{c.evaluatedGrade ? ` · Hạng ${c.evaluatedGrade}` : ''}</span></div>
    <dl className="mt-2"><Info label="Kết quả ghi nhận" value={measuredValue(c)} /></dl>
    {c.evaluatedGrade && c.rules.filter(r => r.grade === c.evaluatedGrade).map((rule, index) => <p key={index} className="mt-2 break-words text-xs"><strong>Quy tắc hạng {rule.grade}: </strong>{ruleValue(rule, c)}</p>)}
    <p className="mt-2 text-xs leading-relaxed text-slate-600"><strong>Căn cứ đánh giá: </strong>{c.assessmentBasis}</p>
    {c.rules.length > 0 && <details className="mt-2 text-xs"><summary className="cursor-pointer font-semibold text-emerald-700">Ngưỡng và yêu cầu của tiêu chuẩn</summary><ul className="mt-2 space-y-2">{c.rules.map((rule, i) => <li className="break-words rounded bg-slate-50 p-2" key={`${rule.grade}-${i}`}><strong>Hạng {rule.grade}: </strong>{ruleValue(rule, c)}<span className="block text-slate-500">{rule.isFailRule ? 'Quy tắc không đạt' : 'Quy tắc đạt'}</span></li>)}</ul></details>}
  </article>
}
