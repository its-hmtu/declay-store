'use strict';

const fs = require('fs');
const path = require('path');

const SQL_FILE = path.join(__dirname, '005_add_product_views.sql');

/**
 * Wrapper migration: executes the raw SQL in 005_add_product_views.sql.
 * The SQL is idempotent (IF NOT EXISTS), so re-running is safe.
 */
module.exports = {
  async up(queryInterface) {
    const sql = fs.readFileSync(SQL_FILE, 'utf8');
    await queryInterface.sequelize.query(sql);
  },

  async down(queryInterface) {
    await queryInterface.sequelize.query('ALTER TABLE products DROP COLUMN IF EXISTS views;');
  },
};
