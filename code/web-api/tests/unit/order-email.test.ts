import { describe, it, expect } from 'vitest';
import {
  buildOrderConfirmationHtml, orderEmailSubject, escapeHtml, formatVndEmail,
  type OrderEmailData,
} from '@/lib/order-email';

const base: OrderEmailData = {
  orderCode: 'DC-260726-AB2C',
  customerName: 'Nguyễn Văn A',
  items: [
    { name: 'Tượng gốm mèo', variantName: 'Men xanh', quantity: 2, unitPriceVnd: 600_000 },
    { name: 'Bình hoa nhỏ', quantity: 1, unitPriceVnd: 350_000 },
  ],
  subtotalVnd: 1_550_000,
  shippingFeeVnd: 36_000,
  discountVnd: 0,
  totalVnd: 1_586_000,
  paymentMethodLabel: 'VNPay',
  shippingAddress: '72 Thành Thái, Phường Bến Nghé, Quận 1, Hồ Chí Minh',
};

describe('buildOrderConfirmationHtml (M-17)', () => {
  it('liệt kê ĐẦY ĐỦ sản phẩm — đây là hoá đơn duy nhất của khách vãng lai', () => {
    const html = buildOrderConfirmationHtml(base);
    expect(html).toContain('Tượng gốm mèo');
    expect(html).toContain('Men xanh');
    expect(html).toContain('Bình hoa nhỏ');
  });

  it('hiện thành tiền từng dòng, không chỉ đơn giá', () => {
    const html = buildOrderConfirmationHtml(base);
    expect(html).toContain('1.200.000 ₫'); // 600.000 x 2
  });

  it('có đủ tạm tính, phí ship và tổng cộng', () => {
    const html = buildOrderConfirmationHtml(base);
    expect(html).toContain('1.550.000 ₫');
    expect(html).toContain('36.000 ₫');
    expect(html).toContain('1.586.000 ₫');
  });

  it('phí ship bằng 0 hiện "Miễn phí" thay vì "0 ₫"', () => {
    const html = buildOrderConfirmationHtml({ ...base, shippingFeeVnd: 0 });
    expect(html).toContain('Miễn phí');
  });

  it('chỉ hiện dòng giảm giá khi thực sự có giảm', () => {
    expect(buildOrderConfirmationHtml(base)).not.toContain('Giảm giá');
    expect(buildOrderConfirmationHtml({ ...base, discountVnd: 50_000 })).toContain('Giảm giá');
  });

  it('có mã vận đơn thì hiện nổi bật', () => {
    const html = buildOrderConfirmationHtml({ ...base, trackingNumber: 'FFFNL9HH', carrier: 'GHN' });
    expect(html).toContain('FFFNL9HH');
    expect(html).toContain('Mã vận đơn');
  });

  it('chưa có mã vận đơn thì GIẢI THÍCH, không để trống', () => {
    const html = buildOrderConfirmationHtml(base);
    expect(html).toContain('email tiếp theo');
    expect(html).not.toContain('undefined');
    expect(html).not.toContain('null');
  });

  it('có link tra cứu cho khách vãng lai', () => {
    const html = buildOrderConfirmationHtml({ ...base, lookupUrl: 'https://declay.vn/orders/lookup?token=abc' });
    expect(html).toContain('https://declay.vn/orders/lookup?token=abc');
  });

  it('hiện địa chỉ giao và phương thức thanh toán', () => {
    const html = buildOrderConfirmationHtml(base);
    expect(html).toContain('Quận 1');
    expect(html).toContain('VNPay');
  });

  it('chặn HTML injection từ tên sản phẩm', () => {
    const html = buildOrderConfirmationHtml({
      ...base,
      items: [{ name: '<script>alert(1)</script>', quantity: 1, unitPriceVnd: 1000 }],
    });
    expect(html).not.toContain('<script>');
    expect(html).toContain('&lt;script&gt;');
  });

  it('chặn injection từ tên khách hàng', () => {
    const html = buildOrderConfirmationHtml({ ...base, customerName: '<img src=x onerror=alert(1)>' });
    expect(html).not.toContain('<img');
  });
});

describe('orderEmailSubject', () => {
  it('có mã đơn để khách tìm lại trong hộp thư', () => {
    expect(orderEmailSubject(base)).toContain('DC-260726-AB2C');
  });
});

describe('escapeHtml / formatVndEmail', () => {
  it('escape đủ các ký tự nguy hiểm', () => {
    expect(escapeHtml(`<>&"'`)).toBe('&lt;&gt;&amp;&quot;&#39;');
  });
  it('định dạng tiền kiểu Việt Nam', () => {
    expect(formatVndEmail(1_586_000).replace(/ /g, ' ')).toBe('1.586.000 ₫');
  });
});
