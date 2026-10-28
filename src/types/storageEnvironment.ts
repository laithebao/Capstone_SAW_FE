export interface InStorageBatchEnvDto {
  productBatchId: number
  batchCode: string
  productName: string
  qualityGrade: string | null
  weightInKg: number
  batchStatus: string
  warehouseLocationId: number | null
  locationCode: string | null
  zoneName: string | null
  expectedMinTempC: number | null
  expectedMaxTempC: number | null
  expectedMinHumidityPct: number | null
  expectedMaxHumidityPct: number | null
  lastRecordedAt: string | null
  lastTemperatureC: number | null
  lastHumidityPct: number | null
  lastRecordedByName: string | null
  isLastOutOfRange: boolean | null
  hoursSinceLastLog: number | null
  totalLogsCount: number
}

export interface InStorageBatchEnvQuery {
  search?: string
  zoneName?: string
  isOutOfRange?: boolean
  isOverdue?: boolean
  page?: number
  pageSize?: number
}

export interface StorageEnvironmentLogRequest {
  productBatchId: number
  warehouseLocationId?: number
  temperatureC: number
  humidityPct?: number
  sourceType: 'MANUAL' | 'IOT_SENSOR' | 'IMPORT'
  sensorIdentifier?: string
  recordedAt: string
  note?: string
}

export interface StorageEnvironmentLogItem {
  id: number
  productBatchId: number
  warehouseLocationId: number | null
  warehouseLocationCode: string
  temperatureC: number
  humidityPct: number | null
  sourceType: string
  sensorIdentifier: string | null
  recordedAt: string
  note: string | null
  isTempOutOfRange: boolean | null
}
