#!/usr/bin/env node
/**
 * Soi mã địa giới GHN của các địa chỉ đã lưu.
 *   node scripts/address-check.js                 # tất cả địa chỉ
 *   node scripts/address-check.js user@email.com  # theo email khách
 *
 * Trả lời đúng một câu: địa chỉ này đã có ghn_district_id / ghn_ward_code chưa?
 * Nếu CÓ mà checkout vẫn báo thiếu -> server đang chạy bản build cũ, cần rebuild.
 */
require('dotenv').config();
const { Sequelize } = require('sequelize');

const email = process.argv[2] || null;

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
  // Postgres từ xa (Render, v.v.) thường bắt buộc SSL; local thì không.
  dialectOptions: isRemote ? { ssl: { require: true, rejectUnauthorized: false } } : {},
});

if (!process.env.DB_NAME) {
  console.error('\n✗ Thiếu cấu hình DB trong .env (DB_HOST/DB_PORT/DB_USER/DB_PASSWORD/DB_NAME).\n');
  process.exit(1);
}

(async () => {
  // Cột có tồn tại không? Thiếu là migration 022 chưa chạy.
  const [cols] = await sequelize.query(`
    SELECT column_name FROM information_schema.columns
    WHERE table_name = 'addresses' AND column_name LIKE 'ghn_%';
  `);
  const have = cols.map((c) => c.column_name);
  console.log('\nCột GHN trên bảng addresses:', have.length ? have.join(', ') : '(KHÔNG CÓ)');
  if (have.length < 3) {
    console.log('✗ Thiếu cột GHN — chạy: npm run migrate (migration 022)\n');
    process.exit(1);
  }

  const where = email
    ? `WHERE u.email = ${sequelize.escape(email)}`
    : '';
  const [rows] = await sequelize.query(`
    SELECT a.id, a.receiver_name, a.ward, a.district, a.city,
           a.ghn_province_id, a.ghn_district_id, a.ghn_ward_code, a.is_default,
           u.email
    FROM addresses a
    LEFT JOIN users u ON u.id = a.user_id
    ${where}
    ORDER BY a.id DESC LIMIT 30;
  `);

  if (rows.length === 0) { console.log('\nKhông có địa chỉ nào.\n'); process.exit(0); }

  console.log(`\nTìm thấy ${rows.length} địa chỉ:\n`);
  let missing = 0;
  for (const r of rows) {
    const ok = r.ghn_district_id != null && r.ghn_ward_code != null;
    if (!ok) missing += 1;
    console.log(`${ok ? '✓' : '✗'} #${r.id}${r.is_default ? ' (mặc định)' : ''} — ${r.receiver_name} · ${r.email ?? 'guest'}`);
    console.log(`   text: ${r.ward}, ${r.district}, ${r.city}`);
    console.log(`   GHN : district=${r.ghn_district_id ?? 'NULL'} ward=${r.ghn_ward_code ?? 'NULL'} province=${r.ghn_province_id ?? 'NULL'}`);
    console.log('');
  }

  if (missing > 0) {
    console.log(`✗ ${missing} địa chỉ CHƯA có mã GHN.`);
    console.log('  → Nếu bạn ĐÃ sửa qua trang Tài khoản mà vẫn NULL: backend đang chạy bản cũ.');
    console.log('    Rebuild + restart API (npm run build && npm start), rồi sửa lại địa chỉ.\n');
  } else {
    console.log('✓ Mọi địa chỉ đều có mã GHN.');
    console.log('  → Nếu checkout vẫn báo thiếu: FRONTEND đang chạy bản cũ. Rebuild + restart web.\n');
  }
  await sequelize.close();
})().catch((e) => { console.error('\n✗ Lỗi:', e.message, '\n'); process.exit(1); });
