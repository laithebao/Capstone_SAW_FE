import React, { useEffect, useState, useCallback } from 'react';
import {
  generateSpoilageForecast,
  getLatestSpoilageForecast,
  getSpoilageForecastHistory
} from '@/services/spoilageForecastService';
import { RiskGauge } from './RiskGauge';
import { StrategicRecommendationView } from './StrategicRecommendationView';
import {
  RISK_LEVEL_CONFIG,
  type SpoilageForecastResponse
} from '@/types/spoilageForecast';

interface SpoilageForecastPanelProps {
  productBatchId: number;
  batchCode: string;
  productName?: string;
  batchStatus?: string;
}

/**
 * Chuyển đổi thời gian sang đúng giờ Việt Nam (Asia/Ho_Chi_Minh, UTC+7).
 * Tự động bù Z nếu chuỗi ISO từ server chưa có timezone offset để tránh bị lệch giờ.
 */
function formatVietnamDateTime(isoString: string | undefined | null): string {
  if (!isoString) return '';
  let str = String(isoString).trim();
  if (str.includes('T') && !str.endsWith('Z') && !/[+-]\d{2}:?\d{2}$/.test(str)) {
    str += 'Z';
  }
  const date = new Date(str);
  if (isNaN(date.getTime())) return String(isoString);

  return date.toLocaleString('vi-VN', {
    timeZone: 'Asia/Ho_Chi_Minh',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  });
}

function formatVietnamShortTime(isoString: string | undefined | null): string {
  if (!isoString) return '';
  let str = String(isoString).trim();
  if (str.includes('T') && !str.endsWith('Z') && !/[+-]\d{2}:?\d{2}$/.test(str)) {
    str += 'Z';
  }
  const date = new Date(str);
  if (isNaN(date.getTime())) return String(isoString);

  const dateStr = date.toLocaleDateString('vi-VN', {
    timeZone: 'Asia/Ho_Chi_Minh',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });
  const timeStr = date.toLocaleTimeString('vi-VN', {
    timeZone: 'Asia/Ho_Chi_Minh',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  });

  return `${dateStr} ${timeStr}`;
}

const PRE_STORAGE_STATUSES = [
  'PENDING_PREDECLARATION',
  'SUBMITTED',
  'PENDING_APPROVAL',
  'PENDING_QC',
  'RECEIVING',
  'IN_QC',
  'REJECTED',
  'QC_FAILED',
  'QUARANTINE',
];

const POST_STORAGE_STATUSES = [
  'ISSUED',
  'RELEASED',
  'SOLD_OUT',
  'DISPOSED',
  'CANCELLED',
  'CANCELED',
];

