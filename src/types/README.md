# Kiểu dữ liệu dùng chung

## Mục đích

Chứa type và interface TypeScript được dùng ở nhiều nơi.

## Chứa gì?

User, Role, AuthSession, ApiResponse và PagedResponse; các file nghiệp vụ đang chờ hợp đồng.

## Ví dụ

`ApiResponse<T>` là kiểu nền tảng đề xuất, cần đối chiếu response thật trước khi dùng.

## Không nên đặt ở đây

Lệnh gọi API, React component, UI logic hoặc hàng loạt trường dữ liệu tự đoán.
