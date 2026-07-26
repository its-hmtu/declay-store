#!/usr/bin/env node
/**
 * Tự kiểm tra tích hợp GHN — chạy TRƯỚC khi đồng bộ dữ liệu địa giới.
 *   node scripts/ghn-check.js
 *
 * Mỗi bước kiểm tra một giả định có thể sai, và nói rõ phải sửa gì.
 * Không in token ra màn hình.
 */
require('dotenv').config();

const TOKEN = (process.env.GHN_TOKEN || '').trim();
const SHOP_ID = (process.env.GHN_SHOP_ID || '').trim();
const BASE_URL = (process.env.GHN_BASE_URL || 'https://online-gateway.ghn.vn').trim();
const ALLOW_WRITE = (process.env.GHN_ALLOW_WRITE || '').trim() === 'true';
const FROM_DISTRICT = Number(process.env.GHN_FROM_DISTRICT_ID) || 0;
const FROM_WARD = (process.env.GHN_FROM_WARD_CODE || '').trim();
const SERVICE_TYPE = Number(process.env.GHN_SERVICE_TYPE_ID) || 2;

const mask = (v) => (v ? `${v.slice(0, 4)}…${v.slice(-2)} (${v.length} ký tự)` : '(rỗng)');
let failed = 0;
const ok = (m) => console.log(`  ✓ ${m}`);
const bad = (m, fix) => { failed += 1; console.log(`  ✗ ${m}`); if (fix) console.log(`    → ${fix}`); };

async function call(path, body, method = 'POST') {
  const res = await fetch(`${BASE_URL}/shiip/public-api${path}`, {
    method,
    headers: { 'Content-Type': 'application/json', Token: TOKEN, ShopId: SHOP_ID },
    ...(method === 'POST' ? { body: JSON.stringify(body) } : {}),
    signal: AbortSignal.timeout(15_000),
  });
  const payload = await res.json().catch(() => null);
  return { status: res.status, payload };
}

