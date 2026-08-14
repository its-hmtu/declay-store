import config from '@/config/env';
import { logger } from '@/lib/logger';
import { httpError } from '@/utils/http-error';
import { GhnProvinceModel, GhnDistrictModel, GhnWardModel, GhnServiceModel } from './ghn.entity';
import { GhnProvider, warnIfSuspiciousBaseUrl } from './ghn.provider';
import { resolveGhnMode, describeMode, PREVIEW_TRACKING_PREFIX, type GhnMode } from './ghn.mode';
import { GhnMockProvider } from './ghn.mock';
import type { GhnMasterDataProvider } from './ghn.types';
import { buildParcel, type ParcelItemInput } from './ghn.parcel';
import { buildCreateOrderPayload, buildReturnOrderPayload, type CreateOrderInput, type ReturnOrderInput } from './ghn.order';
import { applyFeePolicy, quoteBlockedReason, districtSupportsDelivery, type QuoteBlockedReason } from './ghn.fee';
import { serviceMeta, serviceSortWeight, leadtimeDays } from './ghn.services-meta';

/**
 * M-13: chọn provider.
 * Không có Token/ShopId thì chạy bản giả lập — cửa hàng vẫn đặt được đơn ở môi
 * trường dev, và không bao giờ im lặng gọi nhầm API thật.
 */
export function createGhnProvider(): GhnMasterDataProvider {
  const { token, shopId, baseUrl, allowWrite } = config.ghn;
  const mode = resolveGhnMode({ token, shopId, allowWrite, modeOverride: config.ghn.mode });

  if (mode === 'mock') {
    logger.warn(describeMode(mode));
    return new GhnMockProvider(config.ghn.fromDistrictId || undefined);
  }

  const warning = warnIfSuspiciousBaseUrl(baseUrl);
  if (warning) logger.warn(warning);
  logger.info(describeMode(mode), { baseUrl });

  return new GhnProvider(token, shopId, baseUrl, mode);
}

export interface ShippingQuote {
  available: boolean;
  reason: QuoteBlockedReason | null;
  /** Phí khách phải trả (VND). */
  feeVnd: number;
  carrierFeeVnd: number;
  freeShipping: boolean;
  weightGram: number;
  /** True khi phải dùng cân nặng mặc định — admin cần khai số thật. */
  usedDefaultWeight: boolean;
  carrier: string;
  /** Chỉ có ở môi trường không phải production: thông điệp lỗi gốc từ GHN. */
  debugMessage?: string;
}

export interface ShippingOption {
  serviceId: number;
  serviceTypeId: number;
  name: string;
  description: string;
  feeVnd: number;
  freeShipping: boolean;
  leadtimeAt: number | null;
  leadtimeDays: number | null;
}

export interface ShippingOptionsResult {
  available: boolean;
  reason: QuoteBlockedReason | null;
  options: ShippingOption[];
  weightGram: number;
  usedDefaultWeight: boolean;
  debugMessage?: string;
}

export default class GhnService {
  private provider: GhnMasterDataProvider;
  readonly mode: GhnMode;

  constructor(provider?: GhnMasterDataProvider) {
    this.provider = provider ?? createGhnProvider();
    this.mode = resolveGhnMode({
      token: config.ghn.token,
      shopId: config.ghn.shopId,
      allowWrite: config.ghn.allowWrite,
      modeOverride: config.ghn.mode,
    });
  }

  get isMock(): boolean {
    return this.provider.isMock;
  }

  /** M-26: trạng thái hiện tại của vận đơn (Order Info) — chỉ đọc. */
  async getOrderStatus(ghnOrderCode: string) {
    return this.provider.getOrderStatus(ghnOrderCode);
  }

