import { describe, it, expect } from 'vitest';
import {
  resolveGhnMode, assertOperationAllowed, isWriteOperation, describeMode, GhnPermissionError,
} from '@/modules/shipping-provider/ghn/ghn.mode';

const FEE = '/v2/shipping-order/fee';
const CREATE = '/v2/shipping-order/create';
const MASTER = '/master-data/province';

describe('resolveGhnMode (M-13)', () => {
  it('thiếu token hoặc shopId => mock', () => {
    expect(resolveGhnMode({ token: '', shopId: '885', allowWrite: false })).toBe('mock');
    expect(resolveGhnMode({ token: 'abc', shopId: '', allowWrite: true })).toBe('mock');
  });

  it('có đủ thông tin nhưng chưa bật ghi => readonly (mặc định an toàn)', () => {
    expect(resolveGhnMode({ token: 'abc', shopId: '885', allowWrite: false })).toBe('readonly');
  });

  it('chỉ vào live khi bật rõ ràng', () => {
    expect(resolveGhnMode({ token: 'abc', shopId: '885', allowWrite: true })).toBe('live');
  });
});

describe('GHN_MODE — ghi đè cho môi trường test (M-21)', () => {
  const withToken = { token: 'abc', shopId: '885', allowWrite: false };

  it('preview: kiểm chứng với GHN thật nhưng không tạo đơn', () => {
    expect(resolveGhnMode({ ...withToken, modeOverride: 'preview' })).toBe('preview');
  });

  it('ép được mock kể cả khi đã có token — chạy hoàn toàn offline', () => {
    expect(resolveGhnMode({ ...withToken, allowWrite: true, modeOverride: 'mock' })).toBe('mock');
  });

  it('override "live" VẪN phải kèm GHN_ALLOW_WRITE — hai lớp xác nhận', () => {
    expect(resolveGhnMode({ ...withToken, modeOverride: 'live' })).toBe('readonly');
    expect(resolveGhnMode({ ...withToken, allowWrite: true, modeOverride: 'live' })).toBe('live');
  });

  it('không có token thì mọi override đều ra mock — không có gì để gọi', () => {
    expect(resolveGhnMode({ token: '', shopId: '', allowWrite: true, modeOverride: 'preview' })).toBe('mock');
  });

  it('giá trị rác bị bỏ qua, quay về suy diễn mặc định', () => {
    expect(resolveGhnMode({ ...withToken, modeOverride: 'linh tinh' })).toBe('readonly');
    expect(resolveGhnMode({ ...withToken, modeOverride: '  PREVIEW  ' })).toBe('preview');
  });
});

describe('assertOperationAllowed — chế độ preview', () => {
  it('preview vẫn tính phí và tra địa giới bình thường', () => {
    expect(() => assertOperationAllowed('preview', FEE)).not.toThrow();
    expect(() => assertOperationAllowed('preview', MASTER)).not.toThrow();
  });

  it('preview KHÔNG được chạm endpoint tạo đơn — lẽ ra provider đã đổi sang /preview', () => {
    expect(() => assertOperationAllowed('preview', CREATE)).toThrow(GhnPermissionError);
  });

  it('endpoint preview không bị coi là thao tác ghi', () => {
    expect(isWriteOperation('/v2/shipping-order/preview')).toBe(false);
    expect(() => assertOperationAllowed('preview', '/v2/shipping-order/preview')).not.toThrow();
  });
});

describe('isWriteOperation', () => {
  it('tính phí và tra cứu địa giới KHÔNG phải thao tác ghi', () => {
    expect(isWriteOperation(FEE)).toBe(false);
    expect(isWriteOperation(MASTER)).toBe(false);
    expect(isWriteOperation('/v2/shipping-order/available-services')).toBe(false);
  });

  it('tạo, huỷ, trả hàng, đổi COD đều là thao tác ghi', () => {
    expect(isWriteOperation(CREATE)).toBe(true);
    expect(isWriteOperation('/v2/switch-status/cancel')).toBe(true);
    expect(isWriteOperation('/v2/switch-status/return')).toBe(true);
    expect(isWriteOperation('/v2/shipping-order/updateCOD')).toBe(true);
  });
});

describe('assertOperationAllowed', () => {
  it('readonly: tính phí được phép', () => {
    expect(() => assertOperationAllowed('readonly', FEE)).not.toThrow();
    expect(() => assertOperationAllowed('readonly', MASTER)).not.toThrow();
  });

  it('readonly: tạo vận đơn bị chặn — đây là điều quan trọng nhất', () => {
    expect(() => assertOperationAllowed('readonly', CREATE)).toThrow(GhnPermissionError);
  });

  it('mock: không gọi gì ra ngoài', () => {
    expect(() => assertOperationAllowed('mock', FEE)).toThrow(GhnPermissionError);
  });

  it('live: cho phép tất cả', () => {
    expect(() => assertOperationAllowed('live', CREATE)).not.toThrow();
    expect(() => assertOperationAllowed('live', FEE)).not.toThrow();
  });

  it('thông báo lỗi nói rõ hậu quả bằng tiền, không chỉ nói "bị cấm"', () => {
    try {
      assertOperationAllowed('readonly', CREATE);
      expect.unreachable();
    } catch (err) {
      expect((err as Error).message).toContain('THẬT');
      expect((err as Error).message).toContain('GHN_ALLOW_WRITE');
    }
  });
});

describe('describeMode', () => {
  it('mỗi chế độ có mô tả riêng để in ra log khởi động', () => {
    const all = (['mock', 'readonly', 'preview', 'live'] as const).map(describeMode);
    expect(new Set(all).size).toBe(4);
    expect(describeMode('live')).toContain('LIVE');
  });
});
