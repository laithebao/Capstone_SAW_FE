import React from 'react';
import {
  ACTION_CATEGORY_LABELS,
  ACTION_PRIORITY_CONFIG,
  type ForecastActionItem
} from '@/types/spoilageForecast';

interface ActionItemCardProps {
  action: ForecastActionItem;
  index: number;
}

export const ActionItemCard: React.FC<ActionItemCardProps> = ({ action, index }) => {
  const priorityConfig = ACTION_PRIORITY_CONFIG[action.priority] ?? ACTION_PRIORITY_CONFIG.RECOMMENDED;
  const categoryConfig = ACTION_CATEGORY_LABELS[action.category] ?? ACTION_CATEGORY_LABELS.OTHER;

  return (
    <div className="group relative rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition-all duration-200 hover:border-slate-300 hover:shadow-md">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-2.5">
        <div className="flex items-center gap-2">
          {/* Thứ tự và Category */}
          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-slate-100 text-xs font-bold text-slate-600">
            {index + 1}
          </span>
          <span className="inline-flex items-center gap-1 text-xs font-medium text-slate-600">
            <span>{categoryConfig.icon}</span>
            <span>{categoryConfig.label}</span>
          </span>
        </div>

        {/* Priority Badge */}
        <span
          className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-bold ${priorityConfig.badgeClass}`}
        >
          {priorityConfig.label}
        </span>
      </div>

      {/* Hành động chính */}
      <h4 className="mt-2.5 text-sm font-bold text-slate-900 group-hover:text-emerald-700 transition-colors">
        {action.action}
      </h4>

      {/* Căn cứ khoa học */}
      {action.reason && (
        <p className="mt-1.5 text-xs text-slate-600 leading-relaxed">
          <span className="font-semibold text-slate-700">Căn cứ: </span>
          {action.reason}
        </p>
      )}

      {/* Thời hạn hoàn thành */}
      {action.deadline && (
        <div className="mt-3 flex items-center gap-1.5 text-xs font-semibold text-rose-700">
          <span className="inline-block">⏱️</span>
          <span>Thời hạn: {action.deadline}</span>
        </div>
      )}
    </div>
  );
};
