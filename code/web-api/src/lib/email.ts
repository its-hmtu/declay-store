import nodemailer from 'nodemailer';
import config from '@/config/env';
import type { OrderStatus } from '@/modules/order/order.entity';

let transporter: nodemailer.Transporter | null = null;

function getTransporter(): nodemailer.Transporter {
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: config.email.host,
      port: config.email.port,
      secure: config.email.port === 465,
      auth: {
        user: config.email.user,
        pass: config.email.pass,
      },
    });
  }
  return transporter;
}

export async function sendVerificationEmail(to: string, token: string): Promise<void> {
  const verifyUrl = `${config.oauth.frontendUrl}/auth/verify-email?token=${token}`;

  await getTransporter().sendMail({
    from: config.email.from,
    to,
    subject: 'Verify your Declay Store email',
    html: `
      <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px">
        <h2 style="color:#7c5c3e">Welcome to Declay Store</h2>
        <p>Click the button below to verify your email address. This link expires in 24 hours.</p>
        <a href="${verifyUrl}"
           style="display:inline-block;padding:12px 24px;background:#7c5c3e;color:#fff;border-radius:6px;text-decoration:none;margin:16px 0">
          Verify Email
        </a>
        <p style="color:#888;font-size:12px">If you didn't create an account, you can ignore this email.</p>
        <p style="color:#aaa;font-size:11px;word-break:break-all">Or copy this link: ${verifyUrl}</p>
      </div>
    `,
  });
}

export async function sendPasswordResetEmail(to: string, token: string): Promise<void> {
  const resetUrl = `${config.oauth.frontendUrl}/auth/reset-password?token=${token}`;

  await getTransporter().sendMail({
    from: config.email.from,
    to,
    subject: 'Reset your Declay Store password',
    html: `
      <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px">
        <h2 style="color:#7c5c3e">Password Reset</h2>
        <p>Click the button below to reset your password. This link expires in 1 hour.</p>
        <a href="${resetUrl}"
           style="display:inline-block;padding:12px 24px;background:#7c5c3e;color:#fff;border-radius:6px;text-decoration:none;margin:16px 0">
          Reset Password
        </a>
        <p style="color:#888;font-size:12px">If you didn't request a password reset, you can safely ignore this email.</p>
        <p style="color:#aaa;font-size:11px;word-break:break-all">Or copy this link: ${resetUrl}</p>
      </div>
    `,
  });
}

function formatOrderStatus(status: OrderStatus): string {
  return status
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (m) => m.toUpperCase());
}

export async function sendOrderStatusEmail(
  to: string,
  orderId: number,
  status: OrderStatus,
  details?: {
    carrier?: string | null;
    trackingNumber?: string | null;
    estimatedDeliveryAt?: string | null;
  },
): Promise<void> {
  const ordersUrl = `${config.oauth.frontendUrl}/orders`;
  const statusLabel = formatOrderStatus(status);

  await getTransporter().sendMail({
    from: config.email.from,
    to,
    subject: `Order #${orderId} status updated to ${statusLabel}`,
    html: `
      <div style="font-family:sans-serif;max-width:560px;margin:0 auto;padding:32px">
        <h2 style="color:#7c5c3e">Order #${orderId}</h2>
        <p>Your order status has been updated to <strong>${statusLabel}</strong>.</p>
        <p style="margin:16px 0;padding:12px 16px;background:#f8f4ef;border-left:4px solid #7c5c3e;border-radius:6px">
          ${details?.carrier ? `<strong>Carrier:</strong> ${details.carrier}<br/>` : ''}
          ${details?.trackingNumber ? `<strong>Tracking number:</strong> ${details.trackingNumber}<br/>` : ''}
          ${details?.estimatedDeliveryAt ? `<strong>Estimated delivery:</strong> ${new Date(details.estimatedDeliveryAt).toLocaleString()}<br/>` : ''}
          <strong>Status:</strong> ${statusLabel}
        </p>
        <p>You can view your order history here:</p>
        <p><a href="${ordersUrl}" style="color:#7c5c3e">${ordersUrl}</a></p>
        <p style="color:#888;font-size:12px">If you didn't expect this update, contact support.</p>
      </div>
    `,
  });
}


