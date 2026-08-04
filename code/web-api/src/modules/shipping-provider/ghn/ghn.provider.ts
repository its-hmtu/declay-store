import config from '@/config/env';
import { logger } from '@/lib/logger';
import { httpError } from '@/utils/http-error';
import { assertOperationAllowed, GhnPermissionError, type GhnMode } from './ghn.mode';
import type {
  GhnMasterDataProvider, GhnProvince, GhnDistrict, GhnWard, GhnService, GhnShop,
  GhnFeeRequest, GhnFeeResponse, GhnCreatedOrder, GhnLeadtimeRequest, GhnLeadtimeResponse,
  GhnCancelResult,
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
    /**
     * 'readonly' cho phép tra cứu + tính phí;
     * 'preview' gọi endpoint preview của GHN (không tạo đơn);
     * 'live' mới tạo vận đơn thật.
     */
    private mode: GhnMode = 'readonly',
  ) {}

  // ShopId thực dùng: ưu tiên shop lấy từ /v2/shop/all (chắc chắn thuộc tài
  // khoản token) hơn GHN_SHOP_ID trong .env — env dễ lệch khi đổi token, và
  // ShopId lệch tài khoản làm fee/create trả 404.
  private effectiveShopId: string | undefined;

  setEffectiveShopId(id: string | number): void {
    this.effectiveShopId = String(id);
  }

  private get shopIdHeader(): string {
    return this.effectiveShopId ?? this.shopId;
  }

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
          ShopId: this.shopIdHeader,
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
      // 404 trên fee/available-services (khi master-data lại chạy được) gần như
      // luôn là LỆCH MÔI TRƯỜNG: token/shop của môi trường này, URL của môi
      // trường kia. Nói thẳng để không phải mò lần sau.
      const envMismatch = response.status === 404
        && /shipping-order\/(fee|available-services)/.test(path);
      if (envMismatch) {
        logger.error('GHN 404 — nhiều khả năng LỆCH MÔI TRƯỜNG token/URL', {
          path, baseUrl: this.baseUrl,
          hint: 'Token khachhang.ghn.vn (production) phải đi với online-gateway.ghn.vn; '
            + 'token 5sao.ghn.dev (staging) phải đi với dev-online-gateway.ghn.vn.',
        });
      } else {
        logger.warn('GHN returned an error', {
          path, status: response.status, code: payload?.code, message: payload?.message,
        });
      }
      throw httpError(502, `GHN: ${payload?.message ?? `HTTP ${response.status}`}`);
    }
    return payload.data as T;
  }

  async getStores(): Promise<GhnShop[]> {
    const data = await this.call<{ shops?: GhnShop[] }>('/v2/shop/all', {
      offset: 0, limit: 50, client_phone: '',
    });
    const shops = data?.shops ?? [];
    if (shops.length > 0) {
      const match = shops.find((sh) => String(sh._id) === String(this.shopId));
      this.setEffectiveShopId((match ?? shops[0])._id);
    }
    return shops;
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
        shop_id: Number(this.shopIdHeader),
        from_district: fromDistrictId,
        to_district: toDistrictId,
      })) ?? []
    );
  }

  /**
   * ⚠️ Tạo vận đơn THẬT. Bị `assertOperationAllowed` chặn trừ khi mode = 'live'.
   * `client_order_code` trong payload khiến việc gọi lại an toàn: GHN trả về
   * vận đơn cũ thay vì tạo thêm cái mới.
   */
  async createOrder(payload: Record<string, unknown>): Promise<GhnCreatedOrder> {
    // Chế độ preview dùng ĐÚNG payload này nhưng gửi tới endpoint preview:
    // GHN kiểm tra địa chỉ, dịch vụ, giới hạn cân/kích thước, tính phí và ngày
    // giao dự kiến y như thật — chỉ không tạo vận đơn và không tính cước.
    const path = this.mode === 'preview'
      ? '/v2/shipping-order/preview'
      : '/v2/shipping-order/create';
    return this.call<GhnCreatedOrder>(path, payload);
  }

  /**
   * ⚠️ THAO TÁC GHI: huỷ vận đơn (M-29c). Bị `assertOperationAllowed` chặn trừ
   * khi mode = 'live'. GHN trả về mảng kết quả theo từng mã; `result: true` là
   * huỷ thành công. Không huỷ được thường vì GHN ĐÃ lấy hàng — lúc đó cần chuyển
   * sang luồng hoàn hàng, không phải huỷ.
   */
  async cancelOrder(ghnOrderCode: string): Promise<GhnCancelResult> {
    const data = await this.call<Array<{ order_code?: string; result?: boolean; message?: string }>>(
      '/v2/switch-status/cancel', { order_codes: [ghnOrderCode] },
    );
    const row = Array.isArray(data) ? data[0] : (data as { result?: boolean; message?: string } | null);
    return {
      orderCode: ghnOrderCode,
      success: row?.result === true,
      message: row?.message ?? null,
      raw: data,
    };
  }

  async calculateFee(request: GhnFeeRequest): Promise<GhnFeeResponse> {
    return this.call<GhnFeeResponse>('/v2/shipping-order/fee', buildFeeRequestBody(request, {
      fromDistrictId: config.ghn.fromDistrictId,
      fromWardCode: config.ghn.fromWardCode,
      serviceTypeId: config.ghn.serviceTypeId,
    }));
  }

  async getLeadtime(request: GhnLeadtimeRequest): Promise<GhnLeadtimeResponse> {
    return this.call<GhnLeadtimeResponse>('/v2/shipping-order/leadtime', request);
  }

  async getOrderStatus(ghnOrderCode: string) {
    // detail trả về data có thể là object hoặc mảng tuỳ phiên bản — chuẩn hoá.
    const data = await this.call<any>('/v2/shipping-order/detail', { order_code: ghnOrderCode });
    const info = Array.isArray(data) ? data[0] : data;
    if (!info?.status) return null;
    return { status: String(info.status), log: info.log };
  }
}

/**
 * Cảnh báo cấu hình URL.
 *
 * Trước đây hàm này NÉM LỖI khi URL không khớp cờ sandbox. Cách đó sai: an toàn
 * thuộc về ghn.mode.ts (chặn theo quyền thao tác), không thuộc về URL. Nay hàm
 * chỉ còn cảnh báo cho các URL bất thường.
 *
 * `dev-online-gateway.ghn.vn` là môi trường STAGING chính thức của GHN — hợp lệ
 * nếu token của bạn là token staging. Ở đó `create` không tạo vận đơn thật và
 * không tính cước thật, nên đây là nơi test lý tưởng.
 */
export const GHN_STAGING_HINT =
  'GHN_BASE_URL đang dùng dev-online-gateway.ghn.vn (staging). Chỉ hoạt động với '
  + 'token staging (đăng ký tại 5sao.ghn.dev); token production sẽ trả 401/403.';

export function warnIfSuspiciousBaseUrl(baseUrl: string): string | null {
  if (baseUrl.includes('dev-online-gateway')) {
    return GHN_STAGING_HINT;
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
