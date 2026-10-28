import { useEffect, useState } from 'react'
import { getBatchEnvironmentLogs } from '@/services/storageEnvironmentService'
import { getAuthErrorMessage } from '@/services/authService'
import { formatVietnamDateTime } from '@/utils/vietnamTime'
import type { InStorageBatchEnvDto, StorageEnvironmentLogItem } from '@/types/storageEnvironment'

interface Props {
  batch: InStorageBatchEnvDto | null
  isOpen: boolean
  onClose: () => void
}

export default function BatchEnvironmentHistoryModal({
  batch,
  isOpen,
  onClose,
}: Props) {
  const [logs, setLogs] = useState<StorageEnvironmentLogItem[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (isOpen && batch) {
      void fetchLogs(batch.productBatchId)
    }
  }, [isOpen, batch])

  async function fetchLogs(batchId: number) {
    setLoading(true)
    setError('')
    try {
      const data = await getBatchEnvironmentLogs(batchId)
      setLogs(data)
    } catch (err) {
      setError(getAuthErrorMessage(err, 'Không thể tải lịch sử nhiệt ẩm của lô hàng.'))
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen || !batch) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-3xl rounded-2xl bg-white shadow-2xl border border-slate-100 flex flex-col max-h-[85vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4 bg-slate-50/70">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xl">📋</span>
              <h3 className="text-base font-bold text-slate-800">
                Lịch Sử Biến Thiên Chuỗi Lạnh
              </h3>
            </div>
            <p className="mt-0.5 text-xs text-slate-500">
              Lô: <strong className="font-semibold text-emerald-700">{batch.batchCode}</strong> — {batch.productName}
              {batch.locationCode && ` (Vị trí: ${batch.locationCode})`}
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-200 hover:text-slate-700 transition"
          >
            ✕
          </button>
        </div>

        {/* Content body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-600">
              Nhật Ký Chi Tiết Toàn Bộ Lần Đo ({logs.length})
            </h4>
            <div className="text-[11px] text-slate-500">
              Ngưỡng chuẩn: <strong className="text-emerald-700">{batch.expectedMinTempC ?? '—'}°C – {batch.expectedMaxTempC ?? '—'}°C</strong>
              {batch.expectedMinHumidityPct !== null && ` | ${batch.expectedMinHumidityPct}% – ${batch.expectedMaxHumidityPct}%`}
            </div>
          </div>

          {loading ? (
            <div className="py-16 text-center text-sm text-slate-400">
              Đang tải dữ liệu nhật ký...
            </div>
          ) : error ? (
            <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-xs text-rose-700">
              {error}
            </div>
          ) : logs.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-200 py-12 text-center text-slate-400 text-sm">
              Lô hàng chưa có bản ghi nhật ký nhiệt ẩm nào trong kho.
            </div>
          ) : (
            <div className="rounded-xl border border-slate-200 overflow-hidden shadow-sm">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase font-bold text-[10px]">
                  <tr>
                    <th className="px-4 py-3">Thời điểm đo (Giờ VN)</th>
                    <th className="px-3 py-3">Nhiệt độ</th>
                    <th className="px-3 py-3">Độ ẩm</th>
                    <th className="px-3 py-3">Nguồn dữ liệu</th>
                    <th className="px-3 py-3">Thiết bị</th>
                    <th className="px-3 py-3">Ghi chú</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {logs.map((log) => (
                    <tr
                      key={log.id}
                      className={log.isTempOutOfRange ? 'bg-amber-50/60' : 'hover:bg-slate-50/50'}
                    >
                      <td className="px-4 py-3 font-medium text-slate-700">
                        {formatVietnamDateTime(log.recordedAt)}
                      </td>
                      <td className="px-3 py-3">
                        <span
                          className={`font-bold inline-flex items-center gap-1 ${log.isTempOutOfRange ? 'text-amber-700' : 'text-slate-800'
                            }`}
                        >
                          {log.temperatureC}°C
                          {log.isTempOutOfRange && (
                            <span className="text-[10px] bg-amber-200/70 text-amber-900 px-1 rounded font-semibold">
                              ⚠ Lệch
                            </span>
                          )}
                        </span>
                      </td>
                      <td className="px-3 py-3 text-slate-600 font-medium">
                        {log.humidityPct !== null ? `${log.humidityPct}%` : '—'}
                      </td>
                      <td className="px-3 py-3">
                        <span className="rounded bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-700">
                          {log.sourceType === 'MANUAL'
                            ? 'Nhập tay'
                            : log.sourceType === 'IOT_SENSOR'
                              ? 'Cảm biến'
                              : log.sourceType === 'IMPORT'
                                ? 'Import dữ liệu'
                                : log.sourceType}
                        </span>
                      </td>
                      <td className="px-3 py-3 text-slate-500">
                        {log.sensorIdentifier ?? '—'}
                      </td>
                      <td className="px-3 py-3 text-slate-500 max-w-[220px] truncate">
                        {log.note ?? '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-slate-100 px-6 py-3 bg-slate-50 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="h-9 px-4 rounded-lg border border-slate-200 text-sm font-semibold text-slate-600 hover:bg-slate-100 transition"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  )
}