/**
 * M-33: email thông báo chung cho khách (thay cho thông báo on-site đã bỏ).
 * Dùng cho các sự kiện trước đây chỉ hiện trên chuông (vd duyệt/từ chối trả hàng).
 */
export async function sendCustomerNotice(to: string, subject: string, body: string): Promise<void> {
  const url = `${config.oauth.frontendUrl}/account/orders`;
  await getTransporter().sendMail({
    from: config.email.from,
    to,
    subject,
    html: `
      <div style="font-family:sans-serif;max-width:560px;margin:0 auto;padding:32px">
        <h2 style="color:#7c5c3e">${subject}</h2>
        <p>${body}</p>
        <p><a href="${url}" style="color:#7c5c3e">Xem đơn hàng của bạn</a></p>
        <p style="color:#888;font-size:12px">Nếu bạn không mong đợi thông báo này, vui lòng liên hệ hỗ trợ.</p>
      </div>
    `,
  });
}

/**
 * M-17: email xác nhận đơn hàng, đầy đủ sản phẩm và số tiền.
 *
 * Gửi cho CẢ khách vãng lai. Với họ đây là hoá đơn duy nhất — không có tài
 * khoản thì không có trang lịch sử đơn để xem lại.
 */
export async function sendOrderConfirmation(orderId: number): Promise<void> {
  const { Order, OrderItem, OrderShipment } = await import('@/modules/order/order.entity');
  const { default: Address } = await import('@/modules/address/address.entity');
  const { default: User } = await import('@/modules/user/user.entity');
  const { buildOrderConfirmationHtml, orderEmailSubject } = await import('@/lib/order-email');

  const order = await Order.findByPk(orderId, {
    include: [
      { model: User, as: 'user', attributes: ['email', 'fullName'] },
      { model: OrderItem, as: 'items' },
      { model: Address, as: 'shippingAddress' },
      { model: OrderShipment, as: 'shipment' },
    ],
  });
  if (!order) return;

  const anyOrder = order as unknown as {
    user?: { email?: string; fullName?: string };
    items?: { productNameAtPurchase: string; variantNameAtPurchase: string | null; quantity: number; priceAtPurchase: number }[];
    shippingAddress?: { receiverName: string; addressLine: string; ward: string; district: string; city: string };
    shipment?: { trackingNumber: string | null; carrier: string | null } | null;
  };

  const recipient = anyOrder.user?.email ?? order.guestEmail ?? null;
  if (!recipient) return;

  const address = anyOrder.shippingAddress;
  const lookupUrl = order.guestToken
    ? `${config.oauth.frontendUrl}/orders/lookup?token=${encodeURIComponent(order.guestToken)}`
    : null;

  const data = {
    orderCode: order.orderCode,
    customerName: anyOrder.user?.fullName ?? order.guestName ?? address?.receiverName ?? 'bạn',
    items: (anyOrder.items ?? []).map((i) => ({
      name: i.productNameAtPurchase,
      variantName: i.variantNameAtPurchase,
      quantity: i.quantity,
      unitPriceVnd: Number(i.priceAtPurchase),
    })),
    subtotalVnd: Number(order.subtotal),
    shippingFeeVnd: Number(order.shippingFee),
    discountVnd: Number(order.discountAmount),
    totalVnd: Number(order.totalAmount),
    paymentMethodLabel: order.stripePaymentIntentId ? 'Thẻ quốc tế' : 'VNPay / COD',
    shippingAddress: address
      ? [address.addressLine, address.ward, address.district, address.city].filter(Boolean).join(', ')
      : '',
    trackingNumber: anyOrder.shipment?.trackingNumber ?? null,
    carrier: anyOrder.shipment?.carrier ?? null,
    lookupUrl,
  };

  await getTransporter().sendMail({
    from: config.email.from,
    to: recipient,
    subject: orderEmailSubject(data),
    html: buildOrderConfirmationHtml(data),
  });
}


