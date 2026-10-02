import { z } from 'zod';

// ---------------------------------------------------------------------------
// Schema dùng chung cho cả Khai báo mới và Cập nhật lô hàng
// ---------------------------------------------------------------------------

export const declareBatchSchema = z
  .object({
    // --- Thông tin cơ bản ---
    cropTypeId: z
      .number({ message: 'Vui lòng chọn loại nông sản' })
      .min(1, 'Vui lòng chọn loại nông sản'),

    productName: z
      .string()
      .min(1, 'Tên/Giống sản phẩm không được để trống')
      .max(200, 'Tên sản phẩm tối đa 200 ký tự'),

    growingAreaId: z
      .number({ message: 'Vui lòng chọn vùng trồng' })
      .min(1, 'Vui lòng chọn vùng trồng'),

    // --- Khối lượng & Vận chuyển ---
    declaredQuantity: z
      .number({ message: 'Vui lòng nhập số lượng hợp lệ' })
      .gt(0, 'Số lượng khai báo phải lớn hơn 0'),

    /**
     * unit: Đơn vị đo lường chính.
     * - 'Tấn' | 'Kg'  : WeightInKg được tính tự động bởi BE.
     * - 'Bao' | 'Thùng': WeightInKg = packageCount * packageUnitWeightKg.
     */
    unit: z.enum(['Tấn', 'Kg', 'Bao', 'Thùng'], {
      required_error: 'Vui lòng chọn đơn vị',
    }),

    harvestDate: z.string().min(1, 'Vui lòng chọn ngày thu hoạch'),

    expectedDeliveryDate: z.string().optional(),

    expiryDate: z.string().optional(),

    // --- Quy cách đóng gói ---
    /**
     * packagingType: Loại kiện hàng ('Bao' hoặc 'Thùng').
     * Chỉ có giá trị khi unit là 'Bao' hoặc 'Thùng'.
     */
    packagingType: z.string().optional(),

    packageCount: z
      .number()
      .int('Số kiện phải là số nguyên')
      .positive('Số kiện phải lớn hơn 0')
      .optional()
      .nullable()
      .transform((val) =>
        val === null || (typeof val === 'number' && isNaN(val)) ? undefined : val
      ),

    /**
     * packageUnitWeightKg: Trọng lượng mỗi kiện (kg).
     * Ví dụ: 25 (Bao 25Kg), 10 (Thùng 10Kg).
     * FE tách từ lựa chọn UI và gửi field này riêng lên BE.
     * BE dùng: WeightInKg = packageCount * packageUnitWeightKg.
     */
    packageUnitWeightKg: z
      .number()
      .positive('Trọng lượng mỗi kiện phải lớn hơn 0')
      .optional()
      .nullable()
      .transform((val) =>
        val === null || (typeof val === 'number' && isNaN(val)) ? undefined : val
      ),

    // --- Điều kiện bảo quản (Snapshot từ DB PRODUCT_BATCH) ---
    expectedMinTempC: z
      .number()
      .optional()
      .nullable()
      .transform((val) =>
        val === null || (typeof val === 'number' && isNaN(val)) ? undefined : val
      ),

    expectedMaxTempC: z
      .number()
      .optional()
      .nullable()
      .transform((val) =>
        val === null || (typeof val === 'number' && isNaN(val)) ? undefined : val
      ),

    expectedMinHumidityPct: z
      .number()
      .min(0, 'Độ ẩm tối thiểu từ 0%')
      .max(100, 'Độ ẩm tối đa 100%')
      .optional()
      .nullable()
      .transform((val) =>
        val === null || (typeof val === 'number' && isNaN(val)) ? undefined : val
      ),

    expectedMaxHumidityPct: z
      .number()
      .min(0, 'Độ ẩm tối thiểu từ 0%')
      .max(100, 'Độ ẩm tối đa 100%')
      .optional()
      .nullable()
      .transform((val) =>
        val === null || (typeof val === 'number' && isNaN(val)) ? undefined : val
      ),

    // --- Ghi chú ---
    note: z.string().optional(),
  })
  .superRefine((data, ctx) => {
    // Validate: ExpiryDate phải >= HarvestDate
    if (data.expiryDate && data.harvestDate) {
      if (new Date(data.expiryDate) < new Date(data.harvestDate)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['expiryDate'],
          message: 'Ngày hết hạn không được trước ngày thu hoạch',
        });
      }
    }

    // Validate: Nhiệt độ Min <= Max
    if (
      data.expectedMinTempC !== undefined &&
      data.expectedMinTempC !== null &&
      data.expectedMaxTempC !== undefined &&
      data.expectedMaxTempC !== null &&
      data.expectedMinTempC > data.expectedMaxTempC
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['expectedMaxTempC'],
        message: 'Nhiệt độ tối đa phải lớn hơn hoặc bằng nhiệt độ tối thiểu',
      });
    }

    // Validate: Độ ẩm Min <= Max
    if (
      data.expectedMinHumidityPct !== undefined &&
      data.expectedMinHumidityPct !== null &&
      data.expectedMaxHumidityPct !== undefined &&
      data.expectedMaxHumidityPct !== null &&
      data.expectedMinHumidityPct > data.expectedMaxHumidityPct
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['expectedMaxHumidityPct'],
        message: 'Độ ẩm tối đa phải lớn hơn hoặc bằng độ ẩm tối thiểu',
      });
    }

    // Validate: Khi unit là Bao/Thùng, bắt buộc phải có packageCount và packageUnitWeightKg
    if (data.unit === 'Bao' || data.unit === 'Thùng') {
      if (!data.packageCount || data.packageCount <= 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['packageCount'],
          message: 'Vui lòng nhập số lượng kiện',
        });
      }
      if (!data.packageUnitWeightKg || data.packageUnitWeightKg <= 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['packageUnitWeightKg'],
          message: 'Vui lòng nhập trọng lượng mỗi kiện (kg)',
        });
      }
    }
  });

// updateBatchSchema dùng cùng cấu trúc với declareBatchSchema
export const updateBatchSchema = declareBatchSchema;

export type DeclareBatchFormValues = z.infer<typeof declareBatchSchema>;
export type UpdateBatchFormValues = z.infer<typeof updateBatchSchema>;