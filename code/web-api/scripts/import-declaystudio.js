'use strict';

/**
 * One-off importer: seeds the catalogue with figures scraped from
 * declaystudio.com/shop via the admin API (proper validation + variant flow).
 * Re-runnable: skips products whose slug already exists.
 *
 * Usage: node scripts/import-declaystudio.js
 */

const BASE = process.env.API_URL || 'http://localhost:3001/api';
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'admin@declay.com';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'Admin1234!';

const CATEGORIES = [
  { name: 'Dinosaurs',          slug: 'dinosaurs',          description: 'Dinosaurs, pterosaurs and marine reptiles, hand-sculpted as paleoart.' },
  { name: 'Prehistoric Mammals', slug: 'prehistoric-mammals', description: 'Ice-age mammals and ancient megafauna figures.' },
  { name: 'Wildlife',           slug: 'wildlife',           description: 'Modern wildlife — rhinos, elephants and more.' },
  { name: 'Bronze Statues',     slug: 'bronze-statues',     description: 'Limited bronze statue editions.' },
];

// price: number; stock: 0 = out of stock; cat: category slug
const PRODUCTS = [
  { name: 'Black rhinoceros - Diceros bicornis', price: 80, stock: 15, cat: 'wildlife', img: 'https://static.wixstatic.com/media/983dbf_9de8630f01e742088d91f049fa74bc63~mv2.png' },
  { name: 'Deinotherium giganteum - ZoaTusker Studio', price: 120, stock: 0, cat: 'prehistoric-mammals', img: 'https://static.wixstatic.com/media/983dbf_79b817781ccb4231b1124bd619fa7603~mv2.jpg' },
  { name: 'Daspletosaurus torosus - The Night Encounter', price: 150, stock: 8, cat: 'dinosaurs', img: 'https://static.wixstatic.com/media/983dbf_6212e6a6aa49453ca73a456fd576af70~mv2.png' },
  { name: 'Coelodonta antiquitatis - Against the Wind', price: 80, stock: 12, cat: 'prehistoric-mammals', img: 'https://static.wixstatic.com/media/983dbf_453f0d1f9bde446ab1844b48672f5e57~mv2.png' },
  { name: 'Hatzegopteryx thambema', price: 110, stock: 10, cat: 'dinosaurs', img: 'https://static.wixstatic.com/media/983dbf_ee3009fc9e4944da8ab0b7d3ee41e875~mv2.jpg' },
  { name: 'White rhinoceros - battling bulls', price: 90, stock: 0, cat: 'wildlife', img: 'https://static.wixstatic.com/media/983dbf_86671d4d884042a08053da33d9e7a6f0~mv2.jpg' },
  { name: 'White rhinoceros - Ceratotherium simum', price: 80, stock: 0, cat: 'wildlife', img: 'https://static.wixstatic.com/media/983dbf_06d48e16e78e4d20b2b714501eb2c984~mv2.jpg' },
  { name: 'Psittacosaurus sibiricus', price: 40, stock: 20, cat: 'dinosaurs', img: 'https://static.wixstatic.com/media/983dbf_4f2a7b676ea74522be98433b76438c64~mv2.jpg' },
  { name: 'Rastrelliger kanagurta - Indian mackerel', price: 30, stock: 0, cat: 'wildlife', img: 'https://static.wixstatic.com/media/983dbf_3d8868f0e1fc41fca70e410b8db449f9~mv2.jpg' },
  { name: 'Juvenile T. rex', price: 40, stock: 0, cat: 'dinosaurs', img: 'https://static.wixstatic.com/media/983dbf_306c8b451aa2465c878d53b689f425c3~mv2.jpg' },
  { name: 'T. rex and Edmontosaurus - Pose 1 (Scale 1/35)', price: 130, stock: 7, cat: 'dinosaurs', img: 'https://static.wixstatic.com/media/983dbf_a894617e86f34766b29afd302e32d6fd~mv2.png' },
  { name: 'T. rex and Edmontosaurus - Pose 2 (Scale 1/35 and 1/15)', price: 130, stock: 7, cat: 'dinosaurs', img: 'https://static.wixstatic.com/media/983dbf_ed7cb7a76b73475b8503822b9e4bd5e9~mv2.png' },
  { name: 'Panthera atrox', price: 70, stock: 14, cat: 'prehistoric-mammals', img: 'https://static.wixstatic.com/media/983dbf_cc2aa3377d424a9bbccba75ec51769a7~mv2.jpg' },
  { name: 'Ophthalmosaurus icenicus', price: 90, stock: 0, cat: 'dinosaurs', img: 'https://static.wixstatic.com/media/983dbf_adc3f43d958642a5b707bf647d94728a~mv2.jpg' },
  { name: 'Mammuthus primigenius', price: 110, stock: 0, cat: 'prehistoric-mammals', img: 'https://static.wixstatic.com/media/983dbf_c82e5d8dfabb4a5b9fb8f85d4359c3f2~mv2.jpg' },
  { name: 'Torosaurus latus - Version 2.0', price: 130, stock: 9, cat: 'dinosaurs', img: 'https://static.wixstatic.com/media/983dbf_de8cd77764344a24805445eb6e571166~mv2.jpg' },
  { name: 'Torosaurus latus - Version 1.0', price: 130, stock: 9, cat: 'dinosaurs', img: 'https://static.wixstatic.com/media/983dbf_62c72c962b6f406dae213577f71d43f3~mv2.jpg' },
  { name: 'African Elephant battling bulls', price: 95, stock: 0, cat: 'wildlife', img: 'https://static.wixstatic.com/media/983dbf_32bb6e34b76b462c9a1a19e0a9f7f318~mv2.jpg' },
  { name: 'Scale 1/18 Bronze Statue - Elephas maximus', price: 400, stock: 0, cat: 'bronze-statues', img: 'https://static.wixstatic.com/media/983dbf_7192c3e8b6b1448ba88ef5bc6e7c21e9~mv2.jpg' },
  { name: 'Tyrannosaurus rex VS Triceratops', price: 220, stock: 0, cat: 'dinosaurs', img: 'https://static.wixstatic.com/media/983dbf_654afa649315447c950724f847465e7d~mv2.png' },
  { name: 'Scale 1/10 Bronze Statue - Rafetus swinhoei', price: 350, stock: 5, cat: 'bronze-statues', img: 'https://static.wixstatic.com/media/983dbf_b3b4ed3aa6c34ad681a66f6b8448a5e3~mv2.png' },
  { name: 'Rafetus swinhoei', price: 25, stock: 25, cat: 'wildlife', img: 'https://static.wixstatic.com/media/983dbf_6e735fe0ac344f0d8f42a85383212757~mv2.png' },
  { name: 'Loxodonta africana', price: 90, stock: 0, cat: 'wildlife', img: 'https://static.wixstatic.com/media/983dbf_0508285d59c44c13af33ec57ce84c0f4~mv2.jpg' },
  { name: 'Elephas maximus', price: 90, stock: 0, cat: 'wildlife', img: 'https://static.wixstatic.com/media/983dbf_dc88b8d999f54c78b56fd79ccbc85124~mv2.jpg' },
  { name: 'Scale 1/20 Mammuthus columbi custom base with birds', price: 140, stock: 0, cat: 'prehistoric-mammals', img: 'https://static.wixstatic.com/media/983dbf_7c15c8272dab45e89c33b9df476c23b1~mv2.jpg' },
];

