# Smart Agri-Warehouse Frontend

Frontend cho **Smart Agri-Warehouse (SAW)**, dự án capstone SEP490 của nhóm 5 sinh viên FPT University. Hệ thống hỗ trợ quản lý kho nông sản, lô hàng, kiểm định chất lượng, tồn kho, đơn hàng và truy xuất nguồn gốc QR.

Đây là **bộ khung ban đầu**: routing, phân quyền phía frontend, layout, page placeholder và cấu hình API. Các màn hình nghiệp vụ, giao diện Stitch, dữ liệu và backend chưa được triển khai. Backend dự kiến dùng ASP.NET Core Web API và Microsoft SQL Server.

## Công nghệ và yêu cầu

- Node.js **22 LTS, từ 22.22.0 trở lên trong nhánh 22.x**, cùng npm. `.nvmrc` ghi nhánh `22`; `package.json` khai báo phiên bản Node được hỗ trợ.
- React 19.2, TypeScript 5.9, Vite 8 và Tailwind CSS v4.
- React Router 8 (import từ `react-router`), Axios.
- React Hook Form, Zod, `@hookform/resolvers` đã cài để dùng cho form sau này.
- ESLint kiểm tra mã nguồn; chưa có UI library hoặc thư viện quản lý state bổ sung.

TypeScript 5.9 được chọn để tương thích với bộ lint hiện tại. Dùng `package-lock.json` để cả nhóm cài cùng bộ phiên bản.

## Cài đặt và chạy

Thực hiện ngay tại thư mục repository chứa file này:

```bash
node --version
npm install
```

Tạo cấu hình môi trường bằng PowerShell:

```powershell
Copy-Item .env.example .env
```

Trên macOS/Linux dùng `cp .env.example .env`. Nội dung mẫu:

```dotenv
VITE_API_BASE_URL=http://localhost:5000/api
```

Đây chỉ là địa chỉ cấu hình cho backend trong tương lai; ứng dụng hiện không gọi API. `.env` được Git bỏ qua; `.env.example` được theo dõi. Mọi biến `VITE_*` có thể xuất hiện trong mã frontend nên không chứa mật khẩu hoặc khóa bí mật.

```bash
npm run dev
```

Mở địa chỉ Vite hiển thị trong terminal (thường là `http://localhost:5173`). `/` chuyển tới `/login` khi chưa đăng nhập. Chưa có form đăng nhập hoặc tài khoản mẫu.

```bash
npm run lint
npm run build
npm run preview
```

`build` kiểm tra TypeScript trước khi tạo `dist/`. `preview` xem thử bản build trên máy. Khi triển khai lên hosting, cần cấu hình SPA fallback về `index.html` để mở trực tiếp các đường dẫn con.

## Cấu trúc chính

```text
src/
  assets/       # images/, icons/: tài nguyên tĩnh
  components/   # common/, layout/: các phần UI dùng lại
  layouts/      # AuthLayout, DashboardLayout, PublicLayout
  pages/        # auth/, admin/, warehouse-manager/, qc/, operation/
                # supplier/, distributor/, traceability/, system/
  services/     # Axios client và service theo nghiệp vụ
  contexts/     # AuthContext
  hooks/        # useAuth và hook dùng lại
  routes/       # Route và guard đăng nhập/phân quyền
  types/        # Kiểu TypeScript dùng chung
  constants/    # Vai trò, đường dẫn, trạng thái tải UI
  utils/        # Hàm định dạng ngày và số
  App.tsx
  main.tsx
  index.css
```

Mỗi thư mục nguồn đều có README tiếng Việt giải thích trách nhiệm. Page chia chủ yếu **theo vai trò** để dễ đối chiếu SRS và phân công. Component dùng chung đặt trong `components/`; API đặt trong `services/`; type chung đặt trong `types/`. State riêng của màn hình giữ tại page.

Alias `@/*` trỏ tới `src/*` trong cả TypeScript và Vite, ví dụ `import { useAuth } from '@/hooks/useAuth'`.

Quy ước: component dùng `PascalCase.tsx`, page dùng `XxxPage.tsx`, hook dùng `useXxx.ts`, service dùng `xxxService.ts`, thư mục dùng chữ thường hoặc kebab-case.

## Routing và xác thực

| Đường dẫn | Quyền truy cập |
| --- | --- |
| `/login` | Công khai |
| `/trace/:qrCode` | Công khai, Guest không cần đăng nhập |
| `/admin` | `ADMINISTRATOR` |
| `/warehouse-manager` | `WAREHOUSE_MANAGER` |
| `/qc` | `QC_STAFF` |
| `/operation` | `OPERATION_STAFF` |
| `/supplier` | `SUPPLIER` |
| `/distributor` | `DISTRIBUTOR` |
| `/403` | Thông báo không có quyền truy cập |
| `*` | Trang không tìm thấy |

Guest không phải vai trò xác thực. ProtectedRoute chuyển người chưa đăng nhập tới `/login`; RoleRoute chuyển người đã đăng nhập nhưng sai vai trò tới `/403`.

AuthContext cung cấp `user`, `accessToken`, `isAuthenticated`, `login(session)` và `logout()`. `login(session)` chỉ nhận phiên sau khi API xác thực thật được tích hợp, không gọi API hay tự tạo người dùng. Phiên và Bearer token chỉ giữ trong bộ nhớ; tải lại trang sẽ trở về trạng thái chưa đăng nhập. `logout()` xóa cả phiên và token dùng bởi Axios.

Các service nghiệp vụ và type miền đang là placeholder chờ hợp đồng API. `ApiResponse<T>` và `PagedResponse<T>` chỉ là kiểu nền tảng đề xuất. Backend cần xác thực và kiểm tra quyền độc lập; guard frontend chỉ điều khiển điều hướng.

## Làm việc với Git

1. Cập nhật nhánh chung theo quy ước của nhóm, rồi tạo nhánh riêng: `git switch -c feat/ten-cong-viec`.
2. Làm đúng phạm vi được giao; đọc README của thư mục trước khi thêm file.
3. Chạy `npm run lint` và `npm run build` trước khi tạo pull request.
4. Kiểm tra `git status` và `git diff`; commit những file cần thiết, gồm `package-lock.json` khi đổi dependency.
5. Push nhánh riêng, mở pull request để thành viên khác review rồi mới merge.

Không commit `.env`, bí mật, `node_modules/` hoặc `dist/`. Không tự sửa lịch sử Git của nhánh chung. Sau khi lấy thay đổi dependency từ đồng đội, chạy `npm install`; có thể dùng `npm ci` khi cần cài lại đúng lockfile.

## Tài liệu cấu hình

- [Vite: khởi tạo và cấu hình](https://vite.dev/guide/)
- [Tailwind CSS v4: tích hợp Vite](https://tailwindcss.com/docs/installation/using-vite)
- [React Router: Declarative mode](https://reactrouter.com/start/declarative/installation)
