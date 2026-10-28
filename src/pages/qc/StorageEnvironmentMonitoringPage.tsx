import { useEffect, useState, useMemo } from 'react'
import { getInStorageBatches } from '@/services/storageEnvironmentService'
import { getAuthErrorMessage } from '@/services/authService'
import StorageEnvironmentLogModal from '@/features/qc/components/StorageEnvironmentLogModal'
import BatchEnvironmentHistoryModal from '@/features/qc/components/BatchEnvironmentHistoryModal'
import ProductBatchStatusBadge from '@/features/operation/components/ProductBatchStatusBadge'
import type { InStorageBatchEnvDto } from '@/types/storageEnvironment'

export default function StorageEnvironmentMonitoringPage() {
  const [batches, setBatches] = useState<InStorageBatchEnvDto[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'OUT_OF_RANGE' | 'OVERDUE'>('ALL')

  // Selected batch for modals
  const [selectedBatchForLog, setSelectedBatchForLog] = useState<InStorageBatchEnvDto | null>(null)
  const [selectedBatchForHistory, setSelectedBatchForHistory] = useState<InStorageBatchEnvDto | null>(null)

  useEffect(() => {
    void fetchBatches()
  }, [])

  async function fetchBatches() {
    setLoading(true)
    setError('')
    try {
      const res = await getInStorageBatches({ pageSize: 100 })
      setBatches(res.items)
    } catch (err) {
      setError(getAuthErrorMessage(err, 'Không thể tải danh sách lô hàng đang lưu kho.'))
    } finally {
      setLoading(false)
    }
  }

  // Thống kê nhanh
  const stats = useMemo(() => {
    const total = batches.length
    const outOfRange = batches.filter((b) => b.isLastOutOfRange === true).length
    const overdue = batches.filter(
      (b) => b.hoursSinceLastLog === null || b.hoursSinceLastLog >= 24
    ).length
    const normal = total - outOfRange

    return { total, normal, outOfRange, overdue }
  }, [batches])

  // Lọc dữ liệu client-side để search mượt mà
  const filteredBatches = useMemo(() => {
    return batches.filter((b) => {
      const matchSearch =
        search === '' ||
        b.batchCode.toLowerCase().includes(search.toLowerCase()) ||
        b.productName.toLowerCase().includes(search.toLowerCase()) ||
        (b.locationCode && b.locationCode.toLowerCase().includes(search.toLowerCase()))

      if (!matchSearch) return false

      if (statusFilter === 'OUT_OF_RANGE') return b.isLastOutOfRange === true
      if (statusFilter === 'OVERDUE')
        return b.hoursSinceLastLog === null || b.hoursSinceLastLog >= 24

      return true
    })
  }, [batches, search, statusFilter])

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <span className="text-2xl">🌡️</span>
            <h1 className="text-xl font-bold tracking-tight text-slate-900">
              Giám Sát & Nhập Liệu Nhiệt Ẩm Lưu Kho
            </h1>
          </div>
          <p className="mt-1 text-xs text-slate-500">
            Theo dõi điều kiện bảo quản chuỗi lạnh định kỳ cho các lô hàng đang lưu kho do nhân viên QC đảm nhiệm.
          </p>
        </div>

        <button
          type="button"
          onClick={() => void fetchBatches()}
          disabled={loading}
          className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-700 shadow-sm hover:bg-slate-50 transition"
        >
          <span className={loading ? 'animate-spin' : ''}>🔄</span> Làm mới danh sách
        </button>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Lô đang lưu kho</span>
            <span className="text-lg">📦</span>
          </div>
          <p className="mt-2 text-2xl font-black text-slate-900">{stats.total}</p>
          <p className="text-[11px] text-slate-400 mt-0.5">Toàn bộ kho vận</p>
        </div>

        <div className="rounded-2xl border border-emerald-100 bg-emerald-50/60 p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-emerald-800 uppercase tracking-wider">Nhiệt ẩm chuẩn</span>
            <span className="text-lg">🟢</span>
          </div>
          <p className="mt-2 text-2xl font-black text-emerald-800">{stats.normal}</p>
          <p className="text-[11px] text-emerald-600 mt-0.5">Trong dải an toàn</p>
        </div>

        <div className="rounded-2xl border border-rose-100 bg-rose-50/60 p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-rose-800 uppercase tracking-wider">Lệch nhiệt độ</span>
            <span className="text-lg">⚠️</span>
          </div>
          <p className="mt-2 text-2xl font-black text-rose-700">{stats.outOfRange}</p>
          <p className="text-[11px] text-rose-600 mt-0.5">Cần kiểm tra quạt/kho</p>
        </div>

        <div className="rounded-2xl border border-amber-100 bg-amber-50/60 p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-amber-800 uppercase tracking-wider">Cần đo định kỳ</span>
            <span className="text-lg">⏰</span>
          </div>
          <p className="mt-2 text-2xl font-black text-amber-800">{stats.overdue}</p>
          <p className="text-[11px] text-amber-700 mt-0.5">&gt; 24h chưa có số đo</p>
        </div>
      </div>

      {/* Filter bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
        <div className="relative w-full sm:w-80">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Tìm theo mã lô, tên nông sản, vị trí..."
            className="h-9 w-full rounded-xl border border-slate-200 bg-slate-50/50 pl-9 pr-3 text-xs outline-none focus:border-emerald-600 focus:bg-white focus:ring-2 focus:ring-emerald-100 transition"
          />
          <span className="absolute left-3 top-2.5 text-xs text-slate-400">🔍</span>
        </div>

        {/* Status tabs */}
        <div className="flex items-center gap-1.5 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
          <button
            type="button"
            onClick={() => setStatusFilter('ALL')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap ${
              statusFilter === 'ALL'
                ? 'bg-slate-900 text-white'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            Tất cả ({batches.length})
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter('OUT_OF_RANGE')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap ${
              statusFilter === 'OUT_OF_RANGE'
                ? 'bg-rose-600 text-white'
                : 'text-rose-700 hover:bg-rose-50'
            }`}
          >
            ⚠️ Đang lệch ngưỡng ({stats.outOfRange})
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter('OVERDUE')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap ${
              statusFilter === 'OVERDUE'
                ? 'bg-amber-600 text-white'
                : 'text-amber-700 hover:bg-amber-50'
            }`}
          >
            ⏰ Cần đo (&gt; 24h) ({stats.overdue})
          </button>
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-xs font-medium text-rose-700">
          {error}
        </div>
      )}

      {/* Main Table */}
      <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase font-bold text-[10px]">
              <tr>
                <th className="px-5 py-3.5">Lô hàng / Nông sản</th>
                <th className="px-4 py-3.5">Vị trí lưu kho</th>
                <th className="px-4 py-3.5">Ngưỡng chuẩn</th>
                <th className="px-4 py-3.5">Số đo gần nhất</th>
                <th className="px-4 py-3.5">Trạng thái chuỗi lạnh</th>
                <th className="px-5 py-3.5 text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    Đang tải dữ liệu lô hàng lưu kho...
                  </td>
                </tr>
              ) : filteredBatches.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    Không tìm thấy lô hàng nào phù hợp với bộ lọc.
                  </td>
                </tr>
              ) : (
                filteredBatches.map((b) => {
                  const isOutOfRange = b.isLastOutOfRange === true
                  const isOverdue = b.hoursSinceLastLog === null || b.hoursSinceLastLog >= 24

                  return (
                    <tr key={b.productBatchId} className="hover:bg-slate-50/70 transition">
                      {/* Mã lô */}
                      <td className="px-5 py-4">
                        <div className="font-bold text-slate-900">{b.batchCode}</div>
                        <div className="text-[11px] text-slate-500 font-medium">{b.productName}</div>
                        <div className="mt-1 flex items-center gap-1.5 text-[11px] text-slate-500">
                          <span>{b.weightInKg.toLocaleString('vi-VN')} kg</span>
                          <span>•</span>
                          <ProductBatchStatusBadge status={b.batchStatus} compact />
                        </div>
                      </td>

                      {/* Vị trí kho */}
                      <td className="px-4 py-4">
                        {b.locationCode ? (
                          <div>
                            <span className="font-bold text-slate-800">{b.locationCode}</span>
                            <span className="block text-[11px] text-slate-500">
                              {b.zoneName ?? 'Khu lưu trữ'}
                            </span>
                          </div>
                        ) : (
                          <span className="italic text-slate-400">Chưa gán vị trí</span>
                        )}
                      </td>

                      {/* Ngưỡng chuẩn */}
                      <td className="px-4 py-4">
                        <div className="text-emerald-700 font-bold">
                          🌡️ {b.expectedMinTempC ?? '—'}°C – {b.expectedMaxTempC ?? '—'}°C
                        </div>
                        <div className="text-sky-700 font-medium text-[11px] mt-0.5">
                          💧 {b.expectedMinHumidityPct ?? '—'}% – {b.expectedMaxHumidityPct ?? '—'}%
                        </div>
                      </td>

                      {/* Số đo gần nhất */}
                      <td className="px-4 py-4">
                        {b.lastRecordedAt ? (
                          <div>
                            <div className="flex items-center gap-1.5 font-bold text-slate-800">
                              <span className={isOutOfRange ? 'text-rose-600' : 'text-slate-800'}>
                                {b.lastTemperatureC}°C
                              </span>
                              {b.lastHumidityPct !== null && (
                                <span className="text-slate-500 font-medium text-[11px]">
                                  ({b.lastHumidityPct}%)
                                </span>
                              )}
                            </div>
                            <div className="text-[10px] text-slate-400 mt-0.5">
                              {new Date(b.lastRecordedAt).toLocaleString('vi-VN', {
                                month: 'numeric',
                                day: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                              {b.hoursSinceLastLog !== null && (
                                <span className="ml-1 text-slate-500">
                                  ({b.hoursSinceLastLog < 1 ? 'Vừa xong' : `${b.hoursSinceLastLog}h trước`})
                                </span>
                              )}
                            </div>
                          </div>
                        ) : (
                          <span className="text-amber-600 font-medium italic text-[11px]">
                            Chưa có bản ghi nào
                          </span>
                        )}
                      </td>

                      {/* Trạng thái chuỗi lạnh */}
                      <td className="px-4 py-4">
                        {isOutOfRange ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 px-2.5 py-1 text-[11px] font-bold text-rose-700 border border-rose-200">
                            <span>⚠</span> Lệch nhiệt độ
                          </span>
                        ) : isOverdue ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-1 text-[11px] font-bold text-amber-700 border border-amber-200">
                            <span>⏰</span> Cần đo (&gt; 24h)
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-bold text-emerald-700 border border-emerald-200">
                            <span>✓</span> Ổn định
                          </span>
                        )}
                        <span className="block text-[10px] text-slate-400 mt-1">
                          Đã đo: {b.totalLogsCount} lần
                        </span>
                      </td>

                      {/* Hành động */}
                      <td className="px-5 py-4 text-right">
                        <div className="inline-flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => setSelectedBatchForHistory(b)}
                            className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition"
                            title="Xem lịch sử và biểu đồ biến thiên"
                          >
                            📈 Lịch sử
                          </button>
                          <button
                            type="button"
                            onClick={() => setSelectedBatchForLog(b)}
                            className="rounded-lg bg-emerald-700 px-3 py-1.5 text-xs font-bold text-white hover:bg-emerald-800 transition shadow-sm"
                            title="Nhập nhiệt độ và độ ẩm cho lô hàng"
                          >
                            + Ghi nhận
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Nhập Liệu */}
      <StorageEnvironmentLogModal
        batch={selectedBatchForLog}
        isOpen={selectedBatchForLog !== null}
        onClose={() => setSelectedBatchForLog(null)}
        onSuccess={() => void fetchBatches()}
      />

      {/* Modal Lịch Sử */}
      <BatchEnvironmentHistoryModal
        batch={selectedBatchForHistory}
        isOpen={selectedBatchForHistory !== null}
        onClose={() => setSelectedBatchForHistory(null)}
      />
    </div>
  )
}
