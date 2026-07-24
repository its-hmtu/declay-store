'use strict';

/**
 * Lightweight migration runner. The project's migrations are plain modules
 * exporting `up(queryInterface, Sequelize)` / `down(...)`, so we don't need
 * sequelize-cli — this applies any that haven't run yet and records them in a
 * `schema_migrations` table.
 *
 * Usage:
 *   node scripts/migrate.js            # apply all pending migrations
 *   node scripts/migrate.js up         # same
 *   node scripts/migrate.js down       # roll back the most recent migration
 *   node scripts/migrate.js status     # list applied / pending
 */

require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { Sequelize } = require('sequelize');

const MIGRATIONS_DIR = path.join(__dirname, '..', 'migrations');
const TABLE = 'schema_migrations';

const sequelize = new Sequelize({
  dialect: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT) || 5431,
  database: process.env.DB_NAME,
  username: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  logging: false,
});

function migrationFiles() {
  return fs
    .readdirSync(MIGRATIONS_DIR)
    .filter((f) => f.endsWith('.js'))
    .sort(); // numeric prefixes (001_, 002_, …) sort lexicographically
}

async function ensureTable() {
  await sequelize.query(
    `CREATE TABLE IF NOT EXISTS ${TABLE} (name VARCHAR(255) PRIMARY KEY, run_at TIMESTAMPTZ NOT NULL DEFAULT now());`,
  );
}

async function applied() {
  const [rows] = await sequelize.query(`SELECT name FROM ${TABLE} ORDER BY name;`);
  return rows.map((r) => r.name);
}

async function up() {
  const done = new Set(await applied());
  const pending = migrationFiles().filter((f) => !done.has(f));

  if (pending.length === 0) {
    console.log('✓ Database is up to date — no pending migrations.');
    return;
  }

  const qi = sequelize.getQueryInterface();
  for (const file of pending) {
    const migration = require(path.join(MIGRATIONS_DIR, file));
    process.stdout.write(`→ ${file} … `);
    await migration.up(qi, Sequelize);
    await sequelize.query(`INSERT INTO ${TABLE} (name) VALUES (:name);`, { replacements: { name: file } });
    console.log('done');
  }
  console.log(`✓ Applied ${pending.length} migration(s).`);
}

async function down() {
  const done = await applied();
  if (done.length === 0) {
    console.log('Nothing to roll back.');
    return;
  }
  const file = done[done.length - 1];
  const migration = require(path.join(MIGRATIONS_DIR, file));
  process.stdout.write(`← rolling back ${file} … `);
  if (typeof migration.down === 'function') {
    await migration.down(sequelize.getQueryInterface(), Sequelize);
  }
  await sequelize.query(`DELETE FROM ${TABLE} WHERE name = :name;`, { replacements: { name: file } });
  console.log('done');
}

async function status() {
  const done = new Set(await applied());
  console.log('Migrations:');
  for (const file of migrationFiles()) {
    console.log(`  ${done.has(file) ? '✓ applied' : '· pending'}  ${file}`);
  }
}

async function main() {
  const cmd = process.argv[2] || 'up';
  await sequelize.authenticate();
  await ensureTable();

  if (cmd === 'up') await up();
  else if (cmd === 'down') await down();
  else if (cmd === 'status') await status();
  else {
    console.error(`Unknown command "${cmd}". Use: up | down | status`);
    process.exitCode = 1;
  }
}

main()
  .catch((err) => {
    console.error('✗ Migration failed:', err.message);
    process.exitCode = 1;
  })
  .finally(() => sequelize.close());
