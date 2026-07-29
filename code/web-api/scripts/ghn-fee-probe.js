#!/usr/bin/env node
/**
 * Gọi THẲNG các endpoint GHN và in RA BODY THÔ của phản hồi.
 *   node scripts/ghn-fee-probe.js
 *   node scripts/ghn-fee-probe.js <toDistrictId> <toWardCode>
 *
 * Mục đích: bỏ hết suy đoán. 404 của GHN có thể là:
 *   - Trang HTML "404 not found"  -> sai PATH hoặc method (lỗi phía mình)
 *   - JSON {code:404, message}    -> GHN từ chối có lý do (shop/route/quyền)
 * Chỉ khi thấy body thật mới biết chắc.
 */
require('dotenv').config();

const TOKEN = (process.env.GHN_TOKEN || '').trim();
const SHOP_ID = (process.env.GHN_SHOP_ID || '').trim();
const BASE = (process.env.GHN_BASE_URL || 'https://dev-online-gateway.ghn.vn').trim();
const FROM_DISTRICT = Number(process.env.GHN_FROM_DISTRICT_ID) || 0;
const FROM_WARD = (process.env.GHN_FROM_WARD_CODE || '').trim();
const SERVICE_TYPE = Number(process.env.GHN_SERVICE_TYPE_ID) || 2;

const toDistrict = Number(process.argv[2]) || 1542;
const toWard = process.argv[3] || '1B1516';

async function raw(path, body, method = 'POST') {
  const url = `${BASE}/shiip/public-api${path}`;
  const res = await fetch(url, {
    method,
    headers: { 'Content-Type': 'application/json', Token: TOKEN, ShopId: SHOP_ID },
    ...(method === 'POST' ? { body: JSON.stringify(body) } : {}),
  });
  const text = await res.text();
  console.log(`\n>>> ${method} ${url}`);
  console.log(`    ShopId header: ${SHOP_ID || '(rỗng)'}`);
  console.log(`    HTTP ${res.status} ${res.statusText} · content-type: ${res.headers.get('content-type')}`);
  console.log('    BODY:', text.slice(0, 800));
  try { return JSON.parse(text); } catch { return null; }
}

(async () => {
  if (!TOKEN) { console.error('Thiếu GHN_TOKEN'); process.exit(1); }
  console.log(`BASE = ${BASE}`);

  // 1) shop/all — lấy shop thật của token
  const shopRes = await raw('/v2/shop/all', { offset: 0, limit: 50, client_phone: '' });
  const shops = shopRes?.data?.shops || [];
  const shop = shops.find((s) => String(s._id) === String(SHOP_ID)) || shops[0];
  console.log('\n=== Shops của token này ===');
  for (const s of shops) console.log(`   _id=${s._id} district=${s.district_id} ward=${s.ward_code} name=${s.name}`);
  if (shop && String(shop._id) !== String(SHOP_ID)) {
    console.log(`\n⚠ GHN_SHOP_ID=${SHOP_ID} KHÔNG khớp _id nào ở trên.`);
  }

  const fromDistrict = FROM_DISTRICT || shop?.district_id;
  const fromWard = FROM_WARD || String(shop?.ward_code ?? '');

  // 2) available-services (tuyến from -> to)
  const svc = await raw('/v2/shipping-order/available-services', {
    shop_id: Number(shop?._id ?? SHOP_ID),
    from_district: fromDistrict,
    to_district: toDistrict,
  });
  const services = svc?.data || [];
  const serviceId = services[0]?.service_id;

  // 3) fee
  const feeBody = {
    from_district_id: fromDistrict,
    from_ward_code: fromWard,
    to_district_id: toDistrict,
    to_ward_code: String(toWard),
    weight: 500, length: 15, width: 15, height: 15,
  };
  if (serviceId) feeBody.service_id = serviceId;
  else feeBody.service_type_id = SERVICE_TYPE;
  await raw('/v2/shipping-order/fee', feeBody);

  console.log('\n(Hãy gửi lại toàn bộ output này.)\n');
})().catch((e) => { console.error('Lỗi:', e.message); process.exit(1); });