export const SpoilageForecastPanel: React.FC<SpoilageForecastPanelProps> = ({
  productBatchId,
  batchCode,
  productName,
  batchStatus,
}) => {
  const [forecast, setForecast] = useState<SpoilageForecastResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [hasCheckedLatest, setHasCheckedLatest] = useState<boolean>(false);
  const [history, setHistory] = useState<SpoilageForecastResponse[]>([]);
  const [showHistory, setShowHistory] = useState<boolean>(false);

  const upperStatus = (batchStatus || '').trim().toUpperCase();
  const isPreStorage = upperStatus !== '' && PRE_STORAGE_STATUSES.includes(upperStatus);
  const isPostStorage = upperStatus !== '' && POST_STORAGE_STATUSES.includes(upperStatus);
  const isStorageEligible = !isPreStorage && !isPostStorage;

  // 1. Tự động kiểm tra bản ghi dự báo gần nhất nếu lô hàng đang lưu kho
  useEffect(() => {
    if (!isStorageEligible) {
      setHasCheckedLatest(true);
      return;
    }

    let isMounted = true;
    const controller = new AbortController();

    async function checkLatest() {
      if (!productBatchId || productBatchId <= 0) return;
      setLoading(true);
      setError(null);
      try {
        const latest = await getLatestSpoilageForecast(productBatchId, controller.signal);
        if (isMounted) {
          setForecast(latest);
          setHasCheckedLatest(true);
        }
      } catch (err: any) {
        if (isMounted && err?.name !== 'CanceledError') {
          // 404 là bình thường khi chưa có dự báo
          setHasCheckedLatest(true);
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    checkLatest();

    return () => {
      isMounted = false;
      controller.abort();
    };
  }, [productBatchId, isStorageEligible]);

  // 2. Kích hoạt phân tích bằng AI (tạo mới hoặc ép làm mới)
  const handleAnalyze = useCallback(async (forceRefresh = false) => {
    setLoading(true);
    setError(null);
    try {
      const result = await generateSpoilageForecast({
        productBatchId,
        forceRefresh
      });

      if (result.isError) {
        setError(result.errorMessage || 'AI gặp sự cố khi xử lý dữ liệu.');
      } else {
        setForecast(result);
      }
    } catch (err: any) {
      setError(
        err?.response?.data?.message ||
        err?.message ||
        'Không thể kết nối đến máy chủ để dự báo hao hụt.'
      );
    } finally {
      setLoading(false);
    }
  }, [productBatchId]);

  // 3. Tải lịch sử dự báo
  const handleToggleHistory = async () => {
    if (!showHistory && history.length === 0) {
      try {
        const hist = await getSpoilageForecastHistory(productBatchId, 5);
        setHistory(hist);
      } catch (err) {
        console.error('Không thể tải lịch sử dự báo:', err);
      }
    }
    setShowHistory(!showHistory);
  };

  const riskConfig = forecast ? (RISK_LEVEL_CONFIG[forecast.riskLevel] ?? RISK_LEVEL_CONFIG.UNKNOWN) : null;

  return (
    <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden transition-all duration-300">
      {/* Header Panel */}
      <div className="border-b border-slate-100 bg-gradient-to-r from-slate-50 via-emerald-50/20 to-white px-6 py-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-600 text-white shadow-sm">
                🌾
              </span>
              <h3 className="text-lg font-bold text-slate-900">
                Dự Báo Rủi Ro & Hao Hụt Nông Sản AI
              </h3>
            </div>
            <p className="text-xs text-slate-500">
              Mã lô: <strong className="text-slate-700 font-mono">{batchCode}</strong>{productName ? ` (${productName})` : ''} · Phân tích đa chiều dựa trên đặc tính nông sản, kiểm định QC và điều kiện bảo quản thực tế
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {forecast && (
              <button
                type="button"
                onClick={handleToggleHistory}
                className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 hover:bg-slate-50 shadow-sm transition-colors"
              >
                📜 {showHistory ? 'Đóng lịch sử' : 'Lịch sử dự báo'}
              </button>
            )}

            {isStorageEligible && (
              <button
                type="button"
                disabled={loading}
                onClick={() => handleAnalyze(Boolean(forecast))}
                className={`inline-flex h-9 items-center gap-2 rounded-lg px-4 text-xs font-bold text-white shadow-sm transition-all duration-200 ${
                  loading
                    ? 'bg-slate-400 cursor-not-allowed'
                    : 'bg-emerald-600 hover:bg-emerald-700 active:scale-95'
                }`}
              >
                {loading ? (
                  <>
                    <svg className="h-3.5 w-3.5 animate-spin" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                    </svg>
                    Đang phân tích...
                  </>
                ) : forecast ? (
                  <>🔄 Cập nhật dự báo mới</>
                ) : (
                  <>🤖 Phân tích hao hụt ngay</>
                )}
              </button>
            )}
          </div>
        </div>

        {/* Thời điểm dự báo */}
        {forecast && (
          <div className="mt-3 flex items-center gap-1.5 text-xs text-slate-500">
            <span>🕒 Lần dự báo: <strong className="text-slate-700">{formatVietnamDateTime(forecast.generatedAt)}</strong></span>
          </div>
        )}
      </div>

      {/* Lịch sử Drawer/Accordion */}
      {showHistory && (
        <div className="border-b border-slate-200 bg-slate-50/70 p-5">
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-600 mb-3">
            Lịch sử các lần dự báo gần đây (Giờ Việt Nam)
          </h4>
          {history.length === 0 ? (
            <p className="text-xs text-slate-500">Chưa ghi nhận lịch sử nào khác.</p>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {history.map((h, i) => (
                <div key={i} className="rounded-xl border border-slate-200 bg-white p-3 shadow-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-700">
                      {formatVietnamShortTime(h.generatedAt)}
                    </span>
                    <span
                      className="rounded-full px-2 py-0.5 text-[10px] font-bold"
                      style={{
                        backgroundColor: RISK_LEVEL_CONFIG[h.riskLevel]?.bgColor ?? '#f1f5f9',
                        color: RISK_LEVEL_CONFIG[h.riskLevel]?.color ?? '#475569'
                      }}
                    >
                      {RISK_LEVEL_CONFIG[h.riskLevel]?.label ?? h.riskLevel}
                    </span>
                  </div>
                  <div className="mt-2 flex items-baseline justify-between text-xs">
                    <span className="text-slate-500">Điểm rủi ro:</span>
                    <strong className="text-sm font-extrabold text-slate-900">{h.spoilageRiskScore.toFixed(1)}/100</strong>
                  </div>
                  {h.predictedLossPercent !== null && (
                    <div className="mt-1 flex items-baseline justify-between text-xs">
                      <span className="text-slate-500">Hao hụt ước tính:</span>
                      <strong className="text-rose-600 font-bold">{h.predictedLossPercent.toFixed(1)}%</strong>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Body Panel */}
      <div className="p-6">
        {/* Trường hợp 1: Lô hàng chưa nhập kho */}
        {isPreStorage && (
          <div className="flex items-start gap-4 rounded-xl border border-amber-200 bg-amber-50/80 p-5 text-amber-900">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-amber-200/80 text-xl">
              📦
            </span>
            <div>
              <div className="flex items-center gap-2">
                <h4 className="text-sm font-bold text-amber-950">
                  Lô Hàng Chưa Hoàn Tất Nhập Kho
                </h4>
                <span className="rounded-full bg-amber-200/60 px-2 py-0.5 text-[11px] font-bold text-amber-800">
                  {batchStatus ?? 'CHỜ NHẬP KHO'}
                </span>
              </div>
              <p className="mt-1.5 text-xs text-amber-800 leading-relaxed">
                Chức năng AI dự báo rủi ro & hao hụt nông sản chỉ áp dụng cho các lô hàng <strong>đã kiểm định đạt và đã nhập kho lưu trữ chính thức</strong> (đang được kiểm soát bởi hệ thống cảm biến môi trường của kho).
              </p>
              <p className="mt-2 text-[11px] font-semibold text-amber-700">
                💡 Vui lòng hoàn tất quy trình kiểm nhận và nhập kho để kích hoạt tính năng dự báo.
              </p>
            </div>
          </div>
        )}

        {/* Trường hợp 2: Lô hàng đã xuất kho hoặc hủy */}
        {isPostStorage && (
          <div className="flex items-start gap-4 rounded-xl border border-slate-200 bg-slate-50 p-5 text-slate-800">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-slate-200 text-xl">
              🚚
            </span>
            <div>
              <div className="flex items-center gap-2">
                <h4 className="text-sm font-bold text-slate-900">
                  Lô Hàng Đã Xuất Kho / Kết Thúc Lưu Trữ
                </h4>
                <span className="rounded-full bg-slate-200 px-2 py-0.5 text-[11px] font-bold text-slate-700">
                  {batchStatus ?? 'ĐÃ XUẤT KHO'}
                </span>
              </div>
              <p className="mt-1.5 text-xs text-slate-600 leading-relaxed">
                Lô hàng này đã được xuất kho phân phối hoặc thanh lý/loại bỏ. Không còn lượng tồn thực tế trong kho để thực hiện tính toán rủi ro hao hụt.
              </p>
            </div>
          </div>
        )}

        {/* Trường hợp 3: Lô hàng đang lưu kho bình thường */}
        {isStorageEligible && (
          <>
            {/* Loading state */}
            {loading && (
              <div className="flex flex-col items-center justify-center py-12 text-center animate-fade-in">
                <div className="relative flex h-16 w-16 items-center justify-center">
                  <div className="absolute inset-0 rounded-full border-4 border-emerald-200 animate-ping opacity-25" />
                  <div className="h-12 w-12 rounded-full border-3 border-emerald-600 border-t-transparent animate-spin" />
                </div>
                <h4 className="mt-4 text-base font-bold text-slate-800">
                  Trí tuệ Nhân tạo đang phân tích tình trạng lô hàng...
                </h4>
                <p className="mt-1 max-w-md text-xs text-slate-500 leading-relaxed">
                  Hệ thống đang phân tích dữ liệu sinh lý giống cây, chỉ số QC, kết quả phòng lab và nhật ký nhiệt ẩm chuỗi lạnh để đưa ra định hướng thương mại tốt nhất cho doanh nghiệp.
                </p>
              </div>
            )}

            {/* Error state */}
            {!loading && error && (
              <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-rose-800">
                <div className="flex items-start gap-3">
                  <span className="text-lg">⚠️</span>
                  <div className="flex-1">
                    <h4 className="text-sm font-bold">Không thể hoàn thành dự báo</h4>
                    <p className="mt-0.5 text-xs text-rose-700">{error}</p>
                    <button
                      type="button"
                      onClick={() => handleAnalyze(true)}
                      className="mt-3 inline-flex items-center gap-1 rounded-md bg-rose-700 px-3 py-1.5 text-xs font-semibold text-white hover:bg-rose-800"
                    >
                      Thử lại ngay
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Empty state (Chưa có dự báo) */}
            {!loading && !error && !forecast && hasCheckedLatest && (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-50 text-3xl shadow-xs border border-emerald-100">
                  📊
                </div>
                <h4 className="mt-4 text-base font-bold text-slate-900">
                  Chưa có dữ liệu dự báo hao hụt cho lô {batchCode}
                </h4>
                <p className="mt-1 max-w-lg text-xs text-slate-500 leading-relaxed">
                  Hệ thống sẽ tổng hợp toàn bộ thông tin kiểm định chất lượng, nhật ký nhiệt ẩm bảo quản và đặc điểm sinh lý nông sản để tính toán cửa sổ bán hàng vàng và chiến lược giá tối ưu lợi nhuận.
                </p>
                <button
                  type="button"
                  onClick={() => handleAnalyze(false)}
                  className="mt-5 inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-emerald-700 transition-transform active:scale-95"
                >
                  <span>🤖</span>
                  Bắt đầu phân tích dự báo hao hụt
                </button>
              </div>
            )}
          </>
        )}

        {/* Success / Result State */}
        {!loading && !error && forecast && (
          <div className="space-y-6">
            {/* Hàng 1: Tổng quan rủi ro & Chỉ số */}
            <div className="grid gap-6 lg:grid-cols-12 items-stretch">
              {/* Cột Gauge */}
              <div className="lg:col-span-5 flex flex-col items-center justify-center rounded-2xl border border-slate-200 bg-gradient-to-b from-white to-slate-50/50 p-6 shadow-xs">
                <p className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
                  Chỉ Số Rủi Ro Hao Hụt
                </p>
                <RiskGauge score={forecast.spoilageRiskScore} riskLevel={forecast.riskLevel} size={220} />
                <p className="mt-3 text-center text-xs text-slate-500 max-w-xs">
                  {riskConfig?.description}
                </p>
              </div>

              {/* Cột 4 Thẻ Chỉ số */}
              <div className="lg:col-span-7 grid gap-4 sm:grid-cols-2">
                {/* 1. Tỷ lệ hao hụt ước tính */}
                <div className="flex flex-col justify-between rounded-xl border border-slate-200 bg-white p-4 shadow-xs">
                  <div className="flex items-center justify-between text-slate-500">
                    <span className="text-xs font-semibold">Tổn thất ước tính</span>
                    <span className="text-base">📉</span>
                  </div>
                  <div className="my-2">
                    <span className="text-2xl font-extrabold text-slate-900">
                      {forecast.predictedLossPercent !== null
                        ? `${forecast.predictedLossPercent.toFixed(1)}%`
                        : 'Chưa xác định'}
                    </span>
                    <span className="block text-[11px] text-slate-500">
                      trong {forecast.forecastHorizonDays ?? 7} ngày tới
                    </span>
                  </div>
                  <div className="h-1.5 w-full rounded-full bg-slate-100 overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-700"
                      style={{
                        width: `${Math.min(100, (forecast.predictedLossPercent ?? 0) * 4)}%`,
                        backgroundColor: (forecast.predictedLossPercent ?? 0) > 10 ? '#ef4444' : '#f59e0b'
                      }}
                    />
                  </div>
                </div>

                {/* 2. Thời gian vàng bán hàng */}
                <div className="flex flex-col justify-between rounded-xl border border-slate-200 bg-white p-4 shadow-xs">
                  <div className="flex items-center justify-between text-slate-500">
                    <span className="text-xs font-semibold">Thời gian vàng bán hàng</span>
                    <span className="text-base">⏳</span>
                  </div>
                  <div className="my-2">
                    <span className="text-2xl font-extrabold text-emerald-700">
                      {forecast.safeStorageRemainingDays !== null
                        ? `${forecast.safeStorageRemainingDays} ngày`
                        : 'N/A'}
                    </span>
                    <span className="block text-[11px] text-slate-500">
                      thời gian bán được giá tốt nhất
                    </span>
                  </div>
                  <span className="text-[11px] font-semibold text-emerald-600">
                    Bảo toàn giá trị phẩm chất
                  </span>
                </div>

                {/* 3. Phân hạng chất lượng */}
                <div className="flex flex-col justify-between rounded-xl border border-slate-200 bg-white p-4 shadow-xs">
                  <div className="flex items-center justify-between text-slate-500">
                    <span className="text-xs font-semibold">Hạng chất lượng lô</span>
                    <span className="text-base">🏷️</span>
                  </div>
                  <div className="my-2">
                    <span className="text-2xl font-extrabold text-slate-900">
                      Hạng {forecast.qualityGrade ?? 'Chưa phân'}
                    </span>
                    <span className="block text-[11px] text-slate-500">
                      theo tiêu chuẩn kiểm định SAW
                    </span>
                  </div>
                  <span className="text-[11px] text-slate-500">
                    Nông sản: <strong>{forecast.cropName}</strong>
                  </span>
                </div>

                {/* 4. Định hướng thương mại */}
                <div
                  className="flex flex-col justify-between rounded-xl border p-4 shadow-xs"
                  style={{
                    backgroundColor: riskConfig?.bgColor ?? '#f8fafc',
                    borderColor: riskConfig?.borderColor ?? '#e2e8f0'
                  }}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold" style={{ color: riskConfig?.color }}>
                      Định hướng thương mại
                    </span>
                    <span className="text-base">💼</span>
                  </div>
                  <div className="my-2">
                    <span className="text-xl font-extrabold" style={{ color: riskConfig?.color }}>
                      {forecast.spoilageRiskScore > 50 ? 'Bán sớm tránh lỗ' : 'Lưu kho an toàn'}
                    </span>
                    <span className="block text-[11px] text-slate-600">
                      {forecast.spoilageRiskScore > 50
                        ? 'Khuyến nghị mở chào bán sỉ ngay'
                        : 'Chất lượng ổn định theo chuẩn FEFO'}
                    </span>
                  </div>
                  <span className="text-[11px] font-semibold text-emerald-700">
                    🎯 Tối đa hóa lợi nhuận
                  </span>
                </div>
              </div>
            </div>

            {/* Hàng 2: Nhận định Chiến Lược & Tư Vấn Thương Mại Cấp Cao (Đã xóa Action Items) */}
            <StrategicRecommendationView
              recommendation={forecast.recommendation}
              riskLevel={forecast.riskLevel}
              safeStorageDays={forecast.safeStorageRemainingDays}
              predictedLossPercent={forecast.predictedLossPercent}
            />
          </div>
        )}
      </div>
    </div>
  );
};
