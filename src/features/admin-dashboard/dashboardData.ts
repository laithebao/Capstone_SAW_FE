export type DashboardTone = 'green' | 'orange' | 'blue' | 'red'
export const dashboardStats = [
  { label: 'Tổng tài khoản', value: '1,284', icon: 'users', tone: 'green', note: '+12% so với tháng trước' },
  { label: 'Tài khoản chờ duyệt', value: '28', icon: 'pending', tone: 'orange', note: 'Ưu tiên cao' },
  { label: 'Dữ liệu danh mục', value: '156', icon: 'database', tone: 'blue', note: 'Đang hoạt động' },
  { label: 'Cảnh báo hệ thống', value: '03', icon: 'alert', tone: 'red', note: 'Cần xử lý ngay' },
] as const
export const weeklyActivity = [42, 58, 51, 72, 66, 89, 76]
export const weekLabels = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN']
export const roleDistribution = [
  { label: 'Nhân viên kho', value: 45, color: '#087f5b' },
  { label: 'Nhà cung cấp', value: 30, color: '#6366f1' },
  { label: 'Nhà phân phối', value: 25, color: '#14b8a6' },
]
export const pendingTasks = [
  { title: 'Duyệt 12 tài khoản mới', description: 'Hồ sơ đăng ký đang chờ xác minh', badge: 'Hết hạn hôm nay', tone: 'red' },
  { title: 'Cập nhật bộ tiêu chuẩn QC', description: 'Tiêu chuẩn rau củ phiên bản 2.1', badge: 'Chờ xử lý', tone: 'orange' },
  { title: 'Rà soát phân quyền người dùng', description: 'Có 4 tài khoản thay đổi vai trò', badge: 'Thủ tục', tone: 'neutral' },
] as const
export const recentActivities = [
  { title: 'Kích hoạt tài khoản thành công', description: 'Tài khoản manager@saw.local đã được kích hoạt', time: '10 phút trước', tone: 'green' },
  { title: 'Cập nhật loại nông sản', description: 'Đã cập nhật thông tin Khoai tây Đà Lạt', time: '45 phút trước', tone: 'orange' },
  { title: 'Phát hiện đăng nhập bất thường', description: '5 lần đăng nhập sai từ một địa chỉ IP', time: '1 giờ trước', tone: 'red' },
] as const
