import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import { supplierService } from '../../services/suppliers/supplierService';
import type { SupplierProfileResponse } from '../../types/supplier';
import { SupplierProfileView } from '../../components/supplier/SupplierProfileView';
import { Loader2, AlertCircle } from 'lucide-react';
import { ROUTES } from '@/constants/routes';

export const SupplierProfilePage: React.FC = () => {
  const [profile, setProfile] = useState<SupplierProfileResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const navigate = useNavigate();

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await supplierService.getMyProfile();

        // Nếu profile chưa tồn tại hoặc chưa ACTIVE -> Điều hướng sang trang Khai báo profile
        if (!data || data.profileStatus !== 'ACTIVE') {
          navigate(ROUTES.SUPPLIER_PROFILE_DECLARE);
          return;
        }

        setProfile(data);
      } catch (err: any) {
        if (err.response?.status === 404) {
          // Chưa có thông tin hồ sơ -> Chuyển hướng sang trang Khai báo profile
          navigate(ROUTES.SUPPLIER_PROFILE_DECLARE);
        } else {
          setError(err.response?.data?.message || 'Không thể tải thông tin hồ sơ.');
        }
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [navigate]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
        <p className="text-sm text-gray-500 font-medium">Đang tải hồ sơ nhà cung cấp...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-xl mx-auto my-12 p-6 bg-red-50 border border-red-200 rounded-xl flex items-center gap-3 text-red-700">
        <AlertCircle className="w-6 h-6 shrink-0" />
        <div>
          <h3 className="font-semibold">Đã xảy ra lỗi</h3>
          <p className="text-sm mt-1">{error}</p>
        </div>
      </div>
    );
  }

  if (!profile) return null;

  return (
    <SupplierProfileView 
      profile={profile} 
      onEdit={() => navigate(ROUTES.SUPPLIER_PROFILE_DECLARE)} 
    />
  );
};

export default SupplierProfilePage;