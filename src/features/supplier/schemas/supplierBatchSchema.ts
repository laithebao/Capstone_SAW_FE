import { z } from 'zod';

const optionalNumber = (schema = z.number()) => schema.nullable().optional().default(null);
const optionalDate = z.union([z.iso.date(), z.literal(''), z.null()]).optional().default(null)
  .transform(value => value === '' ? null : value);
const decimal = (scale: number, limit: number) => z.number().finite().refine(
  value => Math.abs(value) < limit && Math.abs(value * 10 ** scale - Math.round(value * 10 ** scale)) < 0.000001,
  `Giá trị phải nằm trong giới hạn cho phép và có tối đa ${scale} chữ số thập phân`,
);
export const declareBatchSchema = z.object({
  cropTypeId: z.number().int().positive('Vui lòng chọn nông sản'),
  growingAreaId: z.number().int().positive('Vui lòng chọn vùng trồng'),
  productName: z.string().trim().min(1, 'Vui lòng nhập tên sản phẩm').max(200),
  declaredQuantity: decimal(3, 1e15).positive('Số lượng phải lớn hơn 0'),
  unit: z.enum(['Tấn', 'Kg', 'Bao', 'Thùng']),
  harvestDate: z.iso.date('Vui lòng chọn ngày thu hoạch hợp lệ'),
  expectedDeliveryDate: optionalDate,
  expiryDate: optionalDate,
  packagingType: z.string().max(100, 'Quy cách tối đa 100 ký tự').optional(),
  packageCount: optionalNumber(z.number().int().positive().max(2147483647)),
  packageUnitWeightKg: optionalNumber(decimal(3, 1e15).positive()),
  expectedMinTempC: optionalNumber(decimal(2, 10000)),
  expectedMaxTempC: optionalNumber(decimal(2, 10000)),
  expectedMinHumidityPct: optionalNumber(decimal(2, 10000).min(0).max(100)),
  expectedMaxHumidityPct: optionalNumber(decimal(2, 10000).min(0).max(100)),
  note: z.string().max(1000, 'Ghi chú tối đa 1000 ký tự').optional(),
}).superRefine((data, ctx) => {
  const issue = (path: string, message: string) => ctx.addIssue({ code: 'custom', path: [path], message });
  const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Ho_Chi_Minh', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
  if (data.harvestDate > today) issue('harvestDate', 'Ngày thu hoạch không được ở tương lai');
  if (data.expiryDate && data.expiryDate < data.harvestDate) issue('expiryDate', 'Ngày hết hạn không được trước ngày thu hoạch');
  if (data.expectedDeliveryDate && data.expectedDeliveryDate < data.harvestDate) issue('expectedDeliveryDate', 'Ngày giao dự kiến không được trước ngày thu hoạch');
  if (data.expectedMinTempC != null && data.expectedMaxTempC != null && data.expectedMinTempC > data.expectedMaxTempC)
    issue('expectedMaxTempC', 'Nhiệt độ tối đa phải lớn hơn hoặc bằng tối thiểu');
  if (data.expectedMinHumidityPct != null && data.expectedMaxHumidityPct != null && data.expectedMinHumidityPct > data.expectedMaxHumidityPct)
    issue('expectedMaxHumidityPct', 'Độ ẩm tối đa phải lớn hơn hoặc bằng tối thiểu');
  if (data.unit === 'Bao' || data.unit === 'Thùng') {
    if (!data.packageCount) issue('packageCount', 'Vui lòng nhập số kiện');
    if (!data.packageUnitWeightKg) issue('packageUnitWeightKg', 'Vui lòng nhập khối lượng kg mỗi kiện');
    if (data.packageCount != null && data.packageCount !== data.declaredQuantity) issue('declaredQuantity', 'Số lượng khai báo phải bằng số kiện');
  }
});
export const updateBatchSchema = declareBatchSchema;
export type DeclareBatchFormInput = z.input<typeof declareBatchSchema>;
export type DeclareBatchFormValues = z.output<typeof declareBatchSchema>;
export type UpdateBatchFormValues = DeclareBatchFormValues;
export type UpdateBatchFormInput = DeclareBatchFormInput;
// Form reset can supply API numbers or empty defaults as well as input strings.
// Keep invalid values invalid so validation can reject them.
export const optionalNumericInput = (value: unknown): number | undefined => {
  if (value == null) return undefined;
  if (typeof value === 'number') return value;
  if (typeof value === 'string') return value.trim() === '' ? undefined : Number(value);
  return NaN;
};
