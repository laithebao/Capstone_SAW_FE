# Truy xuất nguồn gốc

## Mục đích

Chứa màn hình truy xuất nguồn gốc sản phẩm qua mã QR.

## Chứa gì?

TraceabilityPage đọc tham số `qrCode` từ URL; chưa tải dữ liệu.

## Ví dụ

`/trace/:qrCode` là route công khai, Guest truy cập không cần đăng nhập.

## Không nên đặt ở đây

Route guard đăng nhập, QR scanner hoặc tích hợp nền tảng truy xuất bên thứ ba.
