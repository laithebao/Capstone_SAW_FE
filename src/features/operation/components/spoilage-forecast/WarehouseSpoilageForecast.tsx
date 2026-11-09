import { useEffect, useRef, useState } from 'react';
import { getAuthErrorMessage } from '@/services/authService';
import { generateSpoilageForecasts, getLatestSpoilageForecasts } from '@/services/spoilageForecastService';
import { RISK_LEVEL_CONFIG, type SpoilageForecastResponse } from '@/types/spoilageForecast';
import { ActionItemCard } from './ActionItemCard';

const number = new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 2 });
const timestamp = new Intl.DateTimeFormat('vi-VN', {
  dateStyle: 'short',
  timeStyle: 'short',
  timeZone: 'Asia/Ho_Chi_Minh',
});

export function WarehouseSpoilageForecast() {
  const [forecasts, setForecasts] = useState<SpoilageForecastResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [hasRun, setHasRun] = useState(false);
  const [error, setError] = useState('');
  const runRequest = useRef<AbortController | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    async function load() {
      try {
        const results = await getLatestSpoilageForecasts(controller.signal);
        if (!controller.signal.aborted) setForecasts(results);
      } catch (cause) {
        if (!controller.signal.aborted) setError(getAuthErrorMessage(cause, 'Không thể tải dự báo đã lưu.'));
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }
    void load();
    return () => {
      controller.abort();
      runRequest.current?.abort();
    };
  }, []);

  async function runForecast() {
    if (runRequest.current) return;
    const controller = new AbortController();
    runRequest.current = controller;
    setRunning(true);
    setError('');
    try {
      const results = await generateSpoilageForecasts(controller.signal);
      if (!controller.signal.aborted) {
        setForecasts(results);
        setHasRun(true);
      }
    } catch (cause) {
      if (!controller.signal.aborted) setError(getAuthErrorMessage(cause, 'Không thể chạy dự báo AI. Vui lòng thử lại.'));
    } finally {
      runRequest.current = null;
      if (!controller.signal.aborted) setRunning(false);
    }
  }

  let status = '';
  if (loading) status = 'Đang tải dự báo đã lưu…';
  else if (running) status = 'AI đang dự báo cho các lô hàng trong kho. Kết quả sẽ hiển thị khi hoàn tất.';
  else if (forecasts.length > 0) status = `${hasRun ? 'Đã dự báo' : 'Dự báo gần nhất của'} ${forecasts.length} lô hàng.`;
  else if (hasRun) status = 'Hiện không có lô hàng đang lưu kho còn tồn.';
  else if (!error) status = 'Chưa có dự báo cho các lô hàng đang lưu kho.';

  return (
    <section className="space-y-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-bold text-slate-900">Dự báo hao hụt bằng AI</h2>
          <p className="mt-1 text-sm text-slate-500">Dự báo cho tất cả lô hàng đang lưu kho còn tồn.</p>
        </div>
        <button
          type="button"
          disabled={loading || running}
          onClick={() => void runForecast()}
          className="rounded-lg bg-emerald-700 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-800 disabled:cursor-wait disabled:opacity-60"
        >
          {running ? 'Đang dự báo…' : 'Chạy dự báo toàn kho'}
        </button>
      </div>

      {error && <p role="alert" className="rounded-lg bg-rose-50 p-3 text-sm text-rose-700">{error}</p>}
      <p role="status" className="text-sm text-slate-600">{status}</p>

      <div className="space-y-2">
        {forecasts.map((forecast) => {
          const risk = RISK_LEVEL_CONFIG[forecast.riskLevel] ?? RISK_LEVEL_CONFIG.UNKNOWN;
          const loss = forecast.predictedLossPercent;
          const horizon = forecast.forecastHorizonDays;
          const safeDays = forecast.safeStorageRemainingDays;
          return (
            <details key={forecast.productBatchId} className="rounded-lg border border-slate-200 p-3">
              <summary className="cursor-pointer text-sm font-semibold text-slate-900">
                <span className="font-mono text-emerald-700">{forecast.batchCode}</span>
                {' · '}{forecast.productName}
                <span className="ml-2 inline-block rounded-full px-2 py-0.5 text-xs"
                  style={{ backgroundColor: risk.bgColor, color: risk.color }}>
                  {risk.label}
                </span>
              </summary>
              <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-600">
                <span>Hao hụt dự kiến {loss === null ? '—' : `${number.format(loss)}%${horizon === null ? '' : ` trong ${horizon} ngày`}`}</span>
                <span>Bảo quản an toàn còn {safeDays === null ? '—' : `${safeDays} ngày`}</span>
              </div>
              <div className="mt-3 space-y-3 border-t border-slate-100 pt-3 text-sm text-slate-700">
                <p className="whitespace-pre-wrap break-words">{forecast.recommendation}</p>
                {forecast.actions.length > 0 && (
                  <div className="grid gap-2 lg:grid-cols-2">
                    {forecast.actions.map((action, index) => <ActionItemCard key={index} action={action} index={index} />)}
                  </div>
                )}
                <p className="text-xs text-slate-500">Thời điểm dự báo {timestamp.format(new Date(forecast.generatedAt))}</p>
              </div>
            </details>
          );
        })}
      </div>
    </section>
  );
}