function slugify(name) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 200);
}

async function api(path, method, token, body) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  const json = await res.json().catch(() => ({}));
  return { ok: res.ok, status: res.status, json };
}

async function main() {
  const login = await api('/admin/auth/login', 'POST', null, { email: ADMIN_EMAIL, password: ADMIN_PASSWORD });
  const token = login.json?.data?.accessToken;
  if (!token) { console.error('✗ Admin login failed:', login.json?.message); process.exit(1); }
  console.log('✓ Admin authenticated');

  // Categories — create any that are missing, build a slug → id map
  const existingRes = await api('/admin/categories', 'GET', token);
  const bySlug = new Map((existingRes.json?.data ?? []).map((c) => [c.slug, c.id]));
  for (const cat of CATEGORIES) {
    if (bySlug.has(cat.slug)) { console.log(`· category exists: ${cat.name}`); continue; }
    const r = await api('/admin/categories', 'POST', token, { ...cat, isActive: true });
    if (r.ok) { bySlug.set(cat.slug, r.json.data.id); console.log(`+ category: ${cat.name}`); }
    else console.error(`✗ category ${cat.name}:`, r.json?.message);
  }

  // Products + one variant each
  let created = 0, skipped = 0, failed = 0;
  for (const p of PRODUCTS) {
    const slug = slugify(p.name);
    const categoryId = bySlug.get(p.cat);
    const description = `Hand-sculpted, hand-painted collectible figure — ${p.name}. A paleoart piece inspired by DeCLAY Studio.`;

    const prod = await api('/admin/products', 'POST', token, { name: p.name, slug, description, categoryId, isActive: true });
    if (!prod.ok) {
      if (prod.status === 409) { console.log(`· skip (exists): ${p.name}`); skipped++; }
      else { console.error(`✗ product ${p.name}:`, prod.json?.message); failed++; }
      continue;
    }
    const productId = prod.json.data.id;
    const variant = await api(`/admin/products/${productId}/variants`, 'POST', token, {
      name: 'Standard Edition',
      price: p.price,
      stock: p.stock,
      images: [p.img],
    });
    if (variant.ok) { console.log(`+ ${p.name} ($${p.price}, stock ${p.stock})`); created++; }
    else { console.error(`✗ variant ${p.name}:`, variant.json?.message); failed++; }
  }

  console.log(`\nDone — created ${created}, skipped ${skipped}, failed ${failed}.`);
}

main().catch((e) => { console.error(e); process.exit(1); });
