import React from 'react';
import { Navigate, Outlet, useLocation } from 'react-router';
import { isSupplierProfileDeclared } from '@/features/supplier/profileStatus';
import { useSupplierProfile } from '@/features/supplier/useSupplierProfile';
import { ROUTES } from '@/constants/routes';

export const SupplierGuard: React.FC = () => {
  const location = useLocation();
  const { loading, profile, error, retry } = useSupplierProfile(location.pathname);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-sm font-medium text-gray-500">Đang kiểm tra thông tin nhà cung cấp...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div role="alert" className="max-w-xl mx-auto my-12 p-6 bg-red-50 border border-red-200 rounded-xl text-red-700">
        <h3 className="font-semibold">Không thể kiểm tra hồ sơ nhà cung cấp</h3>
        <p className="text-sm mt-1">{error}</p>
        <button type="button" onClick={retry} className="mt-4 rounded-lg bg-red-700 px-4 py-2 text-sm font-semibold text-white">
          Thử lại
        </button>
      </div>
    );
  }

  const isDeclared = isSupplierProfileDeclared(profile);
  const isDeclarePage = location.pathname === ROUTES.SUPPLIER_PROFILE_DECLARE;

  // 1. Chưa khai báo mà cố truy cập các trang khác -> Redirect về trang Declare
  if (!isDeclared && !isDeclarePage) {
    return <Navigate to={ROUTES.SUPPLIER_PROFILE_DECLARE} replace />;
  }

  // 2. Đã khai báo thành công mà cố vào trang Declare -> Redirect về Edit
  if (isDeclared && isDeclarePage) {
    return <Navigate to={ROUTES.SUPPLIER_PROFILE_EDIT} replace />;
  }

  return <Outlet />;
};
