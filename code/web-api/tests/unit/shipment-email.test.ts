import { describe, it, expect } from 'vitest';
import {
  buildShipmentNotificationHtml, shipmentEmailSubject, formatDeliveryDate,
  type ShipmentEmailData,
} from '@/lib/order-email';

const base: ShipmentEmailData = {
  orderCode: 'DC-260726-AB2C',
  customerName: 'Nguyễn Văn A',
  trackingNumber: 'FFFNL9HH',
  carrier: 'GHN',
  trackingUrl: 'https://donhang.ghn.vn/?order_code=FFFNL9HH',
  expectedDeliveryAt: '2026-07-29T09:00:00Z',
  items: [
    { name: 'Tượng gốm mèo', variantName: 'Men xanh', quantity: 2, unitPriceVnd: 600_000 },
    { name: 'Bình hoa nhỏ', quantity: 1, unitPriceVnd: 350_000 },
  ],
  shippingAddress: '72 Thành Thái, Phường Bến Nghé, Quận 1, Hồ Chí Minh',
  codAmountVnd: 0,
};

describe('buildShipmentNotificationHtml (M-18)', () => {
  it('mã vận đơn là thông tin nổi bật nhất', () => {
    const html = buildShipmentNotificationHtml(base);
    expect(html).toContain('FFFNL9HH');
    expect(html).toContain('Mã vận đơn');
  });

  it('có link theo dõi của hãng vận chuyển', () => {
    expect(buildShipmentNotificationHtml(base)).toContain('https://donhang.ghn.vn/?order_code=FFFNL9HH');
  });

  it('không có link thì vẫn hiện mã, không để nút hỏng', () => {
    const html = buildShipmentNotificationHtml({ ...base, trackingUrl: null });
    expect(html).toContain('FFFNL9HH');
    expect(html).not.toContain('Theo dõi đơn hàng');
  });

  it('ĐƠN COD: nói rõ số tiền mặt cần chuẩn bị', () => {
    const html = buildShipmentNotificationHtml({ ...base, codAmountVnd: 1_586_000 });
    expect(html).toContain('Chuẩn bị tiền mặt');
    expect(html).toContain('1.586.000 ₫');
  });

  it('ĐƠN TRẢ TRƯỚC: khẳng định không phải trả thêm', () => {
    const html = buildShipmentNotificationHtml(base);
    expect(html).toContain('không cần trả thêm');
    expect(html).not.toContain('Chuẩn bị tiền mặt');
  });

  it('liệt kê sản phẩm để khách đối chiếu khi mở kiện', () => {
    const html = buildShipmentNotificationHtml(base);
    expect(html).toContain('Tượng gốm mèo');
    expect(html).toContain('Men xanh');
    expect(html).toContain('Bình hoa nhỏ');
  });

  it('có ngày dự kiến giao khi GHN trả về', () => {
    expect(buildShipmentNotificationHtml(base)).toContain('Dự kiến giao');
  });

  it('thiếu ngày dự kiến thì bỏ hẳn dòng đó, không hiện Invalid Date', () => {
    const html = buildShipmentNotificationHtml({ ...base, expectedDeliveryAt: null });
    expect(html).not.toContain('Dự kiến giao');
    expect(html).not.toContain('Invalid Date');
    expect(html).not.toContain('null');
  });

  it('chặn HTML injection từ tên sản phẩm và tên khách', () => {
    const html = buildShipmentNotificationHtml({
      ...base,
      customerName: '<img src=x onerror=alert(1)>',
      items: [{ name: '<script>alert(1)</script>', quantity: 1, unitPriceVnd: 1000 }],
    });
    expect(html).not.toContain('<script>');
    expect(html).not.toContain('<img');
  });

  it('có link tra cứu cho khách vãng lai', () => {
    const html = buildShipmentNotificationHtml({ ...base, lookupUrl: 'https://declay.vn/orders/lookup?token=abc' });
    expect(html).toContain('token=abc');
  });
});

describe('shipmentEmailSubject', () => {
  it('có cả mã đơn và mã vận đơn — khách tìm bằng cái nào cũng ra', () => {
    const subject = shipmentEmailSubject(base);
    expect(subject).toContain('DC-260726-AB2C');
    expect(subject).toContain('FFFNL9HH');
  });
});

describe('formatDeliveryDate', () => {
  it('định dạng theo giờ Việt Nam', () => {
    // 2026-07-29T18:00:00Z = 01:00 ngày 30/07 giờ Việt Nam
    expect(formatDeliveryDate('2026-07-29T18:00:00Z')).toContain('30');
  });
  it('trả null với giá trị không hợp lệ thay vì ném lỗi', () => {
    expect(formatDeliveryDate(null)).toBeNull();
    expect(formatDeliveryDate('rác')).toBeNull();
  });
});
