'use strict';
const fs = require('fs');
const path = require('path');
const SQL_FILE = path.join(__dirname, '009_shipping_order_totals.sql');
module.exports = {
  async up(queryInterface) {
    await queryInterface.sequelize.query(fs.readFileSync(SQL_FILE, 'utf8'));
  },
  async down(queryInterface) {
    await queryInterface.sequelize.query(
      'ALTER TABLE orders DROP COLUMN IF EXISTS shipping_method_id;' +
      'ALTER TABLE orders DROP COLUMN IF EXISTS shipping_fee;' +
      'ALTER TABLE orders DROP COLUMN IF EXISTS subtotal;' +
      'DROP TABLE IF EXISTS shipping_methods;',
    );
  },
};
