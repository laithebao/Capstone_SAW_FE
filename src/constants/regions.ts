// src/constants/regions.ts

export interface RegionGroup {
  region: string;
  provinces: string[];
}

export const VIETNAM_REGIONS: RegionGroup[] = [
  {
    region: 'Miền Bắc',
    provinces: [
      'Hà Nội', 'Hải Phòng', 'Bắc Ninh', 'Hưng Yên', 'Ninh Bình',
      'Phú Thọ', 'Thái Nguyên', 'Lào Cai', 'Tuyên Quang', 'Lạng Sơn',
      'Cao Bằng', 'ĐIện Biên', 'Lai Châu', 'Sơn La', 'Quảng Ninh'
    ]
  },
  {
    region: 'Miền Trung & Tây Nguyên',
    provinces: [
      'Thanh Hóa', 'Nghệ An', 'Hà Tĩnh', 'Quảng Trị', 'Thừa Thiên Huế',
      'Đà Nẵng', 'Quảng Ngãi', 'Gia Lai', 'Khánh Hòa', 'Đắk Lắk', 'Lâm Đồng'
    ]
  },
  {
    region: 'Miền Nam',
    provinces: [
      'TP. Hồ Chí Minh', 'Đồng Nai', 'Tây Ninh', 'Cần Thơ',
      'Vĩnh Long', 'Đồng Tháp', 'An Giang', 'Cà Mau'
    ]
  }
];