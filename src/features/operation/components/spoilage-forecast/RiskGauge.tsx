import React from 'react';
import { RISK_LEVEL_CONFIG, type RiskLevel } from '@/types/spoilageForecast';

interface RiskGaugeProps {
  score: number; // 0 - 100
  riskLevel: RiskLevel;
  size?: number;
}

export const RiskGauge: React.FC<RiskGaugeProps> = ({ score, riskLevel, size = 200 }) => {
  const config = RISK_LEVEL_CONFIG[riskLevel] ?? RISK_LEVEL_CONFIG.UNKNOWN;
  const clampedScore = Math.min(100, Math.max(0, score));

  // Góc của bán nguyệt: -180 độ đến 0 độ (tương đương 180 độ tổng cộng)
  // Bán kính và chu vi
  const strokeWidth = 14;
  const radius = (size - strokeWidth) / 2;
  const circumference = Math.PI * radius; // Nửa đường tròn
  const strokeDashoffset = circumference - (clampedScore / 100) * circumference;

  return (
    <div className="flex flex-col items-center justify-center">
      <div className="relative" style={{ width: size, height: size / 2 + 30 }}>
        <svg
          width={size}
          height={size / 2 + 20}
          viewBox={`0 0 ${size} ${size / 2 + 20}`}
          className="overflow-visible"
        >
          <defs>
            <linearGradient id="gaugeGradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#10b981" />    {/* Xanh lá - An toàn */}
              <stop offset="35%" stopColor="#f59e0b" />   {/* Vàng - Trung bình */}
              <stop offset="70%" stopColor="#f97316" />   {/* Cam - Cao */}
              <stop offset="100%" stopColor="#ef4444" />  {/* Đỏ - Nghiêm trọng */}
            </linearGradient>
          </defs>

          {/* Đường ray nền */}
          <path
            d={`M ${strokeWidth / 2} ${size / 2} A ${radius} ${radius} 0 0 1 ${size - strokeWidth / 2} ${size / 2}`}
            fill="none"
            stroke="#e2e8f0"
            strokeWidth={strokeWidth}
            strokeLinecap="round"
          />

          {/* Đường đo giá trị rủi ro */}
          <path
            d={`M ${strokeWidth / 2} ${size / 2} A ${radius} ${radius} 0 0 1 ${size - strokeWidth / 2} ${size / 2}`}
            fill="none"
            stroke="url(#gaugeGradient)"
            strokeWidth={strokeWidth}
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            className="transition-all duration-1000 ease-out"
          />
        </svg>

        {/* Chỉ số trung tâm */}
        <div className="absolute inset-x-0 bottom-0 flex flex-col items-center justify-center text-center">
          <span className="text-3xl font-extrabold tracking-tight text-slate-900">
            {clampedScore.toFixed(1)}
          </span>
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            / 100 điểm
          </span>
        </div>
      </div>

      {/* Nhãn mức rủi ro */}
      <div
        className="mt-2 inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold shadow-sm transition-transform hover:scale-105"
        style={{
          backgroundColor: config.bgColor,
          color: config.color,
          border: `1px solid ${config.borderColor}`
        }}
      >
        <span
          className="inline-block h-2 w-2 rounded-full animate-pulse"
          style={{ backgroundColor: config.badgeBg }}
        />
        {config.label}
      </div>
    </div>
  );
};
