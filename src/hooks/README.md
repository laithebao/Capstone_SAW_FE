# Custom hook

## Mục đích

Chứa custom React hook có thể tái sử dụng.

## Chứa gì?

`useAuth.ts` đọc AuthContext và báo lỗi nếu thiếu AuthProvider.

## Ví dụ

`const { user, logout } = useAuth()` trong component con của AuthProvider.

## Không nên đặt ở đây

React page, hàm tiện ích thuần hoặc hook có tên không bắt đầu bằng `use`.
