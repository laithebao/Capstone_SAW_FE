export interface ProductBatchQrCode {
  productBatchId: number
  batchCode: string
  status: 'READY' | 'PENDING' | 'INELIGIBLE' | 'UNAVAILABLE'
  message: string
  publicToken: string | null
  traceabilityUrl: string | null
  qrImageUrl: string | null
  generatedAt: string | null
}
