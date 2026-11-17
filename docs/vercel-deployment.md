# Triển khai frontend lên Vercel

Workflow `.github/workflows/deploy-vercel.yml` tự chạy khi có commit mới trên `main`, bao gồm commit do merge pull request. Có thể chạy lại thủ công bằng **Actions → Deploy frontend to Vercel → Run workflow**, chọn nhánh `main`.

## Thiết lập lần đầu

1. Trong Vercel, tạo access token có quyền triển khai project `smart-agri-warehouse-saw` thuộc tài khoản hoặc team tương ứng. Không chia sẻ token qua chat hoặc commit vào Git.
2. Trong GitHub repository, vào **Settings → Secrets and variables → Actions** và tạo repository secret `VERCEL_TOKEN` với giá trị token. Có thể dùng environment secret cùng tên trong environment `production` thay thế.
3. Đảm bảo environment `production`, nếu đã được cấu hình, cho phép deploy từ `main` và không yêu cầu duyệt thủ công nếu muốn deploy hoàn toàn tự động. Chỉ cho phép code đã được review vào `main`, vì workflow production sử dụng token triển khai.
4. Trong Vercel project, giữ `VITE_API_BASE_URL=/api` cho Production. Các biến `VITE_GOOGLE_CLIENT_ID`, `VITE_CLOUDINARY_CLOUD_NAME` và `VITE_CLOUDINARY_UPLOAD_PRESET` được cấu hình tại Vercel nếu cần các chức năng tương ứng. Không đưa mật khẩu hoặc API secret vào biến `VITE_*`, vì các biến này xuất hiện trong mã frontend.

`vercel.json` chuyển yêu cầu `/api/*` tới backend Azure và chuyển các đường dẫn giao diện về `index.html`. Sau mỗi lần thay đổi biến môi trường Vercel, cần chạy workflow lại để build mới. Kiểm tra kết quả tại tab **Actions** và trang https://smart-agri-warehouse-saw.vercel.app.
