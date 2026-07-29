import type {
  GhnMasterDataProvider, GhnProvince, GhnDistrict, GhnWard, GhnService, GhnShop,
  GhnFeeRequest, GhnFeeResponse, GhnCreatedOrder, GhnLeadtimeRequest, GhnLeadtimeResponse,
} from './ghn.types';
import { GHN_MAX_WEIGHT_GRAM } from './ghn.parcel';

/**
 * M-13: provider GIẢ LẬP, dùng khi chưa có tài khoản GHN.
 *
 * ⚠️ Dữ liệu địa giới dưới đây là DỮ LIỆU MẪU để chạy được luồng đặt hàng ở
 * môi trường dev. Chỉ các mã xuất hiện trong tài liệu chính thức của GHN mới
 * là mã thật (ProvinceID 201/202, DistrictID 1442/1443/1444/1452/1454); phần
 * còn lại là chỗ giữ chỗ. Khi có Token thật, chạy đồng bộ để ghi đè toàn bộ:
 *
 *     npm run ghn:sync
 *
 * Biểu phí cũng chỉ XẤP XỈ bảng giá công bố của GHN. Không dùng con số này để
 * cam kết với khách ở môi trường thật.
 */

const PROVINCES: GhnProvince[] = [
  { ProvinceID: 201, ProvinceName: 'Hà Nội', Code: '01' },
  { ProvinceID: 202, ProvinceName: 'Hồ Chí Minh', Code: '79' },
  { ProvinceID: 203, ProvinceName: 'Đà Nẵng', Code: '48' },
];

const DISTRICTS: GhnDistrict[] = [
  // Mã thật trích từ tài liệu GHN
  { DistrictID: 1442, ProvinceID: 202, DistrictName: 'Quận 1', SupportType: 3 },
  { DistrictID: 1443, ProvinceID: 202, DistrictName: 'Quận 2', SupportType: 3 },
  { DistrictID: 1444, ProvinceID: 202, DistrictName: 'Quận 3', SupportType: 3 },
  { DistrictID: 1452, ProvinceID: 202, DistrictName: 'Quận Bình Thạnh', SupportType: 3 },
  { DistrictID: 1454, ProvinceID: 202, DistrictName: 'Quận Gò Vấp', SupportType: 3 },
  // Chỗ giữ chỗ cho môi trường dev
  { DistrictID: 1482, ProvinceID: 201, DistrictName: 'Quận Ba Đình', SupportType: 3 },
  { DistrictID: 1483, ProvinceID: 201, DistrictName: 'Quận Hoàn Kiếm', SupportType: 3 },
  { DistrictID: 1490, ProvinceID: 203, DistrictName: 'Quận Hải Châu', SupportType: 3 },
  // Một quận KHÔNG giao được, để test được nhánh "GHN không giao tới đây"
  { DistrictID: 1499, ProvinceID: 203, DistrictName: 'Huyện Hoàng Sa', SupportType: 0 },
];

const WARDS: GhnWard[] = [
  { WardCode: '21012', DistrictID: 1442, WardName: 'Phường Bến Nghé' },
  { WardCode: '21013', DistrictID: 1442, WardName: 'Phường Bến Thành' },
  // Phường bị khoá trong một quận vẫn mở — để test được nhánh chặn ở cấp phường.
  { WardCode: '21014', DistrictID: 1442, WardName: 'Phường Nguyễn Thái Bình (khoá)', SupportType: 0 },
  { WardCode: '21112', DistrictID: 1443, WardName: 'Phường Thảo Điền' },
  { WardCode: '21212', DistrictID: 1444, WardName: 'Phường Võ Thị Sáu' },
  { WardCode: '21211', DistrictID: 1452, WardName: 'Phường 12' },
  { WardCode: '21311', DistrictID: 1454, WardName: 'Phường 1' },
  { WardCode: '1A0201', DistrictID: 1482, WardName: 'Phường Phúc Xá' },
  { WardCode: '1A0301', DistrictID: 1483, WardName: 'Phường Hàng Bạc' },
  { WardCode: '1B0101', DistrictID: 1490, WardName: 'Phường Thanh Bình' },
  { WardCode: '1B9901', DistrictID: 1499, WardName: 'Đảo Hoàng Sa' },
];

/** Bậc phí xấp xỉ theo bảng giá GHN (VND). */
const BASE_FEE_SAME_PROVINCE = 22_000;
const BASE_FEE_SAME_REGION   = 30_000;
const BASE_FEE_CROSS_REGION  = 36_000;
/** Phụ phí mỗi 500g vượt quá 500g đầu tiên. */
const SURCHARGE_PER_500G = 5_000;
const INCLUDED_WEIGHT_GRAM = 500;
/** Phí bảo hiểm: 0,5% giá trị khai giá. */
const INSURANCE_RATE = 0.005;

