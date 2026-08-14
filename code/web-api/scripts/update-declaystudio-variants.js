'use strict';

/**
 * Updates the imported declaystudio products with their real descriptions and
 * scale/finish variations (scraped from each product page). Replaces the single
 * placeholder variant with the real options. Re-runnable.
 *
 * Usage: node scripts/update-declaystudio-variants.js
 */

const BASE = process.env.API_URL || 'http://localhost:3001/api';
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'admin@declay.com';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'Admin1234!';

const IMG = {
  'Black rhinoceros - Diceros bicornis': 'https://static.wixstatic.com/media/983dbf_9de8630f01e742088d91f049fa74bc63~mv2.png',
  'Deinotherium giganteum - ZoaTusker Studio': 'https://static.wixstatic.com/media/983dbf_79b817781ccb4231b1124bd619fa7603~mv2.jpg',
  'Daspletosaurus torosus - The Night Encounter': 'https://static.wixstatic.com/media/983dbf_6212e6a6aa49453ca73a456fd576af70~mv2.png',
  'Coelodonta antiquitatis - Against the Wind': 'https://static.wixstatic.com/media/983dbf_453f0d1f9bde446ab1844b48672f5e57~mv2.png',
  'Hatzegopteryx thambema': 'https://static.wixstatic.com/media/983dbf_ee3009fc9e4944da8ab0b7d3ee41e875~mv2.jpg',
  'White rhinoceros - battling bulls': 'https://static.wixstatic.com/media/983dbf_86671d4d884042a08053da33d9e7a6f0~mv2.jpg',
  'White rhinoceros - Ceratotherium simum': 'https://static.wixstatic.com/media/983dbf_06d48e16e78e4d20b2b714501eb2c984~mv2.jpg',
  'Psittacosaurus sibiricus': 'https://static.wixstatic.com/media/983dbf_4f2a7b676ea74522be98433b76438c64~mv2.jpg',
  'Rastrelliger kanagurta - Indian mackerel': 'https://static.wixstatic.com/media/983dbf_3d8868f0e1fc41fca70e410b8db449f9~mv2.jpg',
  'Juvenile T. rex': 'https://static.wixstatic.com/media/983dbf_306c8b451aa2465c878d53b689f425c3~mv2.jpg',
  'T. rex and Edmontosaurus - Pose 1 (Scale 1/35)': 'https://static.wixstatic.com/media/983dbf_a894617e86f34766b29afd302e32d6fd~mv2.png',
  'T. rex and Edmontosaurus - Pose 2 (Scale 1/35 and 1/15)': 'https://static.wixstatic.com/media/983dbf_ed7cb7a76b73475b8503822b9e4bd5e9~mv2.png',
  'Panthera atrox': 'https://static.wixstatic.com/media/983dbf_cc2aa3377d424a9bbccba75ec51769a7~mv2.jpg',
  'Ophthalmosaurus icenicus': 'https://static.wixstatic.com/media/983dbf_adc3f43d958642a5b707bf647d94728a~mv2.jpg',
  'Mammuthus primigenius': 'https://static.wixstatic.com/media/983dbf_c82e5d8dfabb4a5b9fb8f85d4359c3f2~mv2.jpg',
  'Torosaurus latus - Version 2.0': 'https://static.wixstatic.com/media/983dbf_de8cd77764344a24805445eb6e571166~mv2.jpg',
  'Torosaurus latus - Version 1.0': 'https://static.wixstatic.com/media/983dbf_62c72c962b6f406dae213577f71d43f3~mv2.jpg',
  'African Elephant battling bulls': 'https://static.wixstatic.com/media/983dbf_32bb6e34b76b462c9a1a19e0a9f7f318~mv2.jpg',
  'Scale 1/18 Bronze Statue - Elephas maximus': 'https://static.wixstatic.com/media/983dbf_7192c3e8b6b1448ba88ef5bc6e7c21e9~mv2.jpg',
  'Tyrannosaurus rex VS Triceratops': 'https://static.wixstatic.com/media/983dbf_654afa649315447c950724f847465e7d~mv2.png',
  'Scale 1/10 Bronze Statue - Rafetus swinhoei': 'https://static.wixstatic.com/media/983dbf_b3b4ed3aa6c34ad681a66f6b8448a5e3~mv2.png',
  'Rafetus swinhoei': 'https://static.wixstatic.com/media/983dbf_6e735fe0ac344f0d8f42a85383212757~mv2.png',
  'Loxodonta africana': 'https://static.wixstatic.com/media/983dbf_0508285d59c44c13af33ec57ce84c0f4~mv2.jpg',
  'Elephas maximus': 'https://static.wixstatic.com/media/983dbf_dc88b8d999f54c78b56fd79ccbc85124~mv2.jpg',
  'Scale 1/20 Mammuthus columbi custom base with birds': 'https://static.wixstatic.com/media/983dbf_7c15c8272dab45e89c33b9df476c23b1~mv2.jpg',
};

