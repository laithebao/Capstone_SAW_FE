import axios from 'axios';
import type { SupplierProfileResponse } from '../../types/supplier';

export function isSupplierProfileDeclared(
  profile: Pick<SupplierProfileResponse, 'phoneNumber'> | null,
): boolean {
  return Boolean(profile?.phoneNumber?.trim());
}

export async function loadSupplierProfile(
  getProfile: () => Promise<SupplierProfileResponse>,
): Promise<SupplierProfileResponse | null> {
  let profile: SupplierProfileResponse;
  try {
    profile = await getProfile();
  } catch (error) {
    if (axios.isAxiosError(error) && error.response?.status === 404) return null;
    throw error;
  }

  // A failed or malformed response must not be treated as an undeclared profile.
  if (!profile || !Number.isInteger(profile.supplierId) || profile.supplierId <= 0 ||
    (profile.phoneNumber != null && typeof profile.phoneNumber !== 'string')) {
    throw new Error('Thông tin hồ sơ trả về không hợp lệ. Vui lòng thử lại.');
  }

  return profile;
}
