import config from '@/config/env';
import { logger } from '@/lib/logger';
import { httpError } from '@/utils/http-error';
import { assertOperationAllowed, GhnPermissionError, type GhnMode } from './ghn.mode';
import type {
  GhnMasterDataProvider, GhnProvince, GhnDistrict, GhnWard, GhnService, GhnShop, GhnFeeRequest, GhnFeeResponse,
} from './ghn.types';

/**
 * M-13: GHN API v2 thật.
 *
 * Môi trường dev và production dùng URL KHÁC NHAU (khác với VNPay). Token của
 * môi trường nào chỉ chạy được ở URL môi trường đó, nên `GHN_BASE_URL` phải
 * khớp với token — nhầm lẫn ở đây sẽ tạo vận đơn thật và bị tính tiền thật.
 */
export const GHN_DEV_BASE_URL = 'https://dev-online-gateway.ghn.vn';
export const GHN_PROD_BASE_URL = 'https://online-gateway.ghn.vn';

export class GhnProvider implements GhnMasterDataProvider {
  readonly name = 'ghn';
  readonly isMock = false;

  constructor(
    private token: string,
    private shopId: string,
    private baseUrl: string,
    /** 'readonly' cho phép tra cứu + tính phí; 'live' mới tạo được vận đơn. */
    private mode: GhnMode = 'readonly',
  ) {}

  private async call<T>(path: string, body: unknown, method: 'GET' | 'POST' = 'POST'): Promise<T> {
    // Chặn TRƯỚC khi gói tin rời máy chủ: thao tác tạo vận đơn phát sinh cước
    // thật, không có cách nào hoàn tác bằng cách bắt lỗi ở phía sau.
    try {
      assertOperationAllowed(this.mode, path);
    } catch (err) {
      if (err instanceof GhnPermissionError) throw httpError(403, err.message);
      throw err;
    }

    const url = `${this.baseUrl}/shiip/public-api${path}`;
    let response: Response;
    try {
      response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Token: this.token,
          ShopId: this.shopId,
        },
        ...(method === 'POST' ? { body: JSON.stringify(body) } : {}),
        signal: AbortSignal.timeout(10_000),
      });
    } catch (err) {
      // Mạng lỗi/timeout: KHÔNG để lỗi thô rơi xuống checkout.
      // Timeout thường có nghĩa GHN_BASE_URL trỏ vào gateway đã ngừng hoạt động.
      logger.error('GHN request failed', { path, baseUrl: this.baseUrl, error: (err as Error).message });
      throw httpError(503, 'Không kết nối được đơn vị vận chuyển. Vui lòng thử lại.');
    }

    const payload = (await response.json().catch(() => null)) as
      | { code?: number; message?: string; data?: T }
      | null;

    if (!response.ok || !payload || payload.code !== 200) {
      logger.warn('GHN returned an error', {
        path, status: response.status, code: payload?.code, message: payload?.message,
      });
      throw httpError(502, `GHN: ${payload?.message ?? `HTTP ${response.status}`}`);
    }
    return payload.data as T;
  }

  async getStores(): Promise<GhnShop[]> {
    const data = await this.call<{ shops?: GhnShop[] }>('/v2/shop/all', {
      offset: 0, limit: 50, client_phone: '',
    });
    return data?.shops ?? [];
  }

  async getProvinces(): Promise<GhnProvince[]> {
    return (await this.call<GhnProvince[]>('/master-data/province', {}, 'GET')) ?? [];
  }

  async getDistricts(provinceId: number): Promise<GhnDistrict[]> {
    return (await this.call<GhnDistrict[]>('/master-data/district', { province_id: provinceId })) ?? [];
  }

  async getWards(districtId: number): Promise<GhnWard[]> {
    return (await this.call<GhnWard[]>('/master-data/ward', { district_id: districtId })) ?? [];
  }

  async getAvailableServices(fromDistrictId: number, toDistrictId: number): Promise<GhnService[]> {
    return (
      (await this.call<GhnService[]>('/v2/shipping-order/available-services', {
        // shop_id ở ĐÂY là số, khác với header ShopId dạng chuỗi.
        shop_id: Number(this.shopId),
        from_district: fromDistrictId,
        to_district: toDistrictId,
      })) ?? []
    );
  }

  async calculateFee(request: GhnFeeRequest): Promise<GhnFeeResponse> {
    return this.call<GhnFeeResponse>('/v2/shipping-order/fee', buildFeeRequestBody(request, {
      fromDistrictId: config.ghn.fromDistrictId,
      fromWardCode: config.ghn.fromWardCode,
      serviceTypeId: config.ghn.serviceTypeId,
    }));
  }
}

/**
 * Cảnh báo cấu hình URL.
 *
 * Trước đây hàm này NÉM LỖI khi URL không khớp cờ sandbox. Cách đó đã sai khi
 * môi trường dev của GHN ngừng hoạt động: cấu hình "đúng" theo luật cũ lại làm
 * toàn bộ tính năng chết. Nay việc chặn tạo vận đơn do ghn.mode.ts đảm nhiệm —
 * hàm này chỉ còn cảnh báo để không ai im lặng gọi vào một gateway đã chết.
 */
export function warnIfSuspiciousBaseUrl(baseUrl: string): string | null {
  if (baseUrl.includes('dev-online-gateway')) {
    return 'GHN_BASE_URL đang trỏ vào dev-online-gateway.ghn.vn — gateway này đã ngừng phản hồi. '
      + 'Dùng https://online-gateway.ghn.vn (tính phí là thao tác chỉ đọc, không tạo vận đơn).';
  }
  if (!baseUrl.includes('ghn.vn')) {
    return `GHN_BASE_URL không phải tên miền ghn.vn: ${baseUrl}`;
  }
  return null;
}

/**
 * Dựng payload cho /v2/shipping-order/fee. Tách riêng thành hàm thuần vì đây
 * đúng là chỗ đã có lỗi: ban đầu `...request` đặt SAU các giá trị mặc định nên
 * `service_type_id: undefined` trong request ghi đè mất giá trị mặc định, và
 * GHN trả lỗi "thiếu service".
 *
 * Luật của GHN: phải có MỘT trong hai — `service_id` hoặc `service_type_id`.
 * Có `service_id` (lấy từ available-services, chính xác theo tuyến) thì ưu tiên.
 */
export function buildFeeRequestBody(
  request: GhnFeeRequest,
  defaults: { fromDistrictId?: number; fromWardCode?: string; serviceTypeId: number },
): GhnFeeRequest {
  const body: GhnFeeRequest = { ...request };

  // Không truyền điểm lấy hàng thì GHN dùng kho mặc định của ShopId.
  if (body.from_district_id == null && defaults.fromDistrictId) {
    body.from_district_id = defaults.fromDistrictId;
  }
  if (body.from_ward_code == null && defaults.fromWardCode) {
    body.from_ward_code = defaults.fromWardCode;
  }

  if (request.service_id) {
    delete body.service_type_id;   // gửi cả hai là lỗi tham số
  } else {
    body.service_type_id = request.service_type_id ?? defaults.serviceTypeId;
    delete body.service_id;
  }

  return body;
}
