import { useId, useState } from 'react'
import { getAuthErrorMessage } from '@/services/authService'
import type { QcInspectionDetailDto, CreateEnvironmentLogRequest, EnvironmentLogDto } from '@/types/inspection'

interface Props {
  inspection: QcInspectionDetailDto
  onSaved: () => Promise<void>
  createEnvironmentLog: (req: CreateEnvironmentLogRequest) => Promise<EnvironmentLogDto>
}

const SOURCE_OPTS = [
  { value: 'MANUAL',     label: 'Nhập tay' },
  { value: 'IOT_SENSOR', label: 'Cảm biến IoT' },
  { value: 'IMPORT',     label: 'Import dữ liệu' },
] as const

export default function QCEnvironmentTab({ inspection, onSaved, createEnvironmentLog }: Props) {
  const formId = useId()

  const [temperatureC, setTemperatureC] = useState('')
  const [humidityPct,  setHumidityPct]  = useState('')
  const [sourceType,   setSourceType]   = useState<'MANUAL' | 'IOT_SENSOR' | 'IMPORT'>('MANUAL')
  const [sensorId,     setSensorId]     = useState('')
  const [recordedAt,   setRecordedAt]   = useState(() => new Date().toISOString().slice(0, 16))
  const [note,         setNote]         = useState('')
  const [saving,       setSaving]       = useState(false)
  const [error,        setError]        = useState('')
  const [successMsg,   setSuccessMsg]   = useState('')

  const logs = inspection.environmentLogs

  // Temperature out-of-range check
  const { expectedMinTempC, expectedMaxTempC, expectedMinHumidityPct, expectedMaxHumidityPct } = inspection
  const tempNum     = Number(temperatureC)
  const humidityNum = Number(humidityPct)

  const isOutOfRange = temperatureC !== '' && (
    (expectedMinTempC !== null && tempNum < expectedMinTempC) ||
    (expectedMaxTempC !== null && tempNum > expectedMaxTempC)
  )

  const isHumidityOutOfRange = humidityPct !== '' && (
    (expectedMinHumidityPct !== null && humidityNum < expectedMinHumidityPct) ||
    (expectedMaxHumidityPct !== null && humidityNum > expectedMaxHumidityPct)
  )

  async function handleSave() {
    if (!temperatureC) { setError('Nhiệt độ là bắt buộc.'); return }

    setSaving(true); setError(''); setSuccessMsg('')
    try {
      const result = await createEnvironmentLog({
        productBatchId:      inspection.productBatchId,
        warehouseLocationId: undefined,   // không yêu cầu trong phiên kiểm định (lô chưa nhập kho)
        qcInspectionId:      inspection.id,
        temperatureC:        Number(temperatureC),
        humidityPct:         humidityPct ? Number(humidityPct) : undefined,
        sourceType,
        sensorIdentifier:    sensorId.trim() || undefined,
        recordedAt:          new Date(recordedAt).toISOString(),
        note:                note.trim() || undefined,
      })

      if (result.isTempOutOfRange) {
        setSuccessMsg(`⚠ Đã lưu — Nhiệt độ ${result.temperatureC}°C nằm ngoài ngưỡng bảo quản!`)
      } else {
        setSuccessMsg('✓ Đã ghi nhận nhiệt độ bảo quản.')
      }

      // Reset form
      setTemperatureC('')
      setHumidityPct('')
      setSensorId('')
      setNote('')
      await onSaved()
    } catch (e) {
      setError(getAuthErrorMessage(e, 'Không thể ghi nhật ký môi trường.'))
    } finally {
      setSaving(false)
    }
  }

  const inputCls = 'h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm outline-none transition focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100'

  return (
    <div className="space-y-5">
      <h2 className="text-sm font-bold text-slate-800">🌡 Nhật ký nhiệt độ bảo quản</h2>

      {/* Expected temp + humidity range from supplier */}
      {(expectedMinTempC !== null || expectedMaxTempC !== null || expectedMinHumidityPct !== null || expectedMaxHumidityPct !== null) && (
        <div className="rounded-lg border border-sky-100 bg-sky-50 px-4 py-2.5 text-xs text-sky-700 space-y-1">
          {(expectedMinTempC !== null || expectedMaxTempC !== null) && (
            <div>
              📋 Ngưỡng <strong>nhiệt độ</strong> bảo quản (supplier khai báo):{' '}
              <b>{expectedMinTempC !== null ? `${expectedMinTempC}°C` : '—'} – {expectedMaxTempC !== null ? `${expectedMaxTempC}°C` : '—'}</b>
            </div>
          )}
          {(expectedMinHumidityPct !== null || expectedMaxHumidityPct !== null) && (
            <div>
              📋 Ngưỡng <strong>độ ẩm</strong> bảo quản (supplier khai báo):{' '}
              <b>{expectedMinHumidityPct !== null ? `${expectedMinHumidityPct}%` : '—'} – {expectedMaxHumidityPct !== null ? `${expectedMaxHumidityPct}%` : '—'}</b>
            </div>
          )}
        </div>
      )}

      {error      && <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div>}
      {successMsg && (
        <div className={`rounded-xl border px-4 py-3 text-sm font-semibold ${
          successMsg.startsWith('⚠')
            ? 'border-amber-200 bg-amber-50 text-amber-700'
            : 'border-emerald-200 bg-emerald-50 text-emerald-700'
        }`}>
          {successMsg}
        </div>
      )}

      {/* Input form */}
      <div className="rounded-xl border border-slate-200 bg-white p-5 space-y-4">
        <h3 className="text-xs font-bold uppercase tracking-wide text-slate-500">Ghi nhận mới</h3>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <label className="block space-y-1">
            <span className="text-[11px] font-bold uppercase tracking-wide text-slate-500">
              Nhiệt độ (°C) <span className="text-rose-500">*</span>
            </span>
            <input
              id={`${formId}-temp`}
              type="number"
              step="0.1"
              value={temperatureC}
              onChange={e => setTemperatureC(e.target.value)}
              placeholder="VD: 4.5"
              className={`${inputCls} ${isOutOfRange ? 'border-amber-400 ring-2 ring-amber-100' : ''}`}
            />
            {isOutOfRange && (
              <p className="text-[11px] text-amber-600 font-semibold">
                ⚠ Ngoài ngưỡng supplier khai báo ({expectedMinTempC}–{expectedMaxTempC}°C)
              </p>
            )}
          </label>

          <label className="block space-y-1">
            <span className="text-[11px] font-bold uppercase tracking-wide text-slate-500">Độ ẩm (%)</span>
            <input
              id={`${formId}-humidity`}
              type="number"
              step="0.1"
              min="0"
              max="100"
              value={humidityPct}
              onChange={e => setHumidityPct(e.target.value)}
              placeholder="VD: 85"
              className={`${inputCls} ${isHumidityOutOfRange ? 'border-amber-400 ring-2 ring-amber-100' : ''}`}
            />
            {isHumidityOutOfRange && (
              <p className="text-[11px] text-amber-600 font-semibold">
                ⚠ Ngoài ngưỡng supplier khai báo ({expectedMinHumidityPct}–{expectedMaxHumidityPct}%)
              </p>
            )}
          </label>


          <label className="block space-y-1">
            <span className="text-[11px] font-bold uppercase tracking-wide text-slate-500">Nguồn dữ liệu</span>
            <select
              id={`${formId}-source`}
              value={sourceType}
              onChange={e => setSourceType(e.target.value as typeof sourceType)}
              className={inputCls}
            >
              {SOURCE_OPTS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </label>

          {sourceType === 'IOT_SENSOR' && (
            <label className="block space-y-1">
              <span className="text-[11px] font-bold uppercase tracking-wide text-slate-500">Mã cảm biến</span>
              <input
                type="text"
                value={sensorId}
                onChange={e => setSensorId(e.target.value)}
                placeholder="VD: SENSOR-001"
                className={inputCls}
              />
            </label>
          )}

          <label className="block space-y-1">
            <span className="text-[11px] font-bold uppercase tracking-wide text-slate-500">
              Thời điểm đo <span className="text-rose-500">*</span>
            </span>
            <input
              id={`${formId}-recordedAt`}
              type="datetime-local"
              value={recordedAt}
              onChange={e => setRecordedAt(e.target.value)}
              className={inputCls}
            />
          </label>
        </div>

        <label className="block space-y-1">
          <span className="text-[11px] font-bold uppercase tracking-wide text-slate-500">Ghi chú</span>
          <input
            type="text"
            value={note}
            onChange={e => setNote(e.target.value)}
            placeholder="Ghi chú bổ sung..."
            className={inputCls}
          />
        </label>

        <div className="flex justify-end">
          <button
            id="btn-save-env-log"
            disabled={saving}
            onClick={() => void handleSave()}
            className="h-9 rounded-lg bg-emerald-700 px-5 text-sm font-bold text-white hover:bg-emerald-800 disabled:opacity-60"
          >
            {saving ? 'Đang ghi nhận...' : 'Ghi nhận nhiệt độ'}
          </button>
        </div>

        <p className="text-[10px] text-slate-400">
          ⚠ Nhật ký môi trường là bất biến — không thể xóa hoặc sửa sau khi ghi.
        </p>
      </div>

      {/* Log history */}
      {logs.length > 0 && (
        <div className="rounded-xl border border-slate-200 overflow-hidden">
          <div className="border-b border-slate-100 bg-slate-50/60 px-5 py-3">
            <h3 className="text-xs font-bold uppercase tracking-wide text-slate-500">
              Lịch sử ghi nhận ({logs.length})
            </h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[600px]">
              <thead>
                <tr className="text-[10px] font-bold uppercase tracking-wide text-slate-400">
                  <th className="px-4 py-2.5 text-left">Thời điểm</th>
                  <th className="px-3 py-2.5 text-left">Nhiệt độ</th>
                  <th className="px-3 py-2.5 text-left">Độ ẩm</th>
                  <th className="px-3 py-2.5 text-left">Nguồn</th>
                  <th className="px-3 py-2.5 text-left">Ghi chú</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {logs.map(log => (
                  <tr key={log.id} className={log.isTempOutOfRange ? 'bg-amber-50' : ''}>
                    <td className="px-4 py-3 text-xs text-slate-600">
                      {new Date(log.recordedAt).toLocaleString('vi-VN')}
                    </td>
                    <td className="px-3 py-3">
                      <span className={`text-sm font-semibold ${log.isTempOutOfRange ? 'text-amber-700' : 'text-slate-700'}`}>
                        {log.temperatureC}°C
                        {log.isTempOutOfRange && <span className="ml-1 text-[10px]">⚠</span>}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-sm text-slate-600">
                      {log.humidityPct !== null ? `${log.humidityPct}%` : '—'}
                    </td>
                    <td className="px-3 py-3">
                      <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-bold text-slate-600">
                        {log.sourceType}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-xs text-slate-500">{log.note ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
