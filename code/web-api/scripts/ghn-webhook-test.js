#!/usr/bin/env node
/**
 * Giả lập webhook trạng thái của GHN — POST payload mẫu vào endpoint của mình.
 *
 *   node scripts/ghn-webhook-test.js <MA_VAN_DON_GHN> [status]
 *   node scripts/ghn-webhook-test.js FFFNL9HH                 # chạy cả chuỗi
 *   node scripts/ghn-webhook-test.js FFFNL9HH delivered       # chỉ 1 trạng thái
 *
 * MA_VAN_DON_GHN = tracking_number của đơn (order_shipments.tracking_number).
 * Base URL lấy từ APP_WEBHOOK_URL hoặc mặc định http://localhost:3001.
 */
const TRACKING = process.argv[2];
const ONE_STATUS = process.argv[3] || null;
const BASE = (process.env.APP_WEBHOOK_URL || 'http://localhost:3001').replace(/\/+$/, '');

if (!TRACKING) {
  console.error('\nThiếu mã vận đơn. Ví dụ: node scripts/ghn-webhook-test.js FFFNL9HH\n');
  process.exit(1);
}

// Chuỗi trạng thái GHN theo đúng luồng giao hàng (docs id=48).
const FLOW = ['ready_to_pick', 'picked', 'transporting', 'delivering', 'delivered'];
const statuses = ONE_STATUS ? [ONE_STATUS] : FLOW;

const DESС = {
  ready_to_pick: 'Đơn hàng vừa được tạo',
  picked: 'Shipper đã lấy hàng',
  transporting: 'Hàng đang luân chuyển',
  delivering: 'Shipper đang giao hàng',
  delivered: 'Đã giao thành công',
  delivery_fail: 'Giao không thành công',
  returned: 'Đã hoàn hàng về shop',
  cancel: 'Đơn đã huỷ',
};

async function fire(status) {
  const payload = {
    OrderCode: TRACKING,
    ClientOrderCode: '',
    Status: status,
    Type: 'switch_status',
    Description: DESС[status] || status,
    Time: new Date().toISOString(),
    ShopID: Number(process.env.GHN_SHOP_ID) || 0,
    Weight: 500, CODAmount: 0, TotalFee: 0,
  };
  const res = await fetch(`${BASE}/api/webhooks/ghn`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const text = await res.text();
  console.log(`  ${status.padEnd(16)} -> HTTP ${res.status}  ${text.slice(0, 80)}`);
}

(async () => {
  console.log(`\nGiả lập webhook GHN cho vận đơn ${TRACKING} tại ${BASE}\n`);
  for (const s of statuses) {
    await fire(s);
    await new Promise((r) => setTimeout(r, 400)); // giãn cách để dễ đọc log
  }
  console.log('\nXong. Kiểm tra trạng thái đơn ở trang admin — nó phải đổi theo.\n');
})().catch((e) => { console.error('Lỗi:', e.message); process.exit(1); });