  /**
   * M-29c: huỷ vận đơn GHN.
   *
   * Bỏ qua gọi GHN cho vận đơn KHÔNG có thật: chế độ mock, và vận đơn preview
   * (mã có tiền tố PREVIEW-) — chúng chưa từng tồn tại bên GHN nên "huỷ" chỉ là
   * dọn phía mình. Vận đơn thật thì gọi API cancel (bị chặn nếu chưa mode 'live').
   */
  /**
   * M-29e: tạo vận đơn TRẢ hàng (chiều về, shop chịu cước). Đảo điểm đi/đến so
   * với vận đơn thường. Bị mode-safety chặn nếu chưa 'live' (là thao tác ghi).
   */
  async createReturnShipment(input: ReturnOrderInput): Promise<{ providerOrderCode: string; isMock: boolean }> {
    const payload = buildReturnOrderPayload(input);
    const created = await this.provider.createOrder(payload as Record<string, unknown>);
    const code = created.order_code || `${PREVIEW_TRACKING_PREFIX}${input.orderCode}`;
    return { providerOrderCode: code, isMock: this.provider.isMock };
  }

  async cancelShipment(ghnOrderCode: string) {
    if (this.isMock || ghnOrderCode.startsWith(PREVIEW_TRACKING_PREFIX)) {
      return { orderCode: ghnOrderCode, success: true, message: 'skip (mock/preview)', raw: null };
    }
    return this.provider.cancelOrder(ghnOrderCode);
  }

  /* ── Dữ liệu địa giới (đọc từ cache trong DB) ───────────── */

  async listProvinces() {
    const rows = await GhnProvinceModel.findAll({ order: [['name', 'ASC']] });
    if (rows.length === 0) throw httpError(503, 'Chưa đồng bộ dữ liệu địa giới GHN. Chạy: npm run ghn:sync');
    return rows.map((r) => ({ provinceId: r.provinceId, name: r.name }));
  }

  async listDistricts(provinceId: number) {
    const rows = await GhnDistrictModel.findAll({ where: { provinceId }, order: [['name', 'ASC']] });
    return rows.map((r) => ({
      districtId: r.districtId,
      name: r.name,
      // Cho FE biết trước quận nào không giao được, thay vì để khách chọn xong mới báo lỗi.
      canDeliver: districtSupportsDelivery(r.supportType),
    }));
  }

  async listWards(districtId: number) {
    const rows = await GhnWardModel.findAll({ where: { districtId }, order: [['name', 'ASC']] });
    return rows.map((r) => ({
      wardCode: r.wardCode,
      name: r.name,
      // Quận mở vẫn có thể có phường bị khoá — chặn ngay tại dropdown.
      canDeliver: districtSupportsDelivery(r.supportType),
    }));
  }

  /**
   * Kéo toàn bộ dữ liệu địa giới về DB. Chạy thủ công khi đổi token hoặc khi
   * GHN cập nhật địa giới — KHÔNG chạy trong luồng đặt hàng vì rất tốn thời gian.
   */
  async syncMasterData(
    onProgress?: (message: string) => void,
  ): Promise<{ provinces: number; districts: number; wards: number }> {
    const provinces = await this.provider.getProvinces();
    const now = new Date();
    let districtCount = 0;
    let wardCount = 0;

    // Ghi theo LÔ. Việt Nam có ~700 quận/huyện và ~11.000 phường/xã — upsert
    // từng dòng sẽ mất hàng chục phút và dễ bị ngắt giữa đường.
    await GhnProvinceModel.bulkCreate(
      provinces.map((p) => ({
        provinceId: p.ProvinceID, name: p.ProvinceName, code: p.Code ?? null, syncedAt: now,
      })),
      { updateOnDuplicate: ['name', 'code', 'syncedAt'] },
    );

    for (const p of provinces) {
      const districts = await this.provider.getDistricts(p.ProvinceID);
      if (districts.length > 0) {
        await GhnDistrictModel.bulkCreate(
          districts.map((d) => ({
            districtId: d.DistrictID, provinceId: p.ProvinceID, name: d.DistrictName,
            supportType: d.SupportType ?? 3, syncedAt: now,
          })),
          { updateOnDuplicate: ['provinceId', 'name', 'supportType', 'syncedAt'] },
        );
      }
      districtCount += districts.length;

      for (const d of districts) {
        const wards = await this.provider.getWards(d.DistrictID);
        if (wards.length === 0) continue;
        await GhnWardModel.bulkCreate(
          wards.map((w) => ({
            // ⚠️ GHN trả WardCode có thể là SỐ; API tính phí lại nhận CHUỖI.
            // Ép kiểu ngay tại đây để không lệch khi so sánh ở dropdown.
            wardCode: String(w.WardCode),
            districtId: d.DistrictID,
            name: w.WardName,
            supportType: w.SupportType ?? 3,
            syncedAt: now,
          })),
          { updateOnDuplicate: ['name', 'supportType', 'syncedAt'] },
        );
        wardCount += wards.length;
      }
      onProgress?.(`${p.ProvinceName}: ${districts.length} quận/huyện`);
    }

    logger.info('GHN master data synced', {
      provider: this.provider.name, provinces: provinces.length, districts: districtCount, wards: wardCount,
    });
    return { provinces: provinces.length, districts: districtCount, wards: wardCount };
  }

