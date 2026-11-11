export interface DistributorProfile {
  distributorId: number
  distributorCode: string
  distributorName: string
  taxCode: string
  contactPerson: string | null
  phoneNumber: string | null
  email: string | null
  address: string | null
}

export interface UserProfile {
  accountId: number
  username: string
  email: string
  fullName: string
  phoneNumber: string | null
  avatarUrl: string | null
  roleCode: string
  distributor: DistributorProfile | null
}

export interface UpdateUserProfileRequest {
  fullName: string
  phoneNumber: string | null
  distributor: Omit<DistributorProfile, 'distributorId' | 'distributorCode' | 'taxCode'> | null
}
