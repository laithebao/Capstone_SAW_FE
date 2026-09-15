# Màn hình xác thực

## Mục đích

Chứa các màn hình liên quan đến tài khoản và đăng nhập.

## Chứa gì?

Hiện có `LoginPage` và `RegisterPage`. Hai page chỉ ghép component trình bày;
schema validation nằm trong `features/auth/schemas`, còn việc gọi API sẽ nằm trong
`services/authService.ts` khi Backend sẵn sàng.

## Ví dụ

`LoginPage`, `RegisterPage`; chỉ thêm `ForgotPasswordPage` khi đến phạm vi được giao.

## Không nên đặt ở đây

AuthContext, route guard hoặc code gọi API trực tiếp.
