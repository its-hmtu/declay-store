import { describe, it, expect } from 'vitest';
import { statusTransitionError } from '@/modules/order/order.pricing';

/**
 * M-23: nhắc lại luật chuyển trạng thái để không ai vô tình cho phép nhảy bậc.
 * 'shipped' KHÔNG nằm trong updateStatus (chỉ tạo vận đơn), nhưng transition
 * machine vẫn phải hợp lệ cho các bước còn lại.
 */
describe('statusTransitionError (M-23)', () => {
  it('paid -> processing hợp lệ', () => {
    expect(statusTransitionError('paid', 'processing')).toBeNull();
  });
  it('processing -> shipped hợp lệ (thực hiện qua tạo vận đơn)', () => {
    expect(statusTransitionError('processing', 'shipped')).toBeNull();
  });
  it('không nhảy lùi từ shipped về processing', () => {
    expect(statusTransitionError('shipped', 'processing')).not.toBeNull();
  });
  it('delivered là trạng thái cuối, không đổi tiếp (trừ returned)', () => {
    expect(statusTransitionError('delivered', 'shipped')).not.toBeNull();
  });
});
