'use strict';
const fs = require('fs');
const path = require('path');
const SQL_FILE = path.join(__dirname, '024_order_code_and_ghn_shipment.sql');
module.exports = {
  async up(queryInterface) { await queryInterface.sequelize.query(fs.readFileSync(SQL_FILE, 'utf8')); },
  async down(queryInterface) {
    await queryInterface.sequelize.query(
      'DROP INDEX IF EXISTS idx_orders_code;' +
      ' ALTER TABLE orders DROP COLUMN IF EXISTS order_code;' +
      ' ALTER TABLE order_shipments DROP COLUMN IF EXISTS raw_response;',
    );
  },
};
