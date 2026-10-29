import { useState, useId, useEffect } from 'react'
import { createStorageEnvironmentLog } from '@/services/storageEnvironmentService'
import { getAuthErrorMessage } from '@/services/authService'
import {
  getVietnamDateTimeLocal,
  toVietnamIsoString,
  isFutureVietnamTime,
  formatVietnamDateTime,
} from '@/utils/vietnamTime'
import type { InStorageBatchEnvDto } from '@/types/storageEnvironment'

interface Props {
  batch: InStorageBatchEnvDto | null
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
}

const SOURCE_OPTIONS = [
  { value: 'MANUAL', label: 'Nhập tay' },
  { value: 'IOT_SENSOR', label: 'Cảm biến' },
  { value: 'IMPORT', label: 'Import dữ liệu' },
] as const

export default function StorageEnvironmentLogModal({
  batch,
  isOpen,
  onClose,
  onSuccess,
}: Props) {
  const formId = useId()

  const [temperatureC, setTemperatureC] = useState('')
  const [humidityPct, setHumidityPct] = useState('')
  const [sourceType, setSourceType] = useState<'MANUAL' | 'IOT_SENSOR' | 'IMPORT'>('MANUAL')
  const [sensorId, setSensorId] = useState('')
  const [recordedAt, setRecordedAt] = useState(() => getVietnamDateTimeLocal())
  const [note, setNote] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [successMsg, setSuccessMsg] = useState('')

  useEffect(() => {
    if (isOpen) {
      setTemperatureC('')
      setHumidityPct('')
      setSourceType('MANUAL')
      setSensorId('')
      setRecordedAt(getVietnamDateTimeLocal())
      setNote('')
      setError('')
      setSuccessMsg('')
    }
  }, [isOpen, batch])

  if (!isOpen || !batch) return null

  const {
    expectedMinTempC,
    expectedMaxTempC,
    expectedMinHumidityPct,
    expectedMaxHumidityPct,
  } = batch

  const tempNum = Number(temperatureC)
  const humidityNum = Number(humidityPct)

  const isTempOutOfRange =
    temperatureC !== '' &&
    !isNaN(tempNum) &&
    ((expectedMinTempC !== null && tempNum < expectedMinTempC) ||
      (expectedMaxTempC !== null && tempNum > expectedMaxTempC))

  const isHumidityOutOfRange =
    humidityPct !== '' &&
    !isNaN(humidityNum) &&
    ((expectedMinHumidityPct !== null && humidityNum < expectedMinHumidityPct) ||
      (expectedMaxHumidityPct !== null && humidityNum > expectedMaxHumidityPct))

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!temperatureC || isNaN(tempNum)) {
      setError('Vui lòng nhập nhiệt độ hợp lệ.')
      return
    }

    if (isFutureVietnamTime(recordedAt)) {
      setError(`Thời điểm đo không được là thời gian trong tương lai (Hiện tại ở Việt Nam: ${formatVietnamDateTime(new Date())}).`)
      return
    }

    setSaving(true)
    setError('')
    setSuccessMsg('')

    try {
      const result = await createStorageEnvironmentLog({
        productBatchId: batch!.productBatchId,
        warehouseLocationId: batch!.warehouseLocationId ?? undefined,
        temperatureC: tempNum,
        humidityPct: humidityPct !== '' && !isNaN(humidityNum) ? humidityNum : undefined,
        sourceType,
        sensorIdentifier: sensorId.trim() || undefined,
        recordedAt: toVietnamIsoString(recordedAt),
        note: note.trim() || undefined,
      })

      if (result.isTempOutOfRange) {
        setSuccessMsg(`⚠ Đã lưu — Nhiệt độ ${result.temperatureC}°C lệch ngưỡng bảo quản!`)
      } else {
        setSuccessMsg('✓ Ghi nhận nhiệt độ & độ ẩm bảo quản thành công.')
      }

      setTimeout(() => {
        onSuccess()
        onClose()
      }, 1000)
    } catch (err) {
      setError(getAuthErrorMessage(err, 'Không thể ghi nhận nhật ký môi trường lưu kho.'))
    } finally {
      setSaving(false)
    }
  }

  const inputCls =
    'h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm outline-none transition focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-lg rounded-2xl bg-white shadow-2xl border border-slate-100 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4 bg-slate-50/70">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-lg">🌡️</span>
              <h3 className="text-base font-bold text-slate-800">
                Ghi Nhận Nhiệt Ẩm Lưu Kho
              </h3>
            </div>
            <p className="mt-0.5 text-xs text-slate-500">
              Lô: <strong className="font-semibold text-emerald-700">{batch.batchCode}</strong> — {batch.productName}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1 text-slate-400 hover:bg-slate-200 hover:text-slate-700 transition"
          >
            ✕
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Vị trí lưu kho & Ngưỡng bảo quản chuẩn */}
          <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-3.5 space-y-2 text-xs">
            <div className="flex justify-between items-center text-slate-600">
              <span>📍 Vị trí kho hiện tại:</span>
              <span className="font-bold text-slate-800">
                {batch.locationCode ? `${batch.locationCode} (${batch.zoneName ?? 'Khu lưu trữ'})` : 'Chưa xếp vị trí cụ thể'}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-2 pt-1.5 border-t border-slate-200/60">
              <div>
                <span className="text-slate-500 block">Dải nhiệt độ chuẩn:</span>
                <span className="font-bold text-emerald-800">
                  {expectedMinTempC !== null || expectedMaxTempC !== null
                    ? `${expectedMinTempC ?? '—'}°C đến ${expectedMaxTempC ?? '—'}°C`
                    : 'Chưa cấu hình'}
                </span>
              </div>
              <div>
                <span className="text-slate-500 block">Dải độ ẩm chuẩn:</span>
                <span className="font-bold text-sky-800">
                  {expectedMinHumidityPct !== null || expectedMaxHumidityPct !== null
                    ? `${expectedMinHumidityPct ?? '—'}% đến ${expectedMaxHumidityPct ?? '—'}%`
                    : 'Chưa cấu hình'}
                </span>
              </div>
            </div>
          </div>

          {error && (
            <div className="rounded-lg border border-rose-200 bg-rose-50 px-3.5 py-2.5 text-xs text-rose-700 font-medium">
              {error}
            </div>
          )}

          {successMsg && (
            <div
              className={`rounded-lg border px-3.5 py-2.5 text-xs font-semibold ${
                successMsg.startsWith('⚠')
                  ? 'border-amber-300 bg-amber-50 text-amber-800'
                  : 'border-emerald-300 bg-emerald-50 text-emerald-800'
              }`}
            >
              {successMsg}
            </div>
          )}

          {/* Form inputs */}
          <div className="grid grid-cols-2 gap-3.5">
            {/* Nhiệt độ */}
            <div className="space-y-1">
              <label
                htmlFor={`${formId}-temp`}
                className="text-[11px] font-bold uppercase tracking-wider text-slate-600 block"
              >
                Nhiệt độ (°C) <span className="text-rose-500">*</span>
              </label>
              <input
                id={`${formId}-temp`}
                type="number"
                step="0.1"
                required
                value={temperatureC}
                onChange={(e) => setTemperatureC(e.target.value)}
                placeholder="VD: 4.5"
                className={`${inputCls} ${
                  isTempOutOfRange ? 'border-amber-400 ring-2 ring-amber-100 bg-amber-50/30' : ''
                }`}
              />
              {isTempOutOfRange && (
                <p className="text-[10px] text-amber-600 font-bold leading-tight">
                  ⚠ Lệch dải chuẩn ({expectedMinTempC}–{expectedMaxTempC}°C)
                </p>
              )}
            </div>

            {/* Độ ẩm */}
            <div className="space-y-1">
              <label
                htmlFor={`${formId}-humidity`}
                className="text-[11px] font-bold uppercase tracking-wider text-slate-600 block"
              >
                Độ ẩm (%)
              </label>
              <input
                id={`${formId}-humidity`}
                type="number"
                step="0.1"
                min="0"
                max="100"
                value={humidityPct}
                onChange={(e) => setHumidityPct(e.target.value)}
                placeholder="VD: 85"
                className={`${inputCls} ${
                  isHumidityOutOfRange ? 'border-amber-400 ring-2 ring-amber-100 bg-amber-50/30' : ''
                }`}
              />
              {isHumidityOutOfRange && (
                <p className="text-[10px] text-amber-600 font-bold leading-tight">
                  ⚠ Lệch dải chuẩn ({expectedMinHumidityPct}–{expectedMaxHumidityPct}%)
                </p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3.5">
            {/* Nguồn dữ liệu */}
            <div className="space-y-1">
              <label
                htmlFor={`${formId}-source`}
                className="text-[11px] font-bold uppercase tracking-wider text-slate-600 block"
              >
                Phương thức đo
              </label>
              <select
                id={`${formId}-source`}
                value={sourceType}
                onChange={(e) => setSourceType(e.target.value as typeof sourceType)}
                className={inputCls}
              >
                {SOURCE_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Thời điểm đo */}
            <div className="space-y-1">
              <label
                htmlFor={`${formId}-recordedAt`}
                className="text-[11px] font-bold uppercase tracking-wider text-slate-600 block"
              >
                Thời điểm kiểm tra (Giờ VN) <span className="text-rose-500">*</span>
              </label>
              <input
                id={`${formId}-recordedAt`}
                type="datetime-local"
                required
                max={getVietnamDateTimeLocal()}
                value={recordedAt}
                onChange={(e) => setRecordedAt(e.target.value)}
                className={inputCls}
              />
            </div>
          </div>

          {sourceType === 'IOT_SENSOR' && (
            <div className="space-y-1">
              <label className="text-[11px] font-bold uppercase tracking-wider text-slate-600 block">
                Mã cảm biến
              </label>
              <input
                type="text"
                value={sensorId}
                onChange={(e) => setSensorId(e.target.value)}
                placeholder="VD: SENSOR-01"
                className={inputCls}
              />
            </div>
          )}

          {/* Ghi chú */}
          <div className="space-y-1">
            <label
              htmlFor={`${formId}-note`}
              className="text-[11px] font-bold uppercase tracking-wider text-slate-600 block"
            >
              Ghi chú cảm quan / hiện trạng bảo quản
            </label>
            <input
              id={`${formId}-note`}
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="VD: Bao bì khô ráo, không phát hiện hấp hơi sương..."
              className={inputCls}
            />
          </div>

          <div className="pt-2 text-[10px] text-slate-400">
            * Dữ liệu nhiệt ẩm sau khi lưu sẽ là cơ sở bất biến để tính toán rủi ro hao hụt (AI Spoilage Forecast).
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-100">
            <button
              type="button"
              disabled={saving}
              onClick={onClose}
              className="h-9 px-4 rounded-lg border border-slate-200 text-sm font-semibold text-slate-600 hover:bg-slate-100 transition"
            >
              Đóng
            </button>
            <button
              type="submit"
              disabled={saving}
              className="h-9 px-5 rounded-lg bg-emerald-700 text-sm font-bold text-white hover:bg-emerald-800 disabled:opacity-60 transition shadow-sm shadow-emerald-700/20"
            >
              {saving ? 'Đang lưu...' : 'Lưu Ghi Nhận'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
