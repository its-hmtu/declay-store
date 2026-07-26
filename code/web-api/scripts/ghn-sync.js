#!/usr/bin/env node
/**
 * Đồng bộ dữ liệu địa giới GHN vào cơ sở dữ liệu.
 *   node scripts/ghn-sync.js
 *
 * Chưa cấu hình GHN_TOKEN/GHN_SHOP_ID thì nạp DỮ LIỆU MẪU để chạy được ở dev.
 * Chạy lại sau khi có token thật để ghi đè bằng dữ liệu đầy đủ.
 */
require('dotenv').config();
require('../register-paths');

(async () => {
  const { default: GhnService } = require('../dist/modules/shipping-provider/ghn/ghn.service');
  const service = new GhnService();
  console.log(service.isMock
    ? '⚠️  Chưa có GHN_TOKEN/GHN_SHOP_ID — nạp DỮ LIỆU MẪU (chỉ dùng cho dev).'
    : '→ Đang đồng bộ từ GHN…');
  // In tiến độ: 63 tỉnh × (1 lời gọi quận + N lời gọi phường) mất khá lâu,
  // không có tiến độ thì không biết đang chạy hay đã treo.
  const result = await service.syncMasterData((msg) => console.log('  ·', msg));
  console.log(`✓ ${result.provinces} tỉnh/thành, ${result.districts} quận/huyện, ${result.wards} phường/xã.`);
  process.exit(0);
})().catch((e) => { console.error('✗', e.message); process.exit(1); });
