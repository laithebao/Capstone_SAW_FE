# UC09 — Truy xuất nguồn gốc công khai

Guest dùng camera/ứng dụng quét QR bên ngoài để mở `/trace/:qrCode`. Tham số là PublicToken 64 ký tự hex thường của UC55, không phải ID hay BatchCode. Trang giữ PublicLayout, không yêu cầu đăng nhập, không có scanner web hoặc menu quản lý.

`TraceabilityPage.tsx` gọi `GET /api/public/traceability/{publicToken}` bằng `traceabilityService.ts` và `publicApiClient.ts`. Client riêng không gửi access token, không chuyển sang login/forbidden. Người đã đăng nhập nhận cùng dữ liệu công khai.

Trang dành cho người mua: tổng quan sản phẩm/kết luận QC, nguồn gốc, tiêu chuẩn áp dụng và kết quả từng tiêu chí, giải thích hạng từ kết quả đã lưu. Chỉ mở rộng tiêu chí khi người đọc chọn; số đo QC/đơn vị/ngưỡng không phải tổng số lượng lô. Optional chưa nhập hiển thị “Chưa có kết quả”. Bỏ so sánh Supplier/Staff, đóng gói kho, số kiện, tồn kho/Zone và trạng thái vận hành khỏi DTO/UI công khai. Không thay màn hình nội bộ.

BE lấy đúng phiên bản tiêu chuẩn gắn với phiếu, không lấy bản publish mới nhất. BOOLEAN chỉ đạt/không đạt; NUMBER/TEXT dùng EvaluatedGrade/IsPassed đã lưu. Ngoài khoảng, thiếu dữ liệu hoặc hạng không khớp được giải thích trung thực, không tính lại QC. Thu hoạch/hạn dùng giữ DateOnly; thời điểm hiển thị giờ Việt Nam UTC+7. Ẩn trường phụ thiếu/trùng, không lặp tên sản phẩm. Mốc nhập/xuất chỉ COMMITTED; không ngụ ý đã giao tới người mua. Không có nguồn ảnh QC được chọn công khai hoặc hướng dẫn bảo quản phù hợp nên bỏ hai phần này.

Có loading, 404, 410 và lỗi kết nối/thử lại. Đổi token remount kết quả và hủy request cũ; focus/quay lại trang tải dữ liệu mới. API quyết định QR còn được phép truy xuất.

## Chạy thử LAN

`.env` (ignored):

```dotenv
VITE_API_BASE_URL=/api
API_PROXY_TARGET=http://localhost:5252
```

Chạy BE với profile http, rồi `npm run dev` tại FE. Mở địa chỉ Network cổng 5173 từ điện thoại cùng Wi-Fi trước; sau đó quét QR trên màn hình máy tính. BE `QrCode:PublicFrontendBaseUrl` phải là địa chỉ LAN thực tế trong cấu hình local; QR đã lưu URL cũ không tự đổi. Không ghi IP một máy vào source chung. Nếu không kết nối được, kiểm tra Wi-Fi và quyền truy cập cổng 5173 qua Windows Firewall; không tắt toàn bộ firewall.

## Kiểm tra

`npm run build` và lint các file sửa; `node tests/traceability-browser.mjs` chạy Edge thật với API fixture, kiểm tra Guest/đăng nhập, mobile 375px, tiêu chí NUMBER/TEXT/NULL, ngưỡng, token đổi, loading, 404/410/500/401/403, network retry, không gửi Authorization và dashboard Operation không có nút tạo phiếu nhập. Script tự xóa profile/download tạm.

Có thể đặt `TRACEABILITY_LIVE_URL` bằng URL QR của lô hợp lệ rồi chạy cùng script để kiểm tra chỉ đọc bằng API thật và chụp ảnh mobile/desktop vào `docs/screenshots`. Đã chạy với LH-20261002-01 hạng B, DEMO_01 v1, DM_01 = 8. Không sửa dữ liệu cho ví dụ. Đây không phải thao tác quét điện thoại.

SRS UC09 cần mô tả camera ngoài → URL token → trang kết quả công khai cho người mua, whitelist tiêu chuẩn/kết quả và giới hạn giải thích hạng; bỏ đóng gói/tồn kho nội bộ. Lỗi giải mã QR thuộc camera/ứng dụng ngoài. Không sửa report trong task code.
