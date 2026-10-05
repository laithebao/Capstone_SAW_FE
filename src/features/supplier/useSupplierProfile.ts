import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { getAuthErrorMessage } from '@/services/authService';
import { supplierService } from '@/services/suppliers/supplierService';
import type { SupplierProfileResponse } from '@/types/supplier';
import { loadSupplierProfile } from './profileStatus';

interface ProfileResult {
  accountId: number | undefined;
  pathname: string;
  attempt: number;
  profile: SupplierProfileResponse | null;
  error: string | null;
}

export function useSupplierProfile(pathname: string) {
  const { user } = useAuth();
  const accountId = user?.id;
  const [attempt, setAttempt] = useState(0);
  const [result, setResult] = useState<ProfileResult | null>(null);

  useEffect(() => {
    let isCurrent = true;

    async function fetchProfile() {
      try {
        const profile = await loadSupplierProfile(supplierService.getMyProfile);
        if (isCurrent) setResult({ accountId, pathname, attempt, profile, error: null });
      } catch (error) {
        if (isCurrent) {
          setResult({
            accountId, pathname, attempt, profile: null,
            error: getAuthErrorMessage(error, 'Không thể tải thông tin hồ sơ. Vui lòng thử lại.'),
          });
        }
      }
    }

    void fetchProfile();
    return () => { isCurrent = false; };
  }, [accountId, pathname, attempt]);

  // Hide the previous result immediately when a route, account, or retry changes.
  const loading = !result || result.accountId !== accountId ||
    result.pathname !== pathname || result.attempt !== attempt;

  return {
    loading,
    profile: loading ? null : result.profile,
    error: loading ? null : result.error,
    retry: () => setAttempt((current) => current + 1),
  };
}
