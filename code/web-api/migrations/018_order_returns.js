'use strict';
const fs = require('fs');
const path = require('path');
const SQL_FILE = path.join(__dirname, '018_order_returns.sql');

module.exports = {
  async up(queryInterface) {
    const sequelize = queryInterface.sequelize;

    // 1) Add the new order status value on its own statement. The enum type is
    //    `order_status_enum` (see 001_initial_schema.sql).
    await sequelize.query("ALTER TYPE order_status_enum ADD VALUE IF NOT EXISTS 'returned';");

    // 2) Columns + backfill.
    await sequelize.query(fs.readFileSync(SQL_FILE, 'utf8'));
  },
  async down(queryInterface) {
    // Postgres cannot drop a single enum value; only the added columns are reverted.
    await queryInterface.sequelize.query(
      'ALTER TABLE orders DROP COLUMN IF EXISTS delivered_at, DROP COLUMN IF EXISTS returned_at, DROP COLUMN IF EXISTS return_reason;',
    );
  },
};