// available: in stock on the source site → each variant gets stock; otherwise 0.
// v: [variantName, price]. Real data scraped per product page where available.
const DATA = [
  { name: 'Black rhinoceros - Diceros bicornis', available: true,
    desc: 'Sculpture of Karanja, a famous Eastern black rhinoceros from Kenya’s Maasai Mara, known for his great age and distinctive three-horn shape. Solid resin cast, available across multiple scales.',
    v: [['1/35 · Model kit', 80], ['1/35 · Painted', 180], ['1/18 · Model kit', 150], ['1/18 · Painted', 280], ['1/15 · Model kit', 170], ['1/15 · Painted', 300], ['1/10 · Model kit', 250], ['1/10 · Painted', 400], ['1/6 · Model kit', 500], ['1/6 · Painted', 800]] },

  { name: 'Deinotherium giganteum - ZoaTusker Studio', available: false,
    desc: 'Detailed resin sculpture of the extinct Deinotherium, with male, female and calf variants. Model stands without a base. Sculpted in collaboration with ZoaTusker Studio.',
    v: [['1/35 · Male kit', 135], ['1/35 · Male painted', 190], ['1/35 · Female kit', 115], ['1/35 · Female painted', 170], ['1/35 · Calf kit', 40], ['1/35 · Calf painted', 70], ['1/35 · Full scene kit', 260], ['1/35 · Full scene painted', 400], ['1/15 · Male kit', 280], ['1/15 · Male painted', 400], ['1/15 · Female kit', 260], ['1/15 · Female painted', 380], ['1/15 · Calf kit', 90], ['1/15 · Calf painted', 130], ['1/15 · Full scene kit', 590], ['1/15 · Full scene painted', 860]] },

  { name: 'Daspletosaurus torosus - The Night Encounter', available: true,
    desc: 'Solid resin dinosaur model featuring two head options and included raptors. Stands independently without a base, available in two scales.',
    v: [['1/35 · Model kit', 150], ['1/35 · Painted', 270], ['1/18 · Model kit', 300], ['1/18 · Painted', 550]] },

  { name: 'Coelodonta antiquitatis - Against the Wind', available: true,
    desc: 'The woolly rhinoceros leaning into a blizzard — “Against the Wind.” Solid resin cast, available as an unpainted kit or a hand-painted finish.',
    v: [['1/35 · Model kit', 80], ['1/35 · Painted', 160], ['1/18 · Model kit', 150], ['1/18 · Painted', 280]] },

  { name: 'Hatzegopteryx thambema', available: true,
    desc: 'Solid resin model of the giant azhdarchid pterosaur Hatzegopteryx. The model can stand without the base. Available in two scales.',
    v: [['1/35 · Model kit', 110], ['1/35 · Painted', 200], ['1/18 · Model kit', 240], ['1/18 · Painted', 320]] },

  { name: 'White rhinoceros - battling bulls', available: false,
    desc: 'Two southern white rhinoceros bulls locked in a territorial clash. Solid resin cast.',
    v: [['1/35 · Model kit', 90], ['1/35 · Painted', 180], ['1/18 · Model kit', 170], ['1/18 · Painted', 300]] },

  { name: 'White rhinoceros - Ceratotherium simum', available: false,
    desc: 'Portrait of the southern white rhinoceros, Ceratotherium simum. Solid resin cast in multiple scales.',
    v: [['1/35 · Model kit', 80], ['1/35 · Painted', 170], ['1/18 · Model kit', 150], ['1/18 · Painted', 280]] },

  { name: 'Psittacosaurus sibiricus', available: true,
    desc: 'Solid resin model of Psittacosaurus sibiricus with an included Mystiornis cyrili in the scene. Available in three scales.',
    v: [['1/15 · Model kit', 40], ['1/15 · Painted', 85], ['1/10 · Model kit', 90], ['1/10 · Painted', 130], ['1/6 · Model kit', 150], ['1/6 · Painted', 250]] },

  { name: 'Rastrelliger kanagurta - Indian mackerel', available: false,
    desc: 'A finely detailed resin study of the Indian mackerel, Rastrelliger kanagurta.',
    v: [['Model kit', 30], ['Painted', 55]] },

  { name: 'Juvenile T. rex', available: false,
    desc: 'Solid resin model of a juvenile Tyrannosaurus rex, available as an unpainted kit or pre-painted finish in two scales.',
    v: [['1/35 · Model kit', 40], ['1/35 · Painted', 90], ['1/20 · Model kit', 65], ['1/20 · Painted', 120]] },

  { name: 'T. rex and Edmontosaurus - Pose 1 (Scale 1/35)', available: true,
    desc: 'Tyrannosaurus rex at 1/35 scale with an optional Edmontosaurus prey. The model stands without a base.',
    v: [['With prey · Model kit', 150], ['With prey · Painted', 260], ['Without prey · Model kit', 130], ['Without prey · Painted', 210]] },

  { name: 'T. rex and Edmontosaurus - Pose 2 (Scale 1/35 and 1/15)', available: true,
    desc: 'T. rex attacking an Edmontosaurus, in two scales with or without prey, as kits or painted models.',
    v: [['1/35 with prey · Kit', 150], ['1/35 with prey · Painted', 260], ['1/35 no prey · Kit', 130], ['1/35 no prey · Painted', 210], ['1/15 with prey · Kit', 350], ['1/15 with prey · Painted', 600], ['1/15 no prey · Kit', 300], ['1/15 no prey · Painted', 500]] },

  { name: 'Panthera atrox', available: true,
    desc: 'Solid resin cast of the American lion, Panthera atrox, in three scales as an unpainted kit or professionally painted piece.',
    v: [['1/35 · Model kit', 70], ['1/35 · Painted', 150], ['1/15 · Model kit', 120], ['1/15 · Painted', 200], ['1/10 · Model kit', 180], ['1/10 · Painted', 250]] },

  { name: 'Ophthalmosaurus icenicus', available: false,
    desc: 'Solid resin model of the Jurassic ichthyosaur Ophthalmosaurus icenicus.',
    v: [['Model kit', 90], ['Painted', 160]] },

  { name: 'Mammuthus primigenius', available: false,
    desc: 'The woolly mammoth, Mammuthus primigenius, in solid resin cast.',
    v: [['1/35 · Model kit', 110], ['1/35 · Painted', 190], ['1/15 · Model kit', 240], ['1/15 · Painted', 380]] },

  { name: 'Torosaurus latus - Version 2.0', available: true,
    desc: 'Model sculpted by Hoang Manh Duy. Comes in two scales as a model kit or pre-painted option; the 1/35 includes a base, the 1/15 does not. Solid resin cast.',
    v: [['1/35 · Model kit', 130], ['1/35 · Painted green', 230], ['1/35 · Painted blue', 260], ['1/35 · Custom color', 270], ['1/15 · Model kit', 350], ['1/15 · Painted green', 550], ['1/15 · Painted blue', 700], ['1/15 · Custom color', 750]] },

  { name: 'Torosaurus latus - Version 1.0', available: true,
    desc: 'Resin-cast Torosaurus model kit sculpted and painted by Hoang Manh Duy, available in two scales with unpainted or painted green options.',
    v: [['1/35 · Model kit', 130], ['1/35 · Painted green', 230], ['1/20 · Model kit', 280], ['1/20 · Painted green', 350]] },

  { name: 'African Elephant battling bulls', available: false,
    desc: 'Two African elephant bulls in a powerful confrontation. Solid resin cast.',
    v: [['1/35 · Model kit', 95], ['1/35 · Painted', 180], ['1/20 · Model kit', 180], ['1/20 · Painted', 320]] },

  { name: 'Scale 1/18 Bronze Statue - Elephas maximus', available: false,
    desc: 'Bronze cast sculpture of an Asian elephant at 1/18 scale — 20×16 cm, 5 kg. Production time 5–7 weeks after payment.',
    v: [['1/18 · Bronze cast', 400]] },

  { name: 'Tyrannosaurus rex VS Triceratops', available: false,
    desc: 'Two dinosaurs locked in combat — T. rex versus Triceratops. Solid resin castings in two scales, with normal/EX (with base) options.',
    v: [['1/35 Normal · Kit', 220], ['1/35 Normal · Painted', 350], ['1/35 EX · Kit', 250], ['1/35 EX · Painted', 380], ['1/35 · Base only', 100], ['1/20 Normal · Kit', 550], ['1/20 Normal · Painted', 900], ['1/20 EX · Kit', 750], ['1/20 EX · Painted', 1100], ['1/20 · Base only', 200]] },

  { name: 'Scale 1/10 Bronze Statue - Rafetus swinhoei', available: true,
    desc: 'Bronze sculpture of the Hoan Kiem turtle (Yangtze giant softshell turtle) at 1/10 scale — 19×5×11 cm. Production time 5–7 weeks after payment.',
    v: [['1/10 · Bronze cast', 350]] },

  { name: 'Rafetus swinhoei', available: true,
    desc: 'Model based on Cụ Rùa from Hoan Kiem lake, Hanoi, Vietnam. Solid resin cast in three scales, as normal or EX kits and painted options.',
    v: [['1/10 · Kit normal', 55], ['1/10 · Kit EX', 85], ['1/10 · Painted normal', 120], ['1/10 · Painted EX', 160], ['1/20 · Kit normal', 35], ['1/20 · Kit EX', 55], ['1/20 · Painted normal', 65], ['1/20 · Painted EX', 100], ['1/35 · Kit normal', 25], ['1/35 · Kit EX', 30], ['1/35 · Painted normal', 35], ['1/35 · Painted EX', 40]] },

  { name: 'Loxodonta africana', available: false,
    desc: 'The African bush elephant, Loxodonta africana, in solid resin cast.',
    v: [['1/35 · Model kit', 90], ['1/35 · Painted', 170], ['1/20 · Model kit', 170], ['1/20 · Painted', 300]] },

  { name: 'Elephas maximus', available: false,
    desc: 'The Asian elephant, Elephas maximus, in solid resin cast across two scales.',
    v: [['1/35 · Model kit', 90], ['1/35 · Painted', 170], ['1/18 · Model kit', 170], ['1/18 · Painted', 300]] },

  { name: 'Scale 1/20 Mammuthus columbi custom base with birds', available: false,
    desc: 'Detailed resin Columbian mammoth at 1/20 scale on a custom base with bird figures — 36×17×22 cm with base, 1.4 kg.',
    v: [['Unpainted kit', 240], ['Painted kit', 340]] },
];