function provinceOfDistrict(districtId: number): number | null {
  return DISTRICTS.find((d) => d.DistrictID === districtId)?.ProvinceID ?? null;
}

/** Miền địa lý thô, chỉ để phân bậc phí trong bản giả lập. */
function region(provinceId: number | null): 'north' | 'central' | 'south' | null {
  if (provinceId === 201) return 'north';
  if (provinceId === 203) return 'central';
  if (provinceId === 202) return 'south';
  return null;
}

export class GhnMockProvider implements GhnMasterDataProvider {
  readonly name = 'ghn-mock';
  readonly isMock = true;

  constructor(private fromDistrictId = 1442) {}

  async getStores(): Promise<GhnShop[]> {
    return [{ _id: 1, name: 'Kho mẫu (Quận 1)', district_id: 1442, ward_code: '21012' }];
  }

  async getProvinces(): Promise<GhnProvince[]> {
    return PROVINCES;
  }

  async getDistricts(provinceId: number): Promise<GhnDistrict[]> {
    return DISTRICTS.filter((d) => d.ProvinceID === provinceId);
  }

  async getWards(districtId: number): Promise<GhnWard[]> {
    return WARDS.filter((w) => w.DistrictID === districtId);
  }

  async getAvailableServices(): Promise<GhnService[]> {
    // Ba dịch vụ tiêu chuẩn của GHN, service_id lấy từ ví dụ trong tài liệu.
    return [
      { service_id: 53319, service_type_id: 1, short_name: 'Nhanh' },
      { service_id: 53320, service_type_id: 2, short_name: 'Chuẩn' },
      { service_id: 53321, service_type_id: 3, short_name: 'Tiết kiệm' },
    ];
  }

  async createOrder(payload: Record<string, unknown>): Promise<GhnCreatedOrder> {
    // Mã giả lập nhìn giống thật (8 ký tự in hoa) nhưng có tiền tố MOCK để
    // không ai nhầm nó với vận đơn thật khi nhìn vào cơ sở dữ liệu.
    const suffix = String(payload.client_order_code ?? '').replace(/[^A-Z0-9]/gi, '').slice(-4).toUpperCase();
    return {
      order_code: `MOCK${suffix.padStart(4, '0')}`,
      expected_delivery_time: new Date(Date.now() + 3 * 86400_000).toISOString(),
      total_fee: 36000,
    };
  }

  async calculateFee(request: GhnFeeRequest): Promise<GhnFeeResponse> {
    const toProvince = provinceOfDistrict(request.to_district_id);
    if (toProvince == null) {
      throw new Error(`GHN mock: không có dữ liệu mẫu cho DistrictID ${request.to_district_id}`);
    }
    if (request.weight > GHN_MAX_WEIGHT_GRAM) {
      throw new Error('GHN mock: kiện vượt quá 30kg');
    }

    const fromProvince = provinceOfDistrict(request.from_district_id ?? this.fromDistrictId);
    let base: number;
    if (fromProvince === toProvince) base = BASE_FEE_SAME_PROVINCE;
    else if (region(fromProvince) === region(toProvince)) base = BASE_FEE_SAME_REGION;
    else base = BASE_FEE_CROSS_REGION;

    const extraBlocks = Math.max(0, Math.ceil((request.weight - INCLUDED_WEIGHT_GRAM) / 500));
    const serviceFee = base + extraBlocks * SURCHARGE_PER_500G;
    const insuranceFee = Math.round((request.insurance_value ?? 0) * INSURANCE_RATE);

    return {
      total: serviceFee + insuranceFee,
      service_fee: serviceFee,
      insurance_fee: insuranceFee,
      cod_fee: 0,
    };
  }

  async getOrderStatus(_ghnOrderCode: string) {
    // Mock: giả lập đã giao xong để test luồng đồng bộ.
    return { status: 'delivered', log: [] };
  }

  async getLeadtime(request: GhnLeadtimeRequest): Promise<GhnLeadtimeResponse> {
    // Dịch vụ khác nhau -> thời gian khác nhau (nhanh 1 ngày, chuẩn 2, tiết kiệm 4).
    const daysByService: Record<number, number> = { 53319: 1, 53320: 2, 53321: 4 };
    const days = daysByService[request.service_id] ?? 3;
    const now = Math.floor(Date.now() / 1000);
    return { leadtime: now + days * 86400, order_date: now };
  }
}
