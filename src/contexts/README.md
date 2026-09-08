# State dùng chung

## Mục đích

Chứa Context cho state cần chia sẻ giữa nhiều màn hình.

## Chứa gì?

AuthContext cung cấp user, accessToken, isAuthenticated, login và logout.

## Ví dụ

`login(session)` nhận kết quả xác thực thật trong tương lai; hiện chưa có nơi gọi và chưa lưu phiên.

## Không nên đặt ở đây

Mọi state của ứng dụng; state riêng của màn hình nên giữ tại page.
