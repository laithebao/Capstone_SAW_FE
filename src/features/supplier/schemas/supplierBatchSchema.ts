import { z } from 'zod';

export const declareBatchSchema = z.object({
  cropTypeId: z
    .number({ message: 'Vui lòng chọn loại nông sản' })
    .min(1, 'Vui lòng chọn loại nông sản'),
  productName: z
    .string()
    .min(1, 'Tên/Giống sản phẩm không được để trống')
    .max(200, 'Tên sản phẩm tối đa 200 ký tự'),
  
  // Đã sửa: origin string -> growingAreaId number
  growingAreaId: z
    .number({ message: 'Vui lòng chọn vùng trồng' })
    .min(1, 'Vui lòng chọn vùng trồng'),
    
  declaredQuantity: z
    .number({ message: 'Vui lòng nhập số lượng hợp lệ' })
    .gt(0, 'Số lượng khai báo phải lớn hơn 0'),
  unit: z.string().min(1, 'Vui lòng chọn đơn vị'),
  harvestDate: z.string().min(1, 'Vui lòng chọn ngày thu hoạch'),
  packagingType: z.string().optional(),
  packageCount: z
    .number()
    .optional()
    .nullable()
    .transform((val) => (val === null || (typeof val === 'number' && isNaN(val)) ? undefined : val)),
  expectedDeliveryDate: z.string().optional(),
  note: z.string().optional(),
});

export const updateBatchSchema = declareBatchSchema;

export type DeclareBatchFormValues = z.infer<typeof declareBatchSchema>;
export type UpdateBatchFormValues = z.infer<typeof updateBatchSchema>;