/**
 * M-18: email thứ hai — báo mã vận đơn.
 *
 * Gửi khi admin tạo vận đơn, không phải lúc khách thanh toán: theo luồng hiện
 * tại vận đơn chỉ tồn tại sau bước xác nhận đơn, nên email xác nhận đầu tiên
 * không thể chứa mã này.
 */
export async function sendShipmentNotification(orderId: number): Promise<void> {
  const { Order, OrderItem, OrderShipment } = await import('@/modules/order/order.entity');
  const { default: Address } = await import('@/modules/address/address.entity');
  const { default: User } = await import('@/modules/user/user.entity');
  const { buildShipmentNotificationHtml, shipmentEmailSubject } = await import('@/lib/order-email');

  const order = await Order.findByPk(orderId, {
    include: [
      { model: User, as: 'user', attributes: ['email', 'fullName'] },
      { model: OrderItem, as: 'items' },
      { model: Address, as: 'shippingAddress' },
      { model: OrderShipment, as: 'shipment' },
    ],
  });
  if (!order) return;

  const anyOrder = order as unknown as {
    user?: { email?: string; fullName?: string };
    items?: { productNameAtPurchase: string; variantNameAtPurchase: string | null; quantity: number; priceAtPurchase: number }[];
    shippingAddress?: { receiverName: string; addressLine: string; ward: string; district: string; city: string };
    shipment?: { trackingNumber: string | null; carrier: string | null; estimatedDeliveryAt: Date | null } | null;
  };

  // Khách vãng lai không có `user` — lấy email họ đã nhập lúc đặt hàng.
  const recipient = anyOrder.user?.email ?? order.guestEmail ?? null;
  const shipment = anyOrder.shipment;
  if (!recipient || !shipment?.trackingNumber) {
    console.warn(`⚠️ Đơn ${orderId}: thiếu email người nhận hoặc mã vận đơn — bỏ qua email vận chuyển.`);
    return;
  }

  const carrier = shipment.carrier ?? 'GHN';
  const address = anyOrder.shippingAddress;

  const data = {
    orderCode: order.orderCode,
    customerName: anyOrder.user?.fullName ?? order.guestName ?? address?.receiverName ?? 'bạn',
    trackingNumber: shipment.trackingNumber,
    carrier,
    trackingUrl: carrier.toUpperCase() === 'GHN'
      ? `https://donhang.ghn.vn/?order_code=${encodeURIComponent(shipment.trackingNumber)}`
      : null,
    expectedDeliveryAt: shipment.estimatedDeliveryAt ?? null,
    items: (anyOrder.items ?? []).map((i) => ({
      name: i.productNameAtPurchase,
      variantName: i.variantNameAtPurchase,
      quantity: i.quantity,
      unitPriceVnd: Number(i.priceAtPurchase),
    })),
    shippingAddress: address
      ? [address.addressLine, address.ward, address.district, address.city].filter(Boolean).join(', ')
      : '',
    // Đơn đã thanh toán thì shipper KHÔNG thu thêm — nói rõ để khách không
    // chuẩn bị tiền thừa hoặc bị shipper thu nhầm.
    codAmountVnd: order.status === 'paid' ? 0 : Number(order.totalAmount),
    lookupUrl: order.guestToken
      ? `${config.oauth.frontendUrl}/orders/lookup?token=${encodeURIComponent(order.guestToken)}`
      : null,
  };

  await getTransporter().sendMail({
    from: config.email.from,
    to: recipient,
    subject: shipmentEmailSubject(data),
    html: buildShipmentNotificationHtml(data),
  });
}