  /**
   * ĐIỂM ĐI của tuyến.
   *
   * GHN tính phí theo TUYẾN (from_district -> to_district). Không biết điểm đi
   * thì mọi thứ lệch: hỏi dịch vụ ở tuyến này, tính phí ở tuyến khác, và GHN
   * trả "route not found service" — đúng lỗi đã gặp.
   *
   * Thứ tự ưu tiên: GHN_FROM_DISTRICT_ID (nếu khai) -> kho đăng ký với GHN.
   * Cache trong bộ nhớ vì mỗi lần hỏi là một round-trip nằm trên đường checkout.
   */
  private static pickupCache: { districtId: number; wardCode: string } | null = null;

  async resolvePickup(): Promise<{ districtId: number; wardCode: string } | null> {
    if (config.ghn.fromDistrictId) {
      return { districtId: config.ghn.fromDistrictId, wardCode: config.ghn.fromWardCode };
    }
    if (GhnService.pickupCache) return GhnService.pickupCache;

    try {
      const shops = await this.provider.getStores();
      if (shops.length === 0) {
        logger.error('GHN: tài khoản chưa có kho lấy hàng nào — không tính được phí.');
        return null;
      }
      // Khớp đúng ShopId đang dùng; không khớp thì lấy kho đầu tiên.
      const shop = shops.find((s) => String(s._id) === String(config.ghn.shopId)) ?? shops[0];
      GhnService.pickupCache = {
        districtId: shop.district_id,
        wardCode: String(shop.ward_code ?? ''),
      };
      logger.info('GHN pickup resolved from registered store', {
        shopId: shop._id, districtId: shop.district_id, name: shop.name,
      });
      return GhnService.pickupCache;
    } catch (err) {
      logger.warn('GHN: không đọc được danh sách kho', { error: (err as Error).message });
      return null;
    }
  }

  /**
   * Chọn dịch vụ cho tuyến. GHN yêu cầu MỘT trong hai: `service_id` hoặc
   * `service_type_id`. Không phải tuyến nào cũng mở đủ dịch vụ, nên dùng
   * `available-services` để lấy đúng `service_id` — chính xác hơn là gửi
   * `service_type_id` rồi hy vọng tuyến đó có.
   *
   * Cache lại vì danh sách này ít thay đổi và mỗi lần gọi là một round-trip
   * nằm ngay trên đường đi của trang checkout.
   */
  private async resolveServiceId(fromDistrictId: number, toDistrictId: number): Promise<number | null> {
    if (!fromDistrictId) return null;

    const cached = await GhnServiceModel.findAll({ where: { fromDistrictId, toDistrictId } });
    const pick = (rows: { serviceId: number; serviceTypeId: number }[]) =>
      rows.find((r) => r.serviceTypeId === config.ghn.serviceTypeId)?.serviceId
        ?? rows[0]?.serviceId
        ?? null;

    if (cached.length > 0) return pick(cached);

    try {
      const services = await this.provider.getAvailableServices(fromDistrictId, toDistrictId);
      if (services.length === 0) return null;
      await GhnServiceModel.bulkCreate(
        services.map((sv) => ({
          fromDistrictId, toDistrictId,
          serviceId: sv.service_id, serviceTypeId: sv.service_type_id,
          shortName: sv.short_name ?? null, syncedAt: new Date(),
        })),
        { updateOnDuplicate: ['serviceTypeId', 'shortName', 'syncedAt'] },
      );
      return pick(services.map((sv) => ({ serviceId: sv.service_id, serviceTypeId: sv.service_type_id })));
    } catch (err) {
      // Không lấy được danh sách dịch vụ thì vẫn thử bằng service_type_id.
      logger.warn('GHN available-services failed, falling back to service_type_id', {
        error: (err as Error).message, fromDistrictId, toDistrictId,
      });
      return null;
    }
  }

