/**
 * M-17: nội dung email xác nhận đơn hàng — hàm thuần, test được.
 *
 * Tách riêng vì đây là thứ khách vãng lai NHẬN ĐƯỢC DUY NHẤT: họ không có tài
 * khoản, không xem được lịch sử đơn, nên email này chính là hoá đơn của họ.
 * Thiếu một dòng là khách không có cách nào tra lại.
 */

export interface OrderEmailItem {
  name: string;
  variantName?: string | null;
  quantity: number;
  unitPriceVnd: number;
}

export interface OrderEmailData {
  orderCode: string;
  customerName: string;
  items: OrderEmailItem[];
  subtotalVnd: number;
  shippingFeeVnd: number;
  discountVnd: number;
  totalVnd: number;
  paymentMethodLabel: string;
  shippingAddress: string;
  /** Chỉ có sau khi cửa hàng bàn giao hàng cho GHN. */
  trackingNumber?: string | null;
  carrier?: string | null;
  /** Link tra cứu cho khách vãng lai — thay cho trang "đơn hàng của tôi". */
  lookupUrl?: string | null;
}

export function formatVndEmail(amount: number): string {
  return `${Math.round(Number(amount) || 0).toLocaleString('vi-VN')} ₫`;
}

/** Chặn HTML injection từ tên sản phẩm hoặc tên khách. */
export function escapeHtml(input: string): string {
  return String(input)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function orderEmailSubject(data: OrderEmailData): string {
  return `Xác nhận đơn hàng ${data.orderCode} — Declay`;
}

export function buildOrderConfirmationHtml(data: OrderEmailData): string {
  const rows = data.items
    .map((item) => {
      const label = item.variantName
        ? `${escapeHtml(item.name)} <span style="color:#888">· ${escapeHtml(item.variantName)}</span>`
        : escapeHtml(item.name);
      return `
        <tr>
          <td style="padding:10px 0;border-bottom:1px solid #eee">
            ${label}<br/>
            <span style="color:#888;font-size:13px">${formatVndEmail(item.unitPriceVnd)} × ${item.quantity}</span>
          </td>
          <td style="padding:10px 0;border-bottom:1px solid #eee;text-align:right;white-space:nowrap">
            ${formatVndEmail(item.unitPriceVnd * item.quantity)}
          </td>
        </tr>`;
    })
    .join('');

  const summaryRow = (label: string, value: string, bold = false) => `
    <tr>
      <td style="padding:4px 0;${bold ? 'font-weight:600;font-size:16px' : 'color:#666'}">${label}</td>
      <td style="padding:4px 0;text-align:right;${bold ? 'font-weight:600;font-size:16px' : 'color:#666'}">${value}</td>
    </tr>`;

  const tracking = data.trackingNumber
    ? `
      <div style="margin:20px 0;padding:14px 16px;background:#f8f4ef;border-left:4px solid #7c5c3e;border-radius:6px">
        <div style="color:#888;font-size:12px;text-transform:uppercase;letter-spacing:.5px">Mã vận đơn${data.carrier ? ` · ${escapeHtml(data.carrier)}` : ''}</div>
        <div style="font-family:monospace;font-size:18px;font-weight:600;margin-top:4px">${escapeHtml(data.trackingNumber)}</div>
      </div>`
    : `
      <p style="margin:20px 0;padding:12px 16px;background:#f8f4ef;border-radius:6px;color:#666;font-size:14px">
        Mã vận đơn sẽ được gửi trong email tiếp theo khi cửa hàng bàn giao hàng cho đơn vị vận chuyển.
      </p>`;

  const lookup = data.lookupUrl
    ? `
      <p style="font-size:14px;color:#666">Tra cứu đơn hàng bất cứ lúc nào:</p>
      <p><a href="${data.lookupUrl}" style="color:#7c5c3e">${data.lookupUrl}</a></p>`
    : '';

  return `
    <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;max-width:560px;margin:0 auto;padding:32px;color:#222">
      <h2 style="color:#7c5c3e;margin:0 0 4px">Cảm ơn bạn, ${escapeHtml(data.customerName)}!</h2>
      <p style="margin:0 0 20px;color:#666">Đơn hàng <strong style="font-family:monospace">${escapeHtml(data.orderCode)}</strong> đã được thanh toán thành công.</p>

      ${tracking}

      <table style="width:100%;border-collapse:collapse;margin:24px 0 8px">${rows}</table>

      <table style="width:100%;border-collapse:collapse;margin-bottom:24px">
        ${summaryRow('Tạm tính', formatVndEmail(data.subtotalVnd))}
        ${data.discountVnd > 0 ? summaryRow('Giảm giá', `−${formatVndEmail(data.discountVnd)}`) : ''}
        ${summaryRow('Phí vận chuyển', data.shippingFeeVnd === 0 ? 'Miễn phí' : formatVndEmail(data.shippingFeeVnd))}
        ${summaryRow('Tổng cộng', formatVndEmail(data.totalVnd), true)}
      </table>

      <div style="font-size:14px;color:#666;line-height:1.6">
        <div><strong style="color:#222">Thanh toán:</strong> ${escapeHtml(data.paymentMethodLabel)}</div>
        <div><strong style="color:#222">Giao đến:</strong> ${escapeHtml(data.shippingAddress)}</div>
      </div>

      ${lookup}

      <p style="color:#888;font-size:12px;margin-top:28px;border-top:1px solid #eee;padding-top:16px">
        Nếu bạn không thực hiện đơn hàng này, vui lòng liên hệ cửa hàng ngay.
      </p>
    </div>`;
}


/* ── M-18: email thứ hai — báo mã vận đơn ───────────────── */

export interface ShipmentEmailData {
  orderCode: string;
  customerName: string;
  trackingNumber: string;
  carrier: string;
  /** Trang tra cứu công khai của hãng vận chuyển. */
  trackingUrl?: string | null;
  expectedDeliveryAt?: Date | string | null;
  items: OrderEmailItem[];
  shippingAddress: string;
  /** Số tiền shipper sẽ thu khi giao (đơn COD). 0 = đã trả trước. */
  codAmountVnd?: number;
  lookupUrl?: string | null;
}

export function shipmentEmailSubject(data: ShipmentEmailData): string {
  return `Đơn ${data.orderCode} đã được gửi đi — mã vận đơn ${data.trackingNumber}`;
}

/** Ngày dự kiến giao, theo giờ Việt Nam. */
export function formatDeliveryDate(value: Date | string | null | undefined): string | null {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return new Intl.DateTimeFormat('vi-VN', {
    timeZone: 'Asia/Ho_Chi_Minh', weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric',
  }).format(date);
}

export function buildShipmentNotificationHtml(data: ShipmentEmailData): string {
  const eta = formatDeliveryDate(data.expectedDeliveryAt);

  const itemLines = data.items
    .map((i) => `<li style="margin:2px 0">${escapeHtml(i.name)}${i.variantName ? ` · ${escapeHtml(i.variantName)}` : ''} × ${i.quantity}</li>`)
    .join('');

  // Khách COD cần biết CHÍNH XÁC phải chuẩn bị bao nhiêu tiền mặt trước khi
  // shipper tới — đây là thông tin hữu ích nhất của email này với họ.
  const cod = data.codAmountVnd && data.codAmountVnd > 0
    ? `
      <p style="margin:16px 0;padding:12px 16px;background:#fff6e5;border-left:4px solid #d9932b;border-radius:6px;font-size:14px">
        <strong>Chuẩn bị tiền mặt:</strong> ${formatVndEmail(data.codAmountVnd)}<br/>
        <span style="color:#666">Shipper sẽ thu khi giao hàng.</span>
      </p>`
    : `
      <p style="margin:16px 0;font-size:14px;color:#666">
        Đơn hàng đã thanh toán — bạn không cần trả thêm khi nhận hàng.
      </p>`;

  const track = data.trackingUrl
    ? `<p style="margin:12px 0 0">
         <a href="${data.trackingUrl}" style="display:inline-block;padding:10px 18px;background:#7c5c3e;color:#fff;text-decoration:none;border-radius:6px;font-size:14px">
           Theo dõi đơn hàng
         </a>
       </p>`
    : '';

  return `
    <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;max-width:560px;margin:0 auto;padding:32px;color:#222">
      <h2 style="color:#7c5c3e;margin:0 0 4px">Đơn hàng của bạn đang trên đường!</h2>
      <p style="margin:0 0 20px;color:#666">
        Xin chào ${escapeHtml(data.customerName)}, đơn <strong style="font-family:monospace">${escapeHtml(data.orderCode)}</strong> đã được bàn giao cho ${escapeHtml(data.carrier)}.
      </p>

      <div style="margin:20px 0;padding:16px;background:#f8f4ef;border-left:4px solid #7c5c3e;border-radius:6px">
        <div style="color:#888;font-size:12px;text-transform:uppercase;letter-spacing:.5px">Mã vận đơn · ${escapeHtml(data.carrier)}</div>
        <div style="font-family:monospace;font-size:20px;font-weight:600;margin-top:4px;letter-spacing:1px">${escapeHtml(data.trackingNumber)}</div>
        ${eta ? `<div style="margin-top:8px;font-size:14px;color:#666">Dự kiến giao: <strong style="color:#222">${escapeHtml(eta)}</strong></div>` : ''}
        ${track}
      </div>

      ${cod}

      <div style="font-size:14px;color:#666;line-height:1.6;margin-top:20px">
        <strong style="color:#222">Kiện hàng gồm:</strong>
        <ul style="margin:6px 0 0;padding-left:20px">${itemLines}</ul>
      </div>

      <div style="font-size:14px;color:#666;line-height:1.6;margin-top:16px">
        <strong style="color:#222">Giao đến:</strong> ${escapeHtml(data.shippingAddress)}
      </div>

      ${data.lookupUrl ? `<p style="font-size:14px;color:#666;margin-top:20px">Tra cứu đơn hàng: <a href="${data.lookupUrl}" style="color:#7c5c3e">${data.lookupUrl}</a></p>` : ''}

      <p style="color:#888;font-size:12px;margin-top:28px;border-top:1px solid #eee;padding-top:16px">
        Vui lòng giữ điện thoại liên lạc để shipper gọi khi giao hàng.
      </p>
    </div>`;
}