function slugify(name) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 200);
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
  if (!token) { console.error('✗ Admin login failed'); process.exit(1); }
  console.log('✓ Admin authenticated');

  let ok = 0, fail = 0;
  for (const p of DATA) {
    const slug = slugify(p.name);
    const found = await api(`/products/slug/${slug}`, 'GET', token);
    if (!found.ok) { console.error(`✗ not found: ${p.name} (${slug})`); fail++; continue; }
    const product = found.json.data;

    await api(`/admin/products/${product.id}`, 'PUT', token, { description: p.desc });

    // Drop existing variants, then add the real ones
    for (const ev of product.variants ?? []) {
      await api(`/admin/products/${product.id}/variants/${ev.id}`, 'DELETE', token);
    }
    const img = IMG[p.name];
    const stock = p.available ? 10 : 0;
    let added = 0;
    for (const [vname, price] of p.v) {
      const r = await api(`/admin/products/${product.id}/variants`, 'POST', token, {
        name: vname, price, stock, images: img ? [img] : [],
      });
      if (r.ok) added++;
      else console.error(`  ✗ variant "${vname}" on ${p.name}:`, r.json?.message);
    }
    console.log(`✓ ${p.name} — ${added} variants${p.available ? '' : ' (out of stock)'}`);
    ok++;
  }
  console.log(`\nDone — updated ${ok}, failed ${fail}.`);
}

main().catch((e) => { console.error(e); process.exit(1); });