  /* ── Báo phí ────────────────────────────────────────────── */

  /**
   * Báo phí vận chuyển cho một giỏ hàng tới một địa chỉ.
   *
   * KHÔNG ném lỗi khi không báo được giá: trả `available:false` kèm lý do, để
   * checkout hiển thị đúng thông điệp và chặn đặt hàng, thay vì lỗi 500.
   */
  async quote(input: {
    districtId: number | null;
    wardCode: string | null;
    items: ParcelItemInput[];
    subtotalVnd: number;
    /** Giá trị khai giá để tính bảo hiểm; bỏ qua nếu không muốn mua bảo hiểm. */
    insuranceValueVnd?: number;
    /** M-22: dịch vụ khách đã chọn. Có thì tính đúng dịch vụ đó thay vì tự đoán. */
    serviceId?: number | null;
  }): Promise<ShippingQuote & { serviceId: number | null }> {
    const parcel = buildParcel(input.items);

    // Kiểm tra CẢ HAI cấp: quận mở nhưng phường bị khoá là trường hợp có thật.
    let canDeliver = true;
    if (input.districtId) {
      const district = await GhnDistrictModel.findByPk(input.districtId);
      canDeliver = district ? districtSupportsDelivery(district.supportType) : false;

      if (canDeliver && input.wardCode) {
        const ward = await GhnWardModel.findOne({
          where: { wardCode: String(input.wardCode), districtId: input.districtId },
        });
        // Phường không có trong dữ liệu đã đồng bộ cũng coi là không giao được:
        // gửi mã lạ cho GHN chỉ nhận về lỗi khó hiểu ở bước tạo vận đơn.
        canDeliver = ward ? districtSupportsDelivery(ward.supportType) : false;
      }
    }

    const blocked = quoteBlockedReason({
      districtId: input.districtId,
      wardCode: input.wardCode,
      districtSupportsDelivery: canDeliver,
      parcelExceedsLimit: parcel.exceedsLimit,
    });

    const empty: ShippingQuote & { serviceId: number | null } = {
      available: false, reason: blocked, feeVnd: 0, carrierFeeVnd: 0, freeShipping: false,
      weightGram: parcel.weightGram, usedDefaultWeight: parcel.usedDefaults, carrier: this.provider.name,
      serviceId: null,
    };
    if (blocked) return empty;

    // Điểm lấy hàng phải xác định ĐƯỢC trước khi gọi GHN. Thiếu nó là lỗi cấu
    // hình (chưa khai địa chỉ kho), không phải lỗi tạm thời — log riêng để phân biệt.
    const pickup = await this.resolvePickup();
    if (!pickup) {
      logger.error('GHN quote: không xác định được điểm lấy hàng. '
        + 'Khai GHN_FROM_DISTRICT_ID trong .env, hoặc thêm địa chỉ kho trong tài khoản GHN.');
      return { ...empty, reason: 'no_pickup' };
    }

    try {
      // BẤT BIẾN: tra dịch vụ và tính phí phải dùng CÙNG một tuyến.
      // Lệch điểm đi giữa hai lời gọi là nguyên nhân của "route not found service".
      // M-22: nếu khách đã chọn dịch vụ, tính đúng dịch vụ đó; nếu không, tự chọn.
      const serviceId = input.serviceId
        ?? await this.resolveServiceId(pickup.districtId, input.districtId!);
      const fee = await this.provider.calculateFee({
        from_district_id: pickup.districtId,
        ...(pickup.wardCode ? { from_ward_code: pickup.wardCode } : {}),
        to_district_id: input.districtId!,
        to_ward_code: String(input.wardCode),
        ...(serviceId ? { service_id: serviceId } : {}),
        weight: parcel.weightGram,
        length: parcel.lengthCm,
        width: parcel.widthCm,
        height: parcel.heightCm,
        ...(input.insuranceValueVnd ? { insurance_value: Math.round(input.insuranceValueVnd) } : {}),
      });

      const policy = applyFeePolicy({
        carrierFeeVnd: fee.total,
        subtotalVnd: input.subtotalVnd,
        freeOverVnd: config.ghn.freeOverVnd || null,
        subsidyVnd: config.ghn.subsidyVnd || null,
      });

      return {
        available: true,
        reason: null,
        feeVnd: policy.customerFeeVnd,
        carrierFeeVnd: policy.carrierFeeVnd,
        freeShipping: policy.freeShipping,
        weightGram: parcel.weightGram,
        usedDefaultWeight: parcel.usedDefaults,
        carrier: this.provider.name,
        serviceId: serviceId ?? null,
      };
    } catch (err) {
      const message = (err as Error).message;
      // Ghi ĐẦY ĐỦ tuyến + lỗi để đọc log là biết ngay hỏng ở đâu.
      logger.error('GHN quote failed', {
        error: message,
        route: `${pickup.districtId} -> ${input.districtId}`,
        fromWard: pickup.wardCode,
        toWard: input.wardCode,
        weightGram: parcel.weightGram,
      });
      // Tuyến không tồn tại là lỗi cấu hình kho, không phải trục trặc tạm thời.
      const routeMissing = /route not found|not support|khong ho tro/i.test(message);
      return {
        ...empty,
        reason: routeMissing ? 'route_not_found' : 'carrier_unavailable',
        debugMessage: message,
      };
    }
  }

