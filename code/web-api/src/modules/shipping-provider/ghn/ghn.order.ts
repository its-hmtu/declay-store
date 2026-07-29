/**
 * M-13d: dựng payload tạo vận đơn GHN — hàm thuần, test được.
 *
 * Đây là chỗ nguy hiểm nhất của cả tích hợp: sai một trường là mất tiền thật
 * hoặc thu sai của khách. Ba luật quan trọng nhất:
 *
 *  1. `payment_type_id` — AI trả cước.
 *     Khách đã trả phí ship trong đơn hàng rồi, nên CỬA HÀNG trả cho GHN (=1).
 *     Đặt =2 nghĩa là shipper thu thêm phí ship của khách lần nữa.
 *
 *  2. `cod_amount` — số tiền shipper thu hộ.
 *     Đơn trả trước (VNPay/thẻ) PHẢI bằng 0. Để nguyên tổng đơn nghĩa là thu
 *     tiền khách hai lần.
 *
 *  3. `client_order_code` — mã đơn của mình.
 *     Tài liệu GHN: gọi lại với cùng mã sẽ trả về vận đơn cũ thay vì tạo mới.
 *     Đây là cơ chế chống tạo trùng khi admin bấm hai lần hoặc mạng chập chờn.
 */

/** Giới hạn GHN công bố cho API tạo đơn. */
export const GHN_MAX_COD_VND = 50_000_000;
export const GHN_MAX_INSURANCE_VND = 5_000_000;
export const GHN_MAX_WEIGHT_GRAM_CREATE = 50_000;
export const GHN_MAX_DIMENSION_CM = 200;

/** Ai trả cước vận chuyển. */
export const PAYMENT_TYPE_SHOP = 1;
export const PAYMENT_TYPE_BUYER = 2;

/** Ghi chú giao hàng — GHN chỉ nhận đúng ba giá trị này. */
export type RequiredNote = 'CHOTHUHANG' | 'CHOXEMHANGKHONGTHU' | 'KHONGCHOXEMHANG';

/**
 * Mặc định cho hàng thủ công: cho khách xem để yên tâm, nhưng không cho thử —
 * đồ gốm/handmade thử xong khó bán lại.
 */
export const DEFAULT_REQUIRED_NOTE: RequiredNote = 'CHOXEMHANGKHONGTHU';

export class GhnOrderError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'GhnOrderError';
  }
}

export interface CreateOrderInput {
  /** Mã đơn của mình — dùng làm khoá chống tạo trùng. */
  orderCode: string;
  isPrepaid: boolean;
  totalAmountVnd: number;
  /** Giá trị hàng để khai giá bảo hiểm. */
  goodsValueVnd: number;
  receiver: { name: string; phone: string; address: string; wardCode: string; districtId: number };
  parcel: { weightGram: number; lengthCm: number; widthCm: number; heightCm: number };
  items: { name: string; code?: string | null; quantity: number; priceVnd: number; weightGram: number }[];
  serviceId?: number | null;
  serviceTypeId?: number;
  note?: string | null;
  requiredNote?: RequiredNote;
}

export interface GhnCreateOrderPayload {
  payment_type_id: number;
  required_note: RequiredNote;
  client_order_code: string;
  to_name: string;
  to_phone: string;
  to_address: string;
  to_ward_code: string;
  to_district_id: number;
  cod_amount: number;
  content: string;
  weight: number;
  length: number;
  width: number;
  height: number;
  insurance_value: number;
  service_id?: number;
  service_type_id?: number;
  note?: string;
  items: {
    name: string; code?: string; quantity: number; price: number; weight: number;
  }[];
}

function clampDimension(value: number, label: string): number {
  const v = Math.max(1, Math.ceil(Number(value) || 1));
  if (v > GHN_MAX_DIMENSION_CM) {
    throw new GhnOrderError(`${label} ${v}cm vượt giới hạn ${GHN_MAX_DIMENSION_CM}cm của GHN.`);
  }
  return v;
}

export function buildCreateOrderPayload(input: CreateOrderInput): GhnCreateOrderPayload {
  if (!input.orderCode) throw new GhnOrderError('Thiếu mã đơn hàng — không có khoá chống tạo trùng.');
  if (!input.receiver.wardCode || !input.receiver.districtId) {
    throw new GhnOrderError('Địa chỉ nhận thiếu mã phường/quận của GHN.');
  }
  if (input.items.length === 0) throw new GhnOrderError('Đơn không có sản phẩm nào.');

  const weight = Math.max(1, Math.ceil(Number(input.parcel.weightGram) || 1));
  if (weight > GHN_MAX_WEIGHT_GRAM_CREATE) {
    throw new GhnOrderError(`Kiện ${weight}g vượt giới hạn ${GHN_MAX_WEIGHT_GRAM_CREATE}g của GHN.`);
  }

  // LUẬT TIỀN: đơn đã trả trước thì tuyệt đối không thu hộ thêm đồng nào.
  const codRaw = input.isPrepaid ? 0 : Math.max(0, Math.round(Number(input.totalAmountVnd) || 0));
  if (codRaw > GHN_MAX_COD_VND) {
    throw new GhnOrderError(
      `Số tiền thu hộ ${codRaw}đ vượt giới hạn ${GHN_MAX_COD_VND}đ của GHN. Đơn này cần thu tiền trước.`,
    );
  }

  // Khai giá bảo hiểm theo giá trị hàng, cắt trần theo quy định GHN.
  const insurance = Math.min(
    GHN_MAX_INSURANCE_VND,
    Math.max(0, Math.round(Number(input.goodsValueVnd) || 0)),
  );

  const payload: GhnCreateOrderPayload = {
    // Khách đã trả phí ship khi đặt hàng -> cửa hàng thanh toán cước cho GHN.
    payment_type_id: PAYMENT_TYPE_SHOP,
    required_note: input.requiredNote ?? DEFAULT_REQUIRED_NOTE,
    client_order_code: input.orderCode,
    to_name: input.receiver.name,
    to_phone: input.receiver.phone,
    to_address: input.receiver.address,
    to_ward_code: String(input.receiver.wardCode),
    to_district_id: input.receiver.districtId,
    cod_amount: codRaw,
    content: input.items.map((i) => `${i.name} x${i.quantity}`).join(', ').slice(0, 2000),
    weight,
    length: clampDimension(input.parcel.lengthCm, 'Chiều dài'),
    width: clampDimension(input.parcel.widthCm, 'Chiều rộng'),
    height: clampDimension(input.parcel.heightCm, 'Chiều cao'),
    insurance_value: insurance,
    items: input.items.map((i) => ({
      name: i.name.slice(0, 1024),
      ...(i.code ? { code: String(i.code).slice(0, 50) } : {}),
      quantity: Math.max(1, Math.ceil(i.quantity)),
      price: Math.max(0, Math.round(i.priceVnd)),
      weight: Math.max(1, Math.ceil(i.weightGram)),
    })),
  };

  if (input.note) payload.note = input.note.slice(0, 5000);

  // Giống API tính phí: chỉ gửi MỘT trong hai.
  if (input.serviceId) payload.service_id = input.serviceId;
  else payload.service_type_id = input.serviceTypeId ?? 2;

  return payload;
}
