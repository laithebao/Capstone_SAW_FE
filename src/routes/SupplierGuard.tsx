import React, { useEffect, useState } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router';
import { supplierService } from '@/services/suppliers/supplierService';
import type { SupplierProfileResponse } from '@/types/supplier';
import { ROUTES } from '@/constants/routes';

export const SupplierGuard: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<SupplierProfileResponse | null>(null);
  const location = useLocation();

  useEffect(() => {
    let isMounted = true;
    const checkProfileStatus = async () => {
      try {
        const data = await supplierService.getMyProfile();
        if (isMounted) setProfile(data);
      } catch (error) {
        console.error('Không thể lấy thông tin profile Supplier:', error);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    checkProfileStatus();
    return () => {
      isMounted = false;
    };
  }, [location.pathname]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-sm font-medium text-gray-500">Đang kiểm tra thông tin nhà cung cấp...</div>
      </div>
    );
  }

  // Kiểm tra nếu phoneNumber trống -> Chưa khai báo hồ sơ
  const isDeclared = Boolean(profile?.phoneNumber && profile.phoneNumber.trim() !== '');
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