  /**
   * M-22: liệt kê CÁC phương thức GHN cho một giỏ hàng tới một địa chỉ.
   *
   * Mỗi dịch vụ khả dụng của tuyến được hỏi phí + thời gian giao SONG SONG.
   * Dịch vụ nào lỗi thì bỏ qua, không làm hỏng cả danh sách.
   */
  async quoteOptions(input: {
    districtId: number | null;
    wardCode: string | null;
    items: ParcelItemInput[];
    subtotalVnd: number;
    insuranceValueVnd?: number;
  }): Promise<ShippingOptionsResult> {
    const parcel = buildParcel(input.items);

    let canDeliver = true;
    if (input.districtId) {
      const district = await GhnDistrictModel.findByPk(input.districtId);
      canDeliver = district ? districtSupportsDelivery(district.supportType) : false;
      if (canDeliver && input.wardCode) {
        const ward = await GhnWardModel.findOne({
          where: { wardCode: String(input.wardCode), districtId: input.districtId },
        });
        canDeliver = ward ? districtSupportsDelivery(ward.supportType) : false;
      }
    }

    const blocked = quoteBlockedReason({
      districtId: input.districtId,
      wardCode: input.wardCode,
      districtSupportsDelivery: canDeliver,
      parcelExceedsLimit: parcel.exceedsLimit,
    });
    const base: ShippingOptionsResult = {
      available: false, reason: blocked, options: [],
      weightGram: parcel.weightGram, usedDefaultWeight: parcel.usedDefaults,
    };
    if (blocked) return base;

    const pickup = await this.resolvePickup();
    if (!pickup) return { ...base, reason: 'no_pickup' };

    try {
      const services = await this.provider.getAvailableServices(pickup.districtId, input.districtId!);
      if (services.length === 0) return { ...base, reason: 'route_not_found' };

      const parcelReq = {
        from_district_id: pickup.districtId,
        ...(pickup.wardCode ? { from_ward_code: pickup.wardCode } : {}),
        to_district_id: input.districtId!,
        to_ward_code: String(input.wardCode),
        weight: parcel.weightGram,
        length: parcel.lengthCm,
        width: parcel.widthCm,
        height: parcel.heightCm,
        ...(input.insuranceValueVnd ? { insurance_value: Math.round(input.insuranceValueVnd) } : {}),
      };

      const settled = await Promise.allSettled(services.map(async (svc) => {
        const [fee, leadtime] = await Promise.all([
          this.provider.calculateFee({ ...parcelReq, service_id: svc.service_id }),
          this.provider.getLeadtime({
            from_district_id: pickup.districtId,
            from_ward_code: pickup.wardCode,
            to_district_id: input.districtId!,
            to_ward_code: String(input.wardCode),
            service_id: svc.service_id,
          }).catch(() => null),
        ]);
        const policy = applyFeePolicy({
          carrierFeeVnd: fee.total,
          subtotalVnd: input.subtotalVnd,
          freeOverVnd: config.ghn.freeOverVnd || null,
          subsidyVnd: config.ghn.subsidyVnd || null,
        });
        const meta = serviceMeta(svc.service_type_id, svc.short_name);
        return {
          serviceId: svc.service_id,
          serviceTypeId: svc.service_type_id,
          name: meta.name,
          description: meta.description,
          feeVnd: policy.customerFeeVnd,
          freeShipping: policy.freeShipping,
          leadtimeAt: leadtime ? leadtime.leadtime : null,
          leadtimeDays: leadtime ? leadtimeDays(leadtime.leadtime, leadtime.order_date) : null,
        } as ShippingOption;
      }));

      const options = settled
        .filter((r): r is PromiseFulfilledResult<ShippingOption> => r.status === 'fulfilled')
        .map((r) => r.value)
        .sort((a, b2) => serviceSortWeight(a.serviceTypeId) - serviceSortWeight(b2.serviceTypeId));

      if (options.length === 0) return { ...base, reason: 'carrier_unavailable' };
      return {
        available: true, reason: null, options,
        weightGram: parcel.weightGram, usedDefaultWeight: parcel.usedDefaults,
      };
    } catch (err) {
      const message = (err as Error).message;
      logger.error('GHN quoteOptions failed', { error: message, route: `${pickup.districtId} -> ${input.districtId}` });
      const routeMissing = /route not found|not support|khong ho tro/i.test(message);
      return { ...base, reason: routeMissing ? 'route_not_found' : 'carrier_unavailable', debugMessage: message };
    }
  }

