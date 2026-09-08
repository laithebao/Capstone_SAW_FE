# Giao tiếp API

## Mục đích

Chứa code giao tiếp với ASP.NET Core Web API, chia theo nghiệp vụ.

## Chứa gì?

`apiClient.ts` cấu hình Axios; các service còn lại đang chờ hợp đồng API.

## Ví dụ

Khi có endpoint đã thống nhất, `batchService.ts` phải dùng `apiClient` để gọi API lô hàng.

## Không nên đặt ở đây

JSX, React component, state giao diện, endpoint tự đoán hoặc response giả.
