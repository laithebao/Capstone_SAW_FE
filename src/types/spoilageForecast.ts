export type RiskLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' | 'UNKNOWN';

export type ActionPriority = 'IMMEDIATE' | 'URGENT' | 'RECOMMENDED' | 'MONITOR';

export type ActionCategory = 
  | 'TEMPERATURE' 
  | 'HUMIDITY' 
  | 'ROTATION' 
  | 'DISPOSAL' 
  | 'INSPECTION' 
  | 'TRANSFER' 
  | 'OTHER';

export interface ForecastActionItem {
  priority: ActionPriority;
  category: ActionCategory;
  action: string;
  reason: string;
  deadline: string | null;
}

export interface SpoilageForecastResponse {
  productBatchId: number;
  batchCode: string;
  productName: string;
  cropName: string;
  qualityGrade: string | null;
  
  // Chỉ số cốt lõi
  predictedLossPercent: number | null;// % hao hụt ước tính
  safeStorageRemainingDays: number | null;
  riskLevel: RiskLevel;
  forecastHorizonDays: number | null;
  
  // Khuyến nghị
  recommendation: string;
  actions: ForecastActionItem[];
  
  // Metadata
  generatedAt: string;
  isFromCache: boolean;
  modelVersion: string;
}

export const RISK_LEVEL_CONFIG: Record<RiskLevel, {
  label: string;
  color: string;
  bgColor: string;
}> = {
  LOW: {
    label: 'Rủi ro thấp',
    color: '#059669', // emerald-600
    bgColor: '#ecfdf5', // emerald-50
  },
  MEDIUM: {
    label: 'Rủi ro trung bình',
    color: '#d97706', // amber-600
    bgColor: '#fffbeb', // amber-50
  },
  HIGH: {
    label: 'Rủi ro cao',
    color: '#ea580c', // orange-600
    bgColor: '#fff7ed', // orange-50
  },
  CRITICAL: {
    label: 'Rủi ro nghiêm trọng',
    color: '#dc2626', // red-600
    bgColor: '#fef2f2', // red-50
  },
  UNKNOWN: {
    label: 'Chưa xác định',
    color: '#64748b',
    bgColor: '#f8fafc',
  }
};

export const ACTION_PRIORITY_CONFIG: Record<ActionPriority, {
  label: string;
  color: string;
  badgeClass: string;
  order: number;
}> = {
  IMMEDIATE: {
    label: 'Khẩn cấp (Ngay)',
    color: '#dc2626',
    badgeClass: 'bg-red-100 text-red-800 border-red-300',
    order: 1
  },
  URGENT: {
    label: 'Ưu tiên cao',
    color: '#ea580c',
    badgeClass: 'bg-orange-100 text-orange-800 border-orange-300',
    order: 2
  },
  RECOMMENDED: {
    label: 'Khuyến nghị',
    color: '#2563eb',
    badgeClass: 'bg-blue-100 text-blue-800 border-blue-300',
    order: 3
  },
  MONITOR: {
    label: 'Theo dõi',
    color: '#64748b',
    badgeClass: 'bg-slate-100 text-slate-800 border-slate-300',
    order: 4
  }
};

export const ACTION_CATEGORY_LABELS: Record<ActionCategory, { label: string; icon: string }> = {
  TEMPERATURE: { label: 'Nhiệt độ', icon: '🌡️' },
  HUMIDITY: { label: 'Độ ẩm', icon: '💧' },
  ROTATION: { label: 'Xuất kho / Luân chuyển', icon: '🔄' },
  DISPOSAL: { label: 'Loại bỏ / Thanh lý', icon: '🗑️' },
  INSPECTION: { label: 'Kiểm định lại QC', icon: '🔍' },
  TRANSFER: { label: 'Chuyển vị trí kho', icon: '📦' },
  OTHER: { label: 'Khác', icon: '📌' }
};
