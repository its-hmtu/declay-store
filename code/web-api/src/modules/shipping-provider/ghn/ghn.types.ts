/** M-13: kiểu dữ liệu theo đúng tài liệu GHN v2 (tên trường viết hoa như họ trả về). */

export interface GhnProvince {
  ProvinceID: number;
  ProvinceName: string;
  Code?: string;
}

export interface GhnDistrict {
  DistrictID: number;
  ProvinceID: number;
  DistrictName: string;
  /** 0:Lock 1:Take/Pay 2:Deliver 3:Take/Deliver/Pay */
  SupportType?: number;
}

export interface GhnWard {
  /**
   * ⚠️ Tài liệu GHN in WardCode dạng SỐ (510101) nhưng API tính phí nhận
   * `to_ward_code` dạng CHUỖI. Luôn ép về chuỗi khi nạp vào hệ thống.
   */
  WardCode: string | number;
  DistrictID: number;
  WardName: string;
  /** 0:Lock 1:Take/Pay 2:Deliver 3:Take/Deliver/Pay */
  SupportType?: number;
}

/**
 * Cửa hàng (điểm lấy hàng) đăng ký với GHN — /v2/shop/all.
 * Một tài khoản có thể có nhiều kho; mỗi kho là một "shop".
 */
export interface GhnShop {
  _id: number;
  name?: string;
  address?: string;
  district_id: number;
  ward_code: string | number;
}

/** Phản hồi /v2/shipping-order/available-services */
export interface GhnService {
  service_id: number;
  service_type_id: number;
  short_name?: string;
}

/** Tham số API /v2/shipping-order/fee. */
export interface GhnFeeRequest {
  from_district_id?: number;
  from_ward_code?: string;
  to_district_id: number;
  to_ward_code: string;
  service_type_id?: number;
  service_id?: number;
  weight: number;   // gram
  length: number;   // cm
  width: number;    // cm
  height: number;   // cm
  insurance_value?: number;
  cod_value?: number;
}

/** Phần `data` trong phản hồi thành công. */
export interface GhnFeeResponse {
  total: number;
  service_fee: number;
  insurance_fee: number;
  cod_fee?: number;
  pick_remote_areas_fee?: number;
  deliver_remote_areas_fee?: number;
}

export interface GhnMasterDataProvider {
  readonly name: string;
  readonly isMock: boolean;
  /** Kho lấy hàng đã đăng ký — cần để biết ĐIỂM ĐI của tuyến. */
  getStores(): Promise<GhnShop[]>;
  getProvinces(): Promise<GhnProvince[]>;
  getDistricts(provinceId: number): Promise<GhnDistrict[]>;
  getWards(districtId: number): Promise<GhnWard[]>;
  /** Dịch vụ khả dụng cho tuyến cụ thể — không tuyến nào cũng có đủ dịch vụ. */
  getAvailableServices(fromDistrictId: number, toDistrictId: number): Promise<GhnService[]>;
  calculateFee(request: GhnFeeRequest): Promise<GhnFeeResponse>;
}
