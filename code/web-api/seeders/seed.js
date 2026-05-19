'use strict';

require('dotenv').config();
const { Pool } = require('pg');
const bcrypt = require('bcryptjs');

const pool = new Pool({
  host:     process.env.DB_HOST     || 'localhost',
  port:     Number(process.env.DB_PORT) || 5431,
  user:     process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
});

async function hash(plain) {
  return bcrypt.hash(plain, 10);
}

async function run() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // ── 1. admin_users ───────────────────────────────────────────
    const adminPass  = await hash('Admin1234!');
    const editorPass = await hash('Editor1234!');

    const { rows: admins } = await client.query(`
      INSERT INTO admin_users (email, password, full_name, role)
      VALUES
        ('admin@declay.com',  $1, 'Declay Admin',  'super_admin'),
        ('editor@declay.com', $2, 'Nguyen Linh',   'editor')
      ON CONFLICT (email) DO NOTHING
      RETURNING id, email
    `, [adminPass, editorPass]);
    console.log('admin_users:', admins.length ? admins.map(a => a.email) : 'already seeded');

    const [adminId] = await client.query(
      `SELECT id FROM admin_users WHERE email = 'admin@declay.com'`
    ).then(r => [r.rows[0].id]);

    // ── 2. users ─────────────────────────────────────────────────
    const userPass = await hash('Test1234!');
    const { rows: users } = await client.query(`
      INSERT INTO users (email, username, full_name, phone_number, password, auth_provider, is_active, is_email_verified)
      VALUES
        ('alice@test.com',   'alice',   'Alice Nguyen',  '0901111111', $1, 'local', TRUE, TRUE),
        ('bob@test.com',     'bob',     'Bob Tran',      '0902222222', $1, 'local', TRUE, TRUE),
        ('carol@test.com',   'carol',   'Carol Le',      '0903333333', $1, 'local', TRUE, TRUE),
        ('david@test.com',   'david',   'David Pham',    '0904444444', $1, 'local', TRUE, FALSE),
        ('eve@test.com',     'eve',     'Eve Hoang',     '0905555555', $1, 'local', TRUE, TRUE)
      ON CONFLICT (email) DO NOTHING
      RETURNING id, email
    `, [userPass]);
    console.log('users:', users.length ? users.map(u => u.email) : 'already seeded');

    const userIds = await client.query(`SELECT id FROM users ORDER BY id LIMIT 5`).then(r => r.rows.map(r => r.id));
    const [u1, u2, u3, u4, u5] = userIds;

    // ── 3. addresses ─────────────────────────────────────────────
    await client.query(`
      INSERT INTO addresses (user_id, receiver_name, receiver_phone, address_line, ward, district, city, country, is_default, address_type)
      VALUES
        ($1, 'Alice Nguyen',  '0901111111', '12 Nguyen Hue',    'Ben Nghe',    'District 1',  'Ho Chi Minh City', 'Vietnam', TRUE,  'home'),
        ($1, 'Alice Nguyen',  '0901111111', '5 Le Loi',         'Pham Ngu Lao','District 1',  'Ho Chi Minh City', 'Vietnam', FALSE, 'work'),
        ($2, 'Bob Tran',      '0902222222', '88 Tran Hung Dao', 'Co Giang',    'District 5',  'Ho Chi Minh City', 'Vietnam', TRUE,  'home'),
        ($3, 'Carol Le',      '0903333333', '23 Dinh Tien Hoang','Da Kao',     'District 1',  'Ho Chi Minh City', 'Vietnam', TRUE,  'home'),
        ($4, 'David Pham',    '0904444444', '10 Bach Dang',     'Tan Binh',    'Tan Binh',    'Ho Chi Minh City', 'Vietnam', TRUE,  'home'),
        ($5, 'Eve Hoang',     '0905555555', '7 Hoang Dieu',     'Phu Nhuan',   'Phu Nhuan',   'Ho Chi Minh City', 'Vietnam', TRUE,  'home')
      ON CONFLICT DO NOTHING
    `, [u1, u2, u3, u4, u5]);
    console.log('addresses: seeded');

    const addrIds = await client.query(`SELECT id, user_id FROM addresses WHERE is_default = TRUE ORDER BY id`)
      .then(r => r.rows);

    // ── 4. categories ────────────────────────────────────────────
    const { rows: cats } = await client.query(`
      INSERT INTO categories (name, slug, description, is_active)
      VALUES
        ('Dragon Figures',      'dragon-figures',      'Fearsome dragon sculptures handcrafted with premium resin.', TRUE),
        ('Fantasy Warriors',    'fantasy-warriors',    'Knights, samurai, and mythic warriors in epic poses.',       TRUE),
        ('Mythical Creatures',  'mythical-creatures',  'Phoenixes, kirin, and other legendary beings.',              TRUE),
        ('Anime Characters',    'anime-characters',    'Fan-art-inspired figures from beloved anime series.',        TRUE),
        ('Limited Editions',    'limited-editions',    'Exclusive runs of 50 units or fewer — collector pieces.',    TRUE)
      ON CONFLICT (slug) DO NOTHING
      RETURNING id, slug
    `);
    console.log('categories:', cats.length ? cats.map(c => c.slug) : 'already seeded');

    const catId = async (slug) =>
      client.query(`SELECT id FROM categories WHERE slug = $1`, [slug]).then(r => r.rows[0].id);

    const cDragon   = await catId('dragon-figures');
    const cWarrior  = await catId('fantasy-warriors');
    const cMythical = await catId('mythical-creatures');
    const cAnime    = await catId('anime-characters');
    const cLimited  = await catId('limited-editions');

    // ── 5. products ──────────────────────────────────────────────
    const { rows: prods } = await client.query(`
      INSERT INTO products (category_id, name, slug, description, is_active)
      VALUES
        ($1, 'Crimson Dragon',    'crimson-dragon',    'A fierce red dragon perched on volcanic rock, scales hand-painted with metallic crimson.', TRUE),
        ($1, 'Frost Wyvern',      'frost-wyvern',      'Icy blue wyvern mid-flight, translucent wings catch light beautifully.',                   TRUE),
        ($2, 'Iron Paladin',      'iron-paladin',       'Full-armour knight holding a greatsword, engraved with intricate filigree.',               TRUE),
        ($2, 'Shadow Ronin',      'shadow-ronin',       'Battle-worn samurai emerging from darkness, cloak caught mid-wind.',                       TRUE),
        ($3, 'Phoenix Rising',    'phoenix-rising',     'Rebirth phoenix in crimson and gold flame, mounted on an obsidian base.',                  TRUE),
        ($3, 'Kirin Guardian',    'kirin-guardian',     'Celestial kirin with flowing mane, bringing fortune to any space.',                        TRUE),
        ($4, 'Demon Blade Spirit','demon-blade-spirit', 'Inspired by classic demon-slayer anime — katana raised, haori billowing.',                 TRUE),
        ($4, 'Steel Mech Pilot',  'steel-mech-pilot',  'Compact mecha pilot figure with removable helmet and posable arms.',                       TRUE),
        ($5, 'Golden Phoenix',    'golden-phoenix',     'Limited run of 30. 24-karat gold-leaf finish on a hand-sculpted phoenix.',                 TRUE)
      ON CONFLICT (slug) DO NOTHING
      RETURNING id, slug
    `, [cDragon, cWarrior, cMythical, cAnime, cLimited]);
    console.log('products:', prods.length ? prods.map(p => p.slug) : 'already seeded');

    const prodId = async (slug) =>
      client.query(`SELECT id FROM products WHERE slug = $1`, [slug]).then(r => r.rows[0].id);

    // ── 6. product_variants ──────────────────────────────────────
    const pCrimson  = await prodId('crimson-dragon');
    const pFrost    = await prodId('frost-wyvern');
    const pPaladin  = await prodId('iron-paladin');
    const pRonin    = await prodId('shadow-ronin');
    const pPhoenix  = await prodId('phoenix-rising');
    const pKirin    = await prodId('kirin-guardian');
    const pDemon    = await prodId('demon-blade-spirit');
    const pMech     = await prodId('steel-mech-pilot');
    const pGolden   = await prodId('golden-phoenix');

    const { rows: variants } = await client.query(`
      INSERT INTO product_variants (product_id, name, price, stock, images, is_active)
      VALUES
        -- Crimson Dragon
        ($1,  'Standard Edition',  49.99,  40, ARRAY['https://placehold.co/600x600/8B4513/FFFFFF?text=Crimson+Dragon+Std','https://placehold.co/600x600/722F37/FFFFFF?text=Crimson+Dragon+Std+2'], TRUE),
        ($1,  'Deluxe Edition',    89.99,  15, ARRAY['https://placehold.co/600x600/8B0000/FFFFFF?text=Crimson+Dragon+Dlx','https://placehold.co/600x600/6B0000/FFFFFF?text=Crimson+Dragon+Dlx+2','https://placehold.co/600x600/5A0000/FFFFFF?text=Crimson+Dragon+Dlx+3'], TRUE),
        -- Frost Wyvern
        ($2,  'Standard Edition',  44.99,  35, ARRAY['https://placehold.co/600x600/4A90D9/FFFFFF?text=Frost+Wyvern+Std','https://placehold.co/600x600/3A7BC8/FFFFFF?text=Frost+Wyvern+Std+2'], TRUE),
        ($2,  'Collector Edition', 79.99,  10, ARRAY['https://placehold.co/600x600/1A5FA8/FFFFFF?text=Frost+Wyvern+Col','https://placehold.co/600x600/0A4F98/FFFFFF?text=Frost+Wyvern+Col+2'], TRUE),
        -- Iron Paladin
        ($3,  'Standard Edition',  54.99,  30, ARRAY['https://placehold.co/600x600/708090/FFFFFF?text=Iron+Paladin+Std'], TRUE),
        ($3,  'Battle-Worn Finish',74.99,  12, ARRAY['https://placehold.co/600x600/4A4A4A/FFFFFF?text=Iron+Paladin+BW','https://placehold.co/600x600/3A3A3A/FFFFFF?text=Iron+Paladin+BW+2'], TRUE),
        -- Shadow Ronin
        ($4,  'Standard Edition',  49.99,  25, ARRAY['https://placehold.co/600x600/2C2C2C/FFFFFF?text=Shadow+Ronin+Std','https://placehold.co/600x600/1C1C1C/FFFFFF?text=Shadow+Ronin+Std+2'], TRUE),
        ($4,  'Night Edition',     69.99,   8, ARRAY['https://placehold.co/600x600/0D0D0D/FFFFFF?text=Shadow+Ronin+Night'], TRUE),
        -- Phoenix Rising
        ($5,  'Standard Edition',  59.99,  20, ARRAY['https://placehold.co/600x600/C0392B/FFFFFF?text=Phoenix+Std','https://placehold.co/600x600/E74C3C/FFFFFF?text=Phoenix+Std+2'], TRUE),
        ($5,  'Prestige Edition',  99.99,   6, ARRAY['https://placehold.co/600x600/B7950B/FFFFFF?text=Phoenix+Prestige','https://placehold.co/600x600/D4AC0D/FFFFFF?text=Phoenix+Prestige+2','https://placehold.co/600x600/F1C40F/000000?text=Phoenix+Prestige+3'], TRUE),
        -- Kirin Guardian
        ($6,  'Standard Edition',  55.99,  18, ARRAY['https://placehold.co/600x600/1E8449/FFFFFF?text=Kirin+Std'], TRUE),
        ($6,  'Jade Edition',      85.99,   7, ARRAY['https://placehold.co/600x600/1A5276/FFFFFF?text=Kirin+Jade','https://placehold.co/600x600/117A65/FFFFFF?text=Kirin+Jade+2'], TRUE),
        -- Demon Blade Spirit
        ($7,  'Standard Edition',  39.99,  50, ARRAY['https://placehold.co/600x600/641E16/FFFFFF?text=Demon+Blade+Std','https://placehold.co/600x600/922B21/FFFFFF?text=Demon+Blade+Std+2'], TRUE),
        ($7,  'Demon Form Edition',64.99,  14, ARRAY['https://placehold.co/600x600/4A235A/FFFFFF?text=Demon+Blade+Demon','https://placehold.co/600x600/6C3483/FFFFFF?text=Demon+Blade+Demon+2'], TRUE),
        -- Steel Mech Pilot
        ($8,  'Standard Edition',  34.99,  60, ARRAY['https://placehold.co/600x600/5D6D7E/FFFFFF?text=Mech+Std'], TRUE),
        ($8,  'Armored Version',   54.99,  20, ARRAY['https://placehold.co/600x600/2E4057/FFFFFF?text=Mech+Armored','https://placehold.co/600x600/1C2833/FFFFFF?text=Mech+Armored+2'], TRUE),
        -- Golden Phoenix (limited)
        ($9,  'Gold-Leaf Edition', 249.99,  8, ARRAY['https://placehold.co/600x600/D4AC0D/000000?text=Golden+Phoenix','https://placehold.co/600x600/F1C40F/000000?text=Golden+Phoenix+2','https://placehold.co/600x600/B7950B/FFFFFF?text=Golden+Phoenix+3'], TRUE)
      ON CONFLICT DO NOTHING
      RETURNING id
    `, [pCrimson, pFrost, pPaladin, pRonin, pPhoenix, pKirin, pDemon, pMech, pGolden]);
    console.log('product_variants: seeded', variants.length, 'variants');

    // ── 7. articles ──────────────────────────────────────────────
    await client.query(`
      INSERT INTO articles (title, content, author_id, slug, views, is_published)
      VALUES
        (
          'The Art of Handcrafted Figure Making',
          'Every figure in our collection begins as a sketch on paper. Our artists spend weeks refining proportions before a single gram of resin is poured. In this post we walk you through the full journey — from concept art to the finished piece sitting on your shelf.\n\nThe process starts with a digital sculpt reviewed by the founding artisan. Once approved, a 3D-printed prototype is produced and refined by hand. Surface detailing — scales, armour engravings, feather texture — is added with dental tools under magnification.\n\nPainting follows a strict layering protocol: base coat, shadow wash, dry-brush highlights, and finally a satin or matte varnish chosen to suit each character. Each piece is signed on the base before shipping.',
          $1, 'art-of-handcrafted-figure-making', 312, TRUE
        ),
        (
          'Introducing the Dragon Series',
          'We are thrilled to announce the full Dragon Series — five original dragon sculptures spanning fire, ice, storm, earth, and shadow elements. Each dragon is sculpted independently, meaning no two share the same base mould.\n\nThe Crimson Dragon leads the series, followed by the Frost Wyvern now available in the store. Storm Serpent, Terra Colossus, and Void Drake will be unveiled quarterly throughout the year. Collectors who acquire all five will receive an exclusive display stand.',
          $1, 'introducing-the-dragon-series', 187, TRUE
        ),
        (
          'Behind the Scenes: Painting the Phoenix',
          'The Phoenix Rising figure required 14 individual paint layers to achieve the gradient from deep crimson at the wing roots to bright gold at the tips. Senior artist Minh Duc spent three weeks on the prototype alone.\n\nWe used a custom-mixed interference pigment for the flame tendrils — it shifts from orange to yellow depending on the viewing angle and light source. This post shares some process photos and the palette breakdown.',
          $1, 'behind-the-scenes-painting-phoenix', 95, TRUE
        ),
        (
          'Upcoming Holiday Collection — Sneak Peek',
          'Draft post — not ready for publication. The holiday collection will feature four new figures: Snow Kirin, Winter Paladin, Frost Fairy, and the exclusive Midnight Dragon. Prices and release dates TBD.',
          $1, 'upcoming-holiday-collection', 0, FALSE
        )
      ON CONFLICT (slug) DO NOTHING
    `, [adminId]);
    console.log('articles: seeded');

    // ── 8. jobs ──────────────────────────────────────────────────
    await client.query(`
      INSERT INTO jobs (title, description, requirements, location, is_open)
      VALUES
        (
          'Figure Artist',
          'Create original figure concepts and sculpts for our growing catalogue. You will collaborate directly with the founding artisan on new character designs and handle final paint-finishing on production runs.',
          '3+ years sculpting or fine-arts experience\nProficiency with ZBrush or Blender for digital sculpting\nPortfolio demonstrating character design\nAttention to fine surface detail',
          'Ho Chi Minh City (on-site)', TRUE
        ),
        (
          'Packaging & Shipping Specialist',
          'Prepare, pack, and dispatch customer orders safely. Maintain inventory accuracy, coordinate with couriers, and handle return processing.',
          '1+ year warehouse or fulfilment experience\nFamiliarity with inventory management software\nPhysical ability to lift packages up to 15 kg\nAttention to order accuracy',
          'Ho Chi Minh City (on-site)', TRUE
        ),
        (
          'Customer Support Representative',
          'Handle customer enquiries via email and live chat. Assist with order tracking, product questions, returns, and escalations. Represent the Declay brand warmly and professionally.',
          'Excellent written Vietnamese and English\nEmpathetic, patient communicator\nExperience with helpdesk software (Freshdesk, Zendesk, or similar)\nAvailability Mon–Sat 9 am–6 pm',
          'Remote (Vietnam)', TRUE
        ),
        (
          'Social Media Manager',
          'Plan and execute content across Instagram, TikTok, and Facebook to grow brand awareness and community engagement.',
          '2+ years social media management\nVideo editing skills\nPhotography portfolio',
          'Remote (Vietnam)', FALSE
        )
      ON CONFLICT DO NOTHING
    `);
    console.log('jobs: seeded');

    const jobIds = await client.query(`SELECT id FROM jobs ORDER BY id LIMIT 3`).then(r => r.rows.map(r => r.id));
    const [jArtist, jShipping, jSupport] = jobIds;

    // ── 9. job_applications ──────────────────────────────────────
    await client.query(`
      INSERT INTO job_applications (job_id, applicant_name, email, cv_url, cover_letter, status)
      VALUES
        ($1, 'Tran Minh Duc',    'duc.tran@email.com',   'https://cv.example.com/duc-tran.pdf',    'I have been sculpting resin figures for 5 years and would love to bring my passion to Declay.', 'interview'),
        ($1, 'Le Thi Hoa',       'hoa.le@email.com',     'https://cv.example.com/hoa-le.pdf',      'Graduated top of my class in fine arts. Attached portfolio shows my character sculpting range.', 'reviewing'),
        ($1, 'Nguyen Van Khanh', 'khanh.nv@email.com',   'https://cv.example.com/khanh-nguyen.pdf','Three years professional ZBrush work for a game studio. Eager to transition to collectibles.',   'received'),
        ($2, 'Pham Thi Mai',     'mai.pham@email.com',   'https://cv.example.com/mai-pham.pdf',    'Two years at a fulfilment centre with zero error rate. Excited to join a craft-focused team.',  'hired'),
        ($2, 'Bui Quoc Tuan',    'tuan.bui@email.com',   'https://cv.example.com/tuan-bui.pdf',    'Experienced in warehouse operations and courier coordination.',                                  'reviewing'),
        ($3, 'Vo Thi Lan',       'lan.vo@email.com',     'https://cv.example.com/lan-vo.pdf',      'Fluent in English and Vietnamese. Two years Zendesk experience at an e-commerce startup.',      'interview'),
        ($3, 'Dang Hoai Nam',    'nam.dang@email.com',   'https://cv.example.com/nam-dang.pdf',    'Customer-first mindset, experienced with high-volume ticket queues.',                           'received'),
        ($3, 'Ly Kim Chi',       'chi.ly@email.com',     'https://cv.example.com/chi-ly.pdf',      'Five years in customer success for a SaaS company. Looking for a brand I can be proud of.',    'rejected')
      ON CONFLICT DO NOTHING
    `, [jArtist, jShipping, jSupport]);
    console.log('job_applications: seeded');

    // ── 10. orders + order_items ─────────────────────────────────
    const variantRows = await client.query(`
      SELECT pv.id, pv.price, pv.name AS variant_name, p.name AS product_name
      FROM product_variants pv
      JOIN products p ON p.id = pv.product_id
      ORDER BY pv.id
    `).then(r => r.rows);

    const v = (idx) => variantRows[idx];

    const addrOf = (userId) => addrIds.find(a => a.user_id === userId)?.id || null;

    const orders = [
      // delivered
      { userId: u1, status: 'delivered',        total: 139.98, stripeId: 'pi_test_delivered_001', addrId: addrOf(u1),
        items: [{ v: v(0), qty: 2 }] },
      // shipped
      { userId: u2, status: 'shipped',          total: 89.99,  stripeId: 'pi_test_shipped_001',   addrId: addrOf(u2),
        items: [{ v: v(1), qty: 1 }] },
      // processing
      { userId: u3, status: 'processing',       total: 124.98, stripeId: 'pi_test_proc_001',      addrId: addrOf(u3),
        items: [{ v: v(4), qty: 1 }, { v: v(6), qty: 1 }] },
      // paid
      { userId: u1, status: 'paid',             total: 99.99,  stripeId: 'pi_test_paid_001',      addrId: addrOf(u1),
        items: [{ v: v(9), qty: 1 }] },
      // pending payment
      { userId: u4, status: 'pending_payment',  total: 34.99,  stripeId: null,                    addrId: addrOf(u4),
        items: [{ v: v(14), qty: 1 }] },
      // cancelled
      { userId: u5, status: 'cancelled',        total: 49.99,  stripeId: 'pi_test_cancel_001',    addrId: addrOf(u5),
        items: [{ v: v(6), qty: 1 }] },
      // another delivered — multi-item
      { userId: u2, status: 'delivered',        total: 194.97, stripeId: 'pi_test_delivered_002', addrId: addrOf(u2),
        items: [{ v: v(12), qty: 1 }, { v: v(13), qty: 1 }, { v: v(14), qty: 1 }] },
      // shipped
      { userId: u3, status: 'shipped',          total: 249.99, stripeId: 'pi_test_shipped_002',   addrId: addrOf(u3),
        items: [{ v: v(16), qty: 1 }] },
    ];

    for (const o of orders) {
      const { rows: [ord] } = await client.query(`
        INSERT INTO orders (user_id, status, total_amount, stripe_payment_intent_id, shipping_address_id, notes)
        VALUES ($1, $2, $3, $4, $5, NULL)
        ON CONFLICT (stripe_payment_intent_id) DO NOTHING
        RETURNING id
      `, [o.userId, o.status, o.total, o.stripeId, o.addrId]);

      if (!ord) continue; // already existed

      for (const item of o.items) {
        await client.query(`
          INSERT INTO order_items (order_id, variant_id, quantity, price_at_purchase, variant_name_at_purchase, product_name_at_purchase)
          VALUES ($1, $2, $3, $4, $5, $6)
        `, [ord.id, item.v.id, item.qty, item.v.price, item.v.variant_name, item.v.product_name]);
      }
    }
    console.log('orders + order_items: seeded', orders.length, 'orders');

    await client.query('COMMIT');
    console.log('\nSeed complete.');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Seed failed, rolled back:', err.message);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

run();
