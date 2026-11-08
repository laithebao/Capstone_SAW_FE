# Hàm tiện ích

## Mục đích

Chứa hàm thuần có thể dùng lại, không phụ thuộc React.

## Chứa gì?

`formatDate.ts` và `formatNumber.ts` dùng định dạng `vi-VN` mặc định.

## Ví dụ

`formatNumber(1234)` định dạng số; `formatDate` nhận Date hoặc chuỗi ngày ISO hợp lệ.

## Không nên đặt ở đây

React component, API hoặc quy trình nghiệp vụ lớn.
