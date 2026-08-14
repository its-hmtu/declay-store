'use strict';
const fs = require('fs');
const path = require('path');
const SQL_FILE = path.join(__dirname, '021_switch_to_vnd.sql');

/**
 * M-15: chuyển hệ thống sang VND.
 *
 * Tỉ giá quy đổi dữ liệu CŨ lấy từ VND_MIGRATION_RATE (mặc định 26000).
 * Chạy đúng một lần — `schema_migrations` đảm bảo không nhân đôi giá.
 *
 * Quy tắc quy đổi:
 *  - Làm tròn tới 1.000đ gần nhất (giá niêm yết Việt Nam không có số lẻ).
 *  - KHÔNG đụng vào discount_codes.value khi type='percent' — đó là phần trăm,
 *    nhân tỉ giá vào sẽ thành mã giảm 2.600.000%.
 *  - Đơn hàng đã tạo cũng quy đổi để báo cáo doanh thu không lẫn hai đơn vị.
 */
const RATE = Number(process.env.VND_MIGRATION_RATE || 26000);
const R = (col) => `ROUND((${col} * ${RATE}) / 1000.0) * 1000`;

module.exports = {
  async up(queryInterface) {
    const sequelize = queryInterface.sequelize;
    if (!Number.isFinite(RATE) || RATE < 1000) {
      throw new Error(`VND_MIGRATION_RATE khong hop le: "${process.env.VND_MIGRATION_RATE}"`);
    }
    await sequelize.query(fs.readFileSync(SQL_FILE, 'utf8'));

    await sequelize.query(`UPDATE product_variants SET
      price = ${R('price')},
      special_price = CASE WHEN special_price IS NULL THEN NULL ELSE ${R('special_price')} END,
      cost_price    = CASE WHEN cost_price    IS NULL THEN NULL ELSE ${R('cost_price')} END;`);

    await sequelize.query(`UPDATE orders SET
      total_amount = ${R('total_amount')}, subtotal = ${R('subtotal')},
      shipping_fee = ${R('shipping_fee')}, discount_amount = ${R('discount_amount')};`);

    await sequelize.query(`UPDATE order_items SET price_at_purchase = ${R('price_at_purchase')};`);

    // Chỉ mã giảm theo SỐ TIỀN mới quy đổi; mã theo phần trăm giữ nguyên.
    await sequelize.query(`UPDATE discount_codes SET
      value = CASE WHEN type = 'fixed' THEN ${R('value')} ELSE value END,
      min_order_amount = ${R('min_order_amount')};`);

    await sequelize.query(`UPDATE payments SET
      amount = ${R('amount')},
      reconciled_amount = CASE WHEN reconciled_amount IS NULL THEN NULL ELSE ${R('reconciled_amount')} END,
      currency = 'vnd';`);

    await sequelize.query(`UPDATE refunds SET amount = ${R('amount')};`);

    await sequelize.query(`UPDATE shipping_methods SET
      fee = ${R('fee')},
      free_over = CASE WHEN free_over IS NULL THEN NULL ELSE ${R('free_over')} END;`);
  },

  async down() {
    // Không tự động đảo ngược: nhân/chia tỉ giá hai chiều làm mất số lẻ ban đầu.
    // Muốn quay lại phải phục hồi từ bản sao lưu.
    throw new Error('021_switch_to_vnd khong the rollback tu dong — hay phuc hoi tu ban sao luu.');
  },
};