  /**
   * M-13d: tạo vận đơn GHN.
   *
   * ⚠️ THAO TÁC GHI — phát sinh cước thật. Được gọi khi admin xác nhận đơn,
   * không phải lúc khách đặt hàng: đơn ảo, đơn hết hàng, đơn khách huỷ đều
   * không tốn tiền.
   *
   * An toàn khi gọi lại: `client_order_code` = mã đơn hàng, GHN sẽ trả về vận
   * đơn cũ thay vì tạo thêm. Nhờ vậy admin bấm hai lần hoặc mạng chập chờn
   * cũng không sinh ra hai vận đơn cho cùng một đơn.
   */
  async createShipment(input: CreateOrderInput) {
    const payload = buildCreateOrderPayload(input);
    const created = await this.provider.createOrder(payload as unknown as Record<string, unknown>);

    // Preview KHÔNG tạo vận đơn nên GHN trả order_code rỗng. Sinh mã thay thế
    // có tiền tố rõ ràng — tuyệt đối không để mã giả trông giống mã thật, vì
    // nó đi vào email gửi khách và vào cơ sở dữ liệu.
    const isPreview = this.mode === 'preview';
    const providerOrderCode = created.order_code
      || (isPreview ? `${PREVIEW_TRACKING_PREFIX}${input.orderCode}` : '');

    if (!providerOrderCode) {
      throw new Error('GHN không trả về mã vận đơn.');
    }

    logger.info(isPreview ? 'GHN shipment PREVIEWED (không tạo đơn thật)' : 'GHN shipment created', {
      mode: this.mode,
      orderCode: input.orderCode,
      ghnOrderCode: providerOrderCode,
      codAmount: payload.cod_amount,
      totalFee: created.total_fee,
    });

    return {
      providerOrderCode,
      totalFee: created.total_fee == null ? null : Number(created.total_fee),
      expectedDeliveryTime: created.expected_delivery_time ? new Date(created.expected_delivery_time) : null,
      raw: created as unknown as Record<string, unknown>,
      isMock: this.provider.isMock,
      isPreview,
    };
  }
}
