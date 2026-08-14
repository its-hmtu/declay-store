'use strict';
const fs = require('fs');
const path = require('path');
const SQL_FILE = path.join(__dirname, '029_order_status_timestamps.sql');
module.exports = {
  async up(queryInterface) {
    await queryInterface.sequelize.query(fs.readFileSync(SQL_FILE, 'utf8'));
  },
  async down(queryInterface) {
    await queryInterface.sequelize.query(
      'ALTER TABLE orders DROP COLUMN IF EXISTS paid_at, DROP COLUMN IF EXISTS processing_at;',
    );
  },
};
