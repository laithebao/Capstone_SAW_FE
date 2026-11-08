export interface PublicTraceabilityGradeRule {
  grade: string
  minValue: number | null
  maxValue: number | null
  requiredTextValue: string | null
  isFailRule: boolean
}

export interface PublicTraceabilityCriterion {
  code: string
  name: string
  groupLabel: string
  dataType: string
  unit: string | null
  numericValue: number | null
  textValue: string | null
  booleanValue: boolean | null
  hasResult: boolean
  evaluatedGrade: string | null
  isPassed: boolean | null
  assessmentBasis: string
  rules: PublicTraceabilityGradeRule[]
}

export interface PublicTraceability {
  batchCode: string
  productName: string
  cropTypeName: string
  supplierName: string
  origin: { areaName: string; region: string; province: string }
  harvestDate: string
  expiryDate: string | null
  quality: {
    grade: string
    result: string
    startedAt: string
    completedAt: string
    standard: { code: string; name: string; version: number } | null
    sampling: { ratioPercent: number; sampleWeightKg: number } | null
    criteria: PublicTraceabilityCriterion[]
    gradeExplanation: string
    determiningCriteria: string[]
  }
  milestones: { type: string; label: string; occurredAt: string }[]
}
