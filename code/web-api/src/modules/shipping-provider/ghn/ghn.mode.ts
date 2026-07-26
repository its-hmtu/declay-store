/**
 * M-13: mô hình an toàn cho GHN.
 *
 * BỐI CẢNH: ban đầu code chặn theo URL — "GHN_SANDBOX=true thì bắt buộc dùng
 * dev-online-gateway". Giả định đó đã sụp: môi trường dev của GHN không còn
 * phản hồi (timeout), trong khi tài liệu vẫn ghi nó tồn tại.
 *
 * Chặn theo URL vốn là cách sai. Thứ thực sự nguy hiểm không phải "gọi vào
 * production" mà là **tạo vận đơn thật**. Các API mà tính phí cần —
 * master-data, available-services, fee — đều CHỈ ĐỌC: gọi bao nhiêu lần cũng
 * không tạo ra gì và không phát sinh cước.
 *
 * Nên mô hình mới chặn theo QUYỀN THAO TÁC:
 *   mock     — không gọi ra ngoài, dùng dữ liệu giả lập
 *   readonly — được đọc địa giới và tính phí, CẤM tạo/huỷ vận đơn  (mặc định)
 *   live     — được phép tất cả, phải bật rõ ràng
 */

export type GhnMode = 'mock' | 'readonly' | 'live';

/** Thao tác ghi = tạo ra hệ quả thật bên GHN (vận đơn, tiền cước). */
export const GHN_WRITE_OPERATIONS = [
  '/v2/shipping-order/create',
  '/v2/switch-status/cancel',
  '/v2/switch-status/return',
  '/v2/shipping-order/update',
  '/v2/shipping-order/updateCOD',
] as const;

export class GhnPermissionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'GhnPermissionError';
  }
}

export function isWriteOperation(path: string): boolean {
  return GHN_WRITE_OPERATIONS.some((op) => path.startsWith(op));
}

/**
 * Suy ra chế độ từ cấu hình.
 * Thiếu token/shopId -> mock. Có token mà không bật rõ live -> readonly.
 * Mặc định nghiêng về phía an toàn: quên cấu hình thì mất tính năng, không mất tiền.
 */
export function resolveGhnMode(input: {
  token: string;
  shopId: string;
  allowWrite: boolean;
}): GhnMode {
  if (!input.token || !input.shopId) return 'mock';
  return input.allowWrite ? 'live' : 'readonly';
}

/** Ném lỗi nếu chế độ hiện tại không cho phép thao tác này. */
export function assertOperationAllowed(mode: GhnMode, path: string): void {
  if (mode === 'mock') {
    throw new GhnPermissionError(`GHN đang ở chế độ mock — không gọi "${path}" ra ngoài.`);
  }
  if (mode === 'readonly' && isWriteOperation(path)) {
    throw new GhnPermissionError(
      `Thao tác "${path}" tạo vận đơn THẬT và phát sinh cước. ` +
        'Đặt GHN_ALLOW_WRITE=true nếu thực sự muốn chạy thật.',
    );
  }
}

/** Câu mô tả ngắn để in ra log lúc khởi động, cho biết hệ thống đang ở đâu. */
export function describeMode(mode: GhnMode): string {
  switch (mode) {
    case 'mock':
      return 'GHN: chế độ MOCK (chưa có GHN_TOKEN/GHN_SHOP_ID) — phí là số giả lập.';
    case 'readonly':
      return 'GHN: chế độ READONLY — tính phí thật, KHÔNG tạo được vận đơn.';
    case 'live':
      return 'GHN: chế độ LIVE — tạo vận đơn thật và phát sinh cước.';
  }
}
