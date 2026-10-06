import React from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router';
import { isSupplierProfileDeclared } from '@/features/supplier/profileStatus';
import { useSupplierProfile } from '@/features/supplier/useSupplierProfile';
import { SupplierProfileView } from '../../components/supplier/SupplierProfileView';
import { Loader2, AlertCircle } from 'lucide-react';
import { ROUTES } from '@/constants/routes';

export const SupplierProfilePage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { loading, profile, error, retry } = useSupplierProfile(location.pathname);

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
      <div role="alert" className="max-w-xl mx-auto my-12 p-6 bg-red-50 border border-red-200 rounded-xl flex items-center gap-3 text-red-700">
        <AlertCircle className="w-6 h-6 shrink-0" />
        <div>
          <h3 className="font-semibold">Đã xảy ra lỗi</h3>
          <p className="text-sm mt-1">{error}</p>
          <button type="button" onClick={retry} className="mt-4 rounded-lg bg-red-700 px-4 py-2 text-sm font-semibold text-white">
            Thử lại
          </button>
        </div>
      </div>
    );
  }

  if (!isSupplierProfileDeclared(profile)) {
    return <Navigate to={ROUTES.SUPPLIER_PROFILE_DECLARE} replace />;
  }

  if (!profile) return null;

  return (
    <SupplierProfileView 
      profile={profile} 
      onEdit={() => navigate(ROUTES.SUPPLIER_PROFILE_EDIT)} 
    />
  );
};

export default SupplierProfilePage;
