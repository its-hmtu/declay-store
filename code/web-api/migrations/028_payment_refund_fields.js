'use strict';
const fs = require('fs');
const path = require('path');
const SQL_FILE = path.join(__dirname, '028_payment_refund_fields.sql');
module.exports = {
  async up(queryInterface) {
    await queryInterface.sequelize.query(fs.readFileSync(SQL_FILE, 'utf8'));
  },
  async down(queryInterface) {
    await queryInterface.sequelize.query(
      'ALTER TABLE payments DROP COLUMN IF EXISTS provider_txn_ref, DROP COLUMN IF EXISTS provider_pay_date;',
    );
  },
};
