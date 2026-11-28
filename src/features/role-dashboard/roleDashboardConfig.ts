import { ROLES, type Role } from "@/constants/roles";
import { ROUTES } from "@/constants/routes";
import type { ComponentProps } from "react";
import type AppIcon from "@/components/common/AppIcon";

export type IconName = ComponentProps<typeof AppIcon>["name"];
export interface RoleDashboardConfig {
  roleLabel: string;
  eyebrow: string;
  title: string;
  description: string;
  primaryAction: string;
  primaryActionRoute?: string;
  menu: ReadonlyArray<{ label: string; icon: IconName; route?: string }>;
  stats: ReadonlyArray<{
    label: string;
    value: string;
    note: string;
    icon: IconName;
    tone: "green" | "orange" | "blue" | "red";
  }>;
  tasks: ReadonlyArray<{
    title: string;
    description: string;
    status: string;
    route?: string;
  }>;
}

const commonDashboard = {
  label: "Bảng điều khiển",
  icon: "dashboard" as const,
};
export const roleDashboardConfigs: Record<
  Exclude<Role, "ADMINISTRATOR">,
  RoleDashboardConfig
> = {
  [ROLES.WAREHOUSE_MANAGER]: {
    roleLabel: "Quản lý kho",
    eyebrow: "Điều hành kho",
    title: "Tổng quan kho hàng",
    description:
      "Theo dõi tồn kho, sức chứa và chất lượng theo từng màn hình nghiệp vụ.",
    primaryAction: "Xem tồn kho",
    primaryActionRoute: ROUTES.WAREHOUSE_INVENTORY,
    menu: [
      { ...commonDashboard, route: ROUTES.WAREHOUSE_MANAGER },
      { label: "Tồn kho", icon: "database", route: ROUTES.WAREHOUSE_INVENTORY },
      {
        label: "Sức chứa kho",
        icon: "dashboard",
        route: ROUTES.WAREHOUSE_CAPACITY,
      },
      {
        label: "Phân bố chất lượng",
        icon: "clipboard",
        route: ROUTES.WAREHOUSE_QUALITY,
      },
      {
        label: "Quản lý lô hàng",
        icon: "package",
        route: ROUTES.OPERATION_PRODUCT_BATCHES,
      },
      {
        label: "Công bố lô bán",
        icon: "package",
        route: ROUTES.WAREHOUSE_SALE_OFFERS,
      },
      {
        label: "Phê duyệt đơn",
        icon: "clipboard",
        route: ROUTES.WAREHOUSE_ORDERS,
      },
      { label: "Duyệt điều chỉnh tồn", icon: "clipboard", route: ROUTES.WAREHOUSE_STOCK_ADJUSTMENTS },
      {
        label: "Hợp đồng nhà cung cấp",
        icon: "clipboard",
        route: ROUTES.WAREHOUSE_CONTRACTS,
      },
    ],
    stats: [],
    tasks: [],
  },
  [ROLES.QC_STAFF]: {
    roleLabel: "Nhân viên kiểm định",
    eyebrow: "Kiểm soát chất lượng",
    title: "Công việc kiểm định",
    description:
      "Quản lý lô chờ QC, kết quả kiểm tra và bằng chứng chất lượng.",
    primaryAction: "Tạo phiếu kiểm định",
    primaryActionRoute: ROUTES.QC_INSPECTION_NEW,
    menu: [
      { label: "Bảng điều khiển", icon: "dashboard", route: ROUTES.QC },
      {
        label: "Phiếu kiểm định",
        icon: "clipboard",
        route: ROUTES.QC_INSPECTIONS,
      },
      { label: "Tạo phiếu mới", icon: "plus", route: ROUTES.QC_INSPECTION_NEW },
      {
        label: "Theo dõi nhiệt ẩm kho",
        icon: "shield",
        route: ROUTES.QC_STORAGE_MONITORING,
      },
    ],
    stats: [
      {
        label: "Chờ kiểm định",
        value: "08",
        note: "2 ưu tiên",
        icon: "pending",
        tone: "orange",
      },
      {
        label: "Hoàn thành hôm nay",
        value: "15",
        note: "+3 so với hôm qua",
        icon: "clipboard",
        tone: "green",
      },
      {
        label: "Đạt chất lượng",
        value: "92%",
        note: "Trong 30 ngày",
        icon: "shield",
        tone: "blue",
      },
      {
        label: "Lô không đạt",
        value: "02",
        note: "Cần báo cáo",
        icon: "alert",
        tone: "red",
      },
    ],
    tasks: [
      {
        title: "Xem danh sách phiếu kiểm định",
        description: "Tra cứu, lọc và theo dõi tiến độ",
        status: "Thực hiện",
        route: ROUTES.QC_INSPECTIONS,
      },
      {
        title: "Tạo phiếu kiểm định mới",
        description: "Chọn lô hàng PENDING_QC",
        status: "Thực hiện",
        route: ROUTES.QC_INSPECTION_NEW,
      },
      {
        title: "Giám sát nhiệt ẩm lô lưu kho",
        description: "Kiểm tra và ghi nhận định kỳ chuỗi lạnh",
        status: "Thực hiện",
        route: ROUTES.QC_STORAGE_MONITORING,
      },
    ],
  },
  [ROLES.OPERATION_STAFF]: {
    roleLabel: "Nhân viên vận hành",
    eyebrow: "Vận hành kho",
    title: "Công việc vận hành",
    description: "Theo dõi xuất, nhập, soạn hàng và điều chỉnh tồn kho.",
    primaryAction: "Tạo phiếu nhập",
    menu: [
      { ...commonDashboard, route: ROUTES.OPERATION },
      { label: "Quản lý lô hàng", icon: "package", route: ROUTES.OPERATION_PRODUCT_BATCHES },
      { label: "Nhập kho", icon: "package", route: ROUTES.OPERATION_GOODS_RECEIPTS },
      { label: "Xuất kho", icon: "logout", route: ROUTES.OPERATION_GOODS_ISSUES },
      { label: "Đơn hàng chờ soạn", icon: "clipboard", route: ROUTES.OPERATION_PICKING_ORDERS },
      { label: "Điều chỉnh tồn", icon: "clipboard", route: ROUTES.OPERATION_STOCK_ADJUSTMENTS },
    ],
    stats: [],
    tasks: [],
  },
  [ROLES.SUPPLIER]: {
    roleLabel: "Nhà cung cấp",
    eyebrow: "Cổng nhà cung cấp",
    title: "Tổng quan lô hàng",
    description:
      "Khai báo lô nông sản và theo dõi tiến độ kiểm định, nhập kho.",
    primaryAction: "Khai báo lô mới",
    menu: [
      commonDashboard,
      { label: "Lô hàng của tôi", icon: "package" },
      { label: "Khai báo lô", icon: "plus" },
      {
        label: "Hợp đồng thu mua",
        icon: "clipboard",
        route: ROUTES.SUPPLIER_CONTRACTS,
      },
      { label: "Hồ sơ doanh nghiệp", icon: "users" },
    ],
    stats: [
      {
        label: "Tổng lô đã khai báo",
        value: "24",
        note: "Trong năm nay",
        icon: "package",
        tone: "green",
      },
      {
        label: "Chờ duyệt",
        value: "03",
        note: "Đang xử lý",
        icon: "pending",
        tone: "orange",
      },
      {
        label: "Đã nhập kho",
        value: "18",
        note: "75% tổng lô",
        icon: "database",
        tone: "blue",
      },
      {
        label: "Cần bổ sung",
        value: "01",
        note: "Thiếu chứng từ",
        icon: "alert",
        tone: "red",
      },
    ],
    tasks: [
      {
        title: "Bổ sung giấy chứng nhận",
        description: "Lô BATCH-DEMO-001",
        status: "Cần làm",
      },
      {
        title: "Theo dõi kiểm định",
        description: "Lô BATCH-DEMO-002 đang chờ QC",
        status: "Đang xử lý",
      },
      {
        title: "Cập nhật hồ sơ vùng trồng",
        description: "Vùng trồng Đà Lạt",
        status: "Sắp hết hạn",
      },
    ],
  },
  [ROLES.DISTRIBUTOR]: {
    roleLabel: "Nhà phân phối",
    eyebrow: "Cổng nhà phân phối",
    title: "Đơn hàng của tôi",
    description: "Mua nguyên lô, theo dõi đơn và xác nhận nhận hàng.",
    primaryAction: "Chọn lô hàng",
    primaryActionRoute: ROUTES.DISTRIBUTOR_CATALOG,
    menu: [
      commonDashboard,
      {
        label: "Lô hàng đang bán",
        icon: "package",
        route: ROUTES.DISTRIBUTOR_CATALOG,
      },
      {
        label: "Đơn hàng của tôi",
        icon: "clipboard",
        route: ROUTES.DISTRIBUTOR_ORDERS,
      },
    ],
    stats: [],
    tasks: [],
  },
};

export const adminMenu = [
  commonDashboard,
  { label: "Người dùng", icon: "users" },
  { label: "Quản lý danh mục", icon: "package", route: "/admin/categories" },
  { label: "Loại nông sản", icon: "package" },
  { label: "Tiêu chuẩn kiểm định", icon: "clipboard" },
  { label: "Duyệt hợp đồng", icon: "clipboard", route: ROUTES.ADMIN_CONTRACTS },
  { label: "Quản lý kho", icon: "database", route: ROUTES.ADMIN_WAREHOUSE_CAPACITY },
  { label: "Nhật ký hệ thống", icon: "scan" },
] as const;
export const roleLabels: Record<Role, string> = {
  [ROLES.ADMINISTRATOR]: "Quản trị viên",
  [ROLES.WAREHOUSE_MANAGER]: "Quản lý kho",
  [ROLES.QC_STAFF]: "Nhân viên kiểm định",
  [ROLES.OPERATION_STAFF]: "Nhân viên vận hành",
  [ROLES.SUPPLIER]: "Nhà cung cấp",
  [ROLES.DISTRIBUTOR]: "Nhà phân phối",
};
