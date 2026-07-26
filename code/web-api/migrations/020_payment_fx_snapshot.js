'use strict';
const fs = require('fs');
const path = require('path');
const SQL_FILE = path.join(__dirname, '020_payment_fx_snapshot.sql');
module.exports = {
  async up(queryInterface) { await queryInterface.sequelize.query(fs.readFileSync(SQL_FILE, 'utf8')); },
  async down(queryInterface) {
    await queryInterface.sequelize.query(
      'ALTER TABLE payments DROP COLUMN IF EXISTS charged_amount,' +
      ' DROP COLUMN IF EXISTS charged_currency, DROP COLUMN IF EXISTS fx_rate;',
    );
  },
};
