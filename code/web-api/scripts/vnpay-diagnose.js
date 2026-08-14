#!/usr/bin/env node
/**
 * Chẩn đoán đơn VNPay bị treo ở pending_payment.
 *   node scripts/vnpay-diagnose.js [orderId]
 *
 * Trả lời đúng một câu hỏi: đơn này dừng ở bước nào — chưa quy đổi tiền,
 * chưa nhận được callback, hay callback bị từ chối?
 */
require('dotenv').config();
const { Sequelize } = require('sequelize');

const orderId = process.argv[2] ? Number(process.argv[2]) : null;

// Đọc DB theo ĐÚNG cách app đọc (biến rời), không phải DATABASE_URL.
const host = process.env.DB_HOST || 'localhost';
const isRemote = !['localhost', '127.0.0.1'].includes(host);
const sequelize = new Sequelize({
  dialect: 'postgres',
  host,
  port: Number(process.env.DB_PORT) || 5432,
  database: process.env.DB_NAME,
  username: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  logging: false,
  dialectOptions: isRemote ? { ssl: { require: true, rejectUnauthorized: false } } : {},
});

(async () => {
  const where = orderId ? `o.id = ${orderId}` : `o.status = 'pending_payment' AND p.provider = 'vnpay'`;
  const [rows] = await sequelize.query(`
    SELECT o.id, o.status AS order_status, o.total_amount, o.created_at,
           p.provider, p.status AS payment_status, p.charged_amount, p.fx_rate, p.provider_ref
    FROM orders o
    LEFT JOIN payments p ON p.order_id = o.id
    WHERE ${where}
    ORDER BY o.id DESC LIMIT 20;
  `);

  if (rows.length === 0) {
    console.log('Không tìm thấy đơn VNPay nào đang treo. 👍');
    process.exit(0);
  }

  console.log(`\nTìm thấy ${rows.length} đơn:\n`);
  for (const r of rows) {
    console.log(`── Đơn #${r.id}  [${r.order_status}]  $${r.total_amount}  ${new Date(r.created_at).toLocaleString('vi-VN')}`);
    console.log(`   payment: provider=${r.provider} status=${r.payment_status} ref=${r.provider_ref ?? '(chưa có)'}`);
    console.log(`   đã chốt: ${r.charged_amount ?? '(THIẾU)'} VND @ tỉ giá ${r.fx_rate ?? '(THIẾU)'}`);

    if (r.provider !== 'vnpay') {
      console.log('   → Đơn này không thanh toán qua VNPay.');
    } else if (r.charged_amount == null) {
      console.log('   → NGUYÊN NHÂN: tạo trước migration 020, không có bản chốt số tiền.');
      console.log('     IPN sẽ luôn trả RspCode 01. Huỷ đơn này và đặt lại.');
    } else if (r.provider_ref == null) {
      console.log('   → NGUYÊN NHÂN: chưa hề nhận được callback nào từ VNPay.');
      console.log('     Kiểm tra: (1) IPN URL đã khai báo trên cổng merchant chưa;');
      console.log('               (2) máy chủ có truy cập được từ Internet không;');
      console.log('               (3) dịch vụ có đang ngủ (Render Free) không.');
    } else if (r.payment_status === 'failed') {
      console.log('   → Khách đã huỷ hoặc ngân hàng từ chối. Đơn treo là ĐÚNG.');
    } else {
      console.log('   → Đã có callback nhưng đơn chưa chuyển trạng thái — xem log "VNPay settlement decision".');
    }
    console.log('');
  }
  await sequelize.close();
})().catch((e) => { console.error(e.message); process.exit(1); });