(async () => {
  console.log('\n=== 1. Cấu hình ===');
  TOKEN ? ok(`GHN_TOKEN: ${mask(TOKEN)}`) : bad('GHN_TOKEN rỗng', 'Lấy ở 5sao.ghn.dev → tab "Chủ cửa hàng" → nút "Xem"');
  SHOP_ID ? ok(`GHN_SHOP_ID: ${SHOP_ID}`) : bad('GHN_SHOP_ID rỗng', 'Lấy ở tab "Quản lý cửa hàng"');
  if (TOKEN !== (process.env.GHN_TOKEN || '')) bad('GHN_TOKEN có khoảng trắng/CR ở hai đầu', 'Đã tự .trim() trong code, nhưng nên sửa lại .env cho sạch');

  console.log(`  · GHN_BASE_URL: ${BASE_URL}`);
  if (BASE_URL.includes('dev-online-gateway')) {
    bad('Đang trỏ vào dev-online-gateway.ghn.vn — gateway này đã ngừng phản hồi',
      'Đổi sang https://online-gateway.ghn.vn. Tính phí là thao tác CHỈ ĐỌC, không tạo vận đơn nên an toàn.');
  } else if (!BASE_URL.includes('ghn.vn')) {
    bad(`URL không thuộc tên miền ghn.vn: ${BASE_URL}`);
  } else {
    ok('URL production (các API dưới đây đều chỉ đọc)');
  }

  console.log(ALLOW_WRITE
    ? '  ⚠ GHN_ALLOW_WRITE=true — hệ thống ĐƯỢC PHÉP tạo vận đơn thật.'
    : '  · GHN_ALLOW_WRITE chưa bật — chế độ READONLY, không thể tạo vận đơn.');

  if (failed) { console.log('\n✗ Sửa cấu hình trước khi gọi API.\n'); process.exit(1); }

  console.log('\n=== 2. Token có hợp lệ không (master-data/province) ===');
  const prov = await call('/master-data/province', {}, 'GET');
  if (prov.payload?.code !== 200) {
    bad(`HTTP ${prov.status} — ${prov.payload?.message ?? 'không rõ'}`,
      prov.status === 401 || prov.status === 403
        ? 'Token sai, hoặc token của môi trường khác với GHN_BASE_URL'
        : 'Kiểm tra lại token và kết nối mạng');
    console.log('');
    process.exit(1);
  }
  const provinces = prov.payload.data || [];
  ok(`Token hợp lệ — nhận ${provinces.length} tỉnh/thành`);
  const hcm = provinces.find((p) => /Hồ Chí Minh/i.test(p.ProvinceName)) || provinces[0];

  console.log('\n=== 3. Quận/huyện + phường/xã ===');
  const dis = await call('/master-data/district', { province_id: hcm.ProvinceID });
  const districts = dis.payload?.data || [];
  districts.length ? ok(`${hcm.ProvinceName}: ${districts.length} quận/huyện`) : bad('Không lấy được quận/huyện');
  const target = districts.find((d) => d.SupportType === 2 || d.SupportType === 3) || districts[0];

  const wardRes = await call('/master-data/ward', { district_id: target.DistrictID });
  const wards = wardRes.payload?.data || [];
  wards.length ? ok(`${target.DistrictName}: ${wards.length} phường/xã`) : bad('Không lấy được phường/xã');
  const ward = wards[0];
  if (ward) {
    const type = typeof ward.WardCode;
    console.log(`  · WardCode mẫu: ${JSON.stringify(ward.WardCode)} (kiểu ${type})`);
    if (type === 'number') ok('GHN trả WardCode dạng SỐ — code đã ép về chuỗi khi đồng bộ');
    else ok('GHN trả WardCode dạng chuỗi');
  }

  console.log('\n=== 4. Kho lấy hàng (ĐIỂM ĐI của tuyến) ===');
  let pickupDistrict = FROM_DISTRICT;
  let pickupWard = FROM_WARD;

  if (pickupDistrict) {
    ok(`Lấy từ .env: DistrictID ${pickupDistrict}${pickupWard ? `, WardCode ${pickupWard}` : ''}`);
  } else {
    // Không khai trong .env thì đọc kho đã đăng ký với GHN. BẮT BUỘC phải biết
    // điểm đi, nếu không lời gọi tra dịch vụ và lời gọi tính phí sẽ hỏi về hai
    // tuyến khác nhau -> GHN trả "route not found service".
    const shopRes = await call('/v2/shop/all', { offset: 0, limit: 50, client_phone: '' });
    const shops = shopRes.payload?.data?.shops || [];
    if (shops.length === 0) {
      bad('Tài khoản chưa có kho lấy hàng nào',
        'Vào trang GHN → "Quản lý cửa hàng" → điền địa chỉ kho → "Cập nhật"');
    } else {
      const shop = shops.find((sh) => String(sh._id) === String(SHOP_ID)) || shops[0];
      if (String(shop._id) !== String(SHOP_ID)) {
        bad(`GHN_SHOP_ID=${SHOP_ID} không khớp kho nào (tài khoản có: ${shops.map((sh) => sh._id).join(', ')})`,
          `Đang tạm dùng kho ${shop._id}. Sửa GHN_SHOP_ID cho đúng.`);
      }
      pickupDistrict = shop.district_id;
      pickupWard = String(shop.ward_code ?? '');
      ok(`Kho "${shop.name || shop._id}": DistrictID ${pickupDistrict}, WardCode ${pickupWard}`);
      if (shop.address) console.log(`    ${shop.address}`);
      console.log('    (Code cũng tự đọc kho theo cách này khi GHN_FROM_DISTRICT_ID rỗng.)');
    }
  }

  console.log('\n=== 5. Dịch vụ khả dụng cho tuyến ===');
  if (!pickupDistrict) {
    bad('Không xác định được điểm đi — bỏ qua bước tính phí');
    console.log('');
    process.exit(1);
  }
  console.log(`  · Tuyến: ${pickupDistrict} → ${target.DistrictID} (${target.DistrictName})`);
  const svcRes = await call('/v2/shipping-order/available-services', {
    shop_id: Number(SHOP_ID),
    from_district: pickupDistrict,
    to_district: target.DistrictID,
  });
  const services = svcRes.payload?.data || [];
  if (services.length) {
    ok(services.map((s) => `${s.short_name || '?'} (id ${s.service_id}, type ${s.service_type_id})`).join(', '));
    if (!services.some((s) => s.service_type_id === SERVICE_TYPE)) {
      bad(`Tuyến này KHÔNG có service_type_id=${SERVICE_TYPE}`, 'Code sẽ tự chọn service_id đầu tiên khả dụng');
    }
  } else {
    bad(`Không có dịch vụ nào — ${svcRes.payload?.message ?? `HTTP ${svcRes.status}`}`,
      'Thường do chưa khai địa chỉ kho cho ShopId trên trang GHN');
  }

  console.log('\n=== 6. Tính phí thật (chỉ đọc, không tạo vận đơn) ===');
  // Gửi ĐÚNG tuyến đã dùng ở bước 5. Đây chính là chỗ trước đây sai: tra dịch
  // vụ theo một tuyến rồi tính phí theo tuyến khác.
  const body = {
    from_district_id: pickupDistrict,
    to_district_id: target.DistrictID,
    to_ward_code: String(ward?.WardCode ?? ''),
    weight: 500, length: 15, width: 15, height: 15,
  };
  if (pickupWard) body.from_ward_code = pickupWard;
  if (services.length) body.service_id = (services.find((s) => s.service_type_id === SERVICE_TYPE) || services[0]).service_id;
  else body.service_type_id = SERVICE_TYPE;

  const feeRes = await call('/v2/shipping-order/fee', body);
  if (feeRes.payload?.code === 200) {
    const fee = feeRes.payload.data;
    ok(`Kiện 500g → ${target.DistrictName}, ${ward?.WardName}: ${Number(fee.total).toLocaleString('vi-VN')} ₫`);
    console.log(`    (cước ${Number(fee.service_fee).toLocaleString('vi-VN')} ₫ + bảo hiểm ${Number(fee.insurance_fee || 0).toLocaleString('vi-VN')} ₫)`);
  } else {
    const msg = feeRes.payload?.message ?? `HTTP ${feeRes.status}`;
    bad(msg,
      /route not found/i.test(msg)
        ? `GHN không có tuyến ${pickupDistrict} → ${target.DistrictID}. Kiểm tra: kho có đúng quận không, `
          + 'và quận đích có nằm trong vùng phục vụ không.'
        : 'Kiểm tra lại địa chỉ kho và service_id');
  }

  console.log(failed
    ? `\n✗ Còn ${failed} vấn đề. Sửa xong rồi chạy: npm run ghn:sync\n`
    : '\n✓ Tất cả đạt. Chạy tiếp: npm run ghn:sync\n');
  process.exit(failed ? 1 : 0);
})().catch((e) => { console.error('\n✗ Lỗi:', e.message, '\n'); process.exit(1); });
