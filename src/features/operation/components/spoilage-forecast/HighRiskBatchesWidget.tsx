import React, { useEffect, useState } from 'react';
import { Link } from 'react-router';
import { getHighRiskBatches } from '@/services/spoilageForecastService';
import { RISK_LEVEL_CONFIG, type SpoilageForecastResponse } from '@/types/spoilageForecast';
import { ROUTES } from '@/constants/routes';

export const HighRiskBatchesWidget: React.FC = () => {
  const [batches, setBatches] = useState<SpoilageForecastResponse[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    async function load() {
      try {
        setLoading(true);
        const data = await getHighRiskBatches(6);
        if (isMounted) setBatches(data);
      } catch (err: any) {
        if (isMounted) setError('Không thể tải danh sách lô hàng rủi ro.');
      } finally {
        if (isMounted) setLoading(false);
      }
    }
    load();
    return () => { isMounted = false; };
  }, []);

  if (loading) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm animate-pulse">
        <div className="h-4 w-48 bg-slate-200 rounded mb-4" />
        <div className="space-y-3">
          <div className="h-12 bg-slate-100 rounded-lg" />
          <div className="h-12 bg-slate-100 rounded-lg" />
        </div>
      </div>
    );
  }

  if (error || batches.length === 0) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <span className="text-base">🛡️</span>
            <h3 className="font-bold text-slate-900 text-sm">Cảnh báo rủi ro hao hụt nông sản (AI)</h3>
          </div>
          <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-700">
            Trạng thái an toàn
          </span>
        </div>
        <p className="mt-4 text-xs text-slate-500 text-center py-4">
          Hiện tại không có lô hàng nào ở mức cảnh báo rủi ro cao hoặc nghiêm trọng.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-rose-200 bg-gradient-to-b from-rose-50/40 via-white to-white p-5 shadow-sm">
      <div className="flex items-center justify-between border-b border-rose-100 pb-3.5">
        <div>
          <div className="flex items-center gap-2">
            <span className="flex h-6 w-6 items-center justify-center rounded-md bg-rose-600 text-white text-xs">
              ⚠️
            </span>
            <h3 className="font-bold text-slate-900 text-sm">
              Lô Hàng Cần Ưu Tiên Can Thiệp (AI Spoilage Alert)
            </h3>
          </div>
          <p className="mt-1 text-xs text-slate-500">
            Các lô hàng có chỉ số rủi ro hao hụt cao
          </p>
        </div>
        <span className="rounded-full bg-rose-100 px-2.5 py-1 text-xs font-extrabold text-rose-700 border border-rose-200">
          {batches.length} lô nguy cơ
        </span>
      </div>

      <div className="mt-4 divide-y divide-slate-100">
        {batches.map((batch) => {
          const config = RISK_LEVEL_CONFIG[batch.riskLevel] ?? RISK_LEVEL_CONFIG.UNKNOWN;
          const detailUrl = ROUTES.OPERATION_PRODUCT_BATCH_DETAIL.replace(':id', String(batch.productBatchId));

          return (
            <div
              key={batch.productBatchId}
              className="flex flex-col gap-2 py-3.5 sm:flex-row sm:items-center sm:justify-between group hover:bg-slate-50/80 rounded-lg px-2 -mx-2 transition-colors"
            >
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs font-bold text-emerald-700">
                    {batch.batchCode}
                  </span>
                  <span className="text-xs font-semibold text-slate-800">
                    {batch.productName}
                  </span>
                  {batch.qualityGrade && (
                    <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-bold text-slate-600">
                      Hạng {batch.qualityGrade}
                    </span>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-3 self-end sm:self-center">
                <div className="text-right">
                  <span
                    className="inline-block rounded-full px-2 py-0.5 text-[10px] font-bold"
                    style={{ backgroundColor: config.bgColor, color: config.color, border: `1px solid ${config.borderColor}` }}
                  >
                    {config.label}
                  </span>
                  <div className="text-xs font-extrabold text-slate-900 mt-0.5">
                    {batch.spoilageRiskScore.toFixed(1)}/100
                  </div>
                </div>

                <Link
                  to={detailUrl}
                  className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:border-emerald-300 hover:text-emerald-700 shadow-xs transition-all"
                >
                  Chi tiết →
                </Link>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
