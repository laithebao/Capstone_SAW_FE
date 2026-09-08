# Routing và quyền truy cập

## Mục đích

Chứa cấu hình route và guard của frontend.

## Chứa gì?

AppRoutes, ProtectedRoute và RoleRoute dùng `react-router`.

## Ví dụ

ProtectedRoute chuyển khách tới `/login`; RoleRoute chuyển sai vai trò tới `/403`.

## Không nên đặt ở đây

UI nghiệp vụ; backend vẫn phải tự kiểm tra quyền khi được tích hợp.
