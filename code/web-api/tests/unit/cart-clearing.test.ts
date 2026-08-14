import { describe, it, expect } from 'vitest';

/**
 * M-20: luật dọn giỏ hàng sau khi thanh toán — tách thành hàm thuần để test
 * mà không cần cơ sở dữ liệu.
 *
 * Lỗi đã gặp: chỉ dọn giỏ khi đơn có `userId`. Giỏ của khách vãng lai gắn với
 * session, còn đơn hàng không lưu session — nên khách vãng lai trả tiền qua
 * VNPay xong vẫn thấy nguyên giỏ cũ và dễ đặt trùng đơn.
 */
function cartTargetFor(order: { cartId: number | null; userId: number | null }):
  { by: 'cartId'; cartId: number } | { by: 'userId'; userId: number } | null {
  if (order.cartId) return { by: 'cartId', cartId: order.cartId };
  if (order.userId) return { by: 'userId', userId: order.userId };
  return null;
}

describe('Chọn giỏ hàng để dọn sau thanh toán (M-20)', () => {
  it('đơn khách VÃNG LAI vẫn dọn được nhờ cartId đã chốt', () => {
    expect(cartTargetFor({ cartId: 42, userId: null })).toEqual({ by: 'cartId', cartId: 42 });
  });

  it('đơn thành viên ưu tiên cartId — chính xác hơn tra theo userId', () => {
    expect(cartTargetFor({ cartId: 42, userId: 7 })).toEqual({ by: 'cartId', cartId: 42 });
  });

  it('đơn CŨ (trước migration 025) vẫn dọn được theo userId', () => {
    expect(cartTargetFor({ cartId: null, userId: 7 })).toEqual({ by: 'userId', userId: 7 });
  });

  it('đơn cũ của khách vãng lai: không có gì để tra — đây chính là lỗ hổng cũ', () => {
    expect(cartTargetFor({ cartId: null, userId: null })).toBeNull();
  });
});
