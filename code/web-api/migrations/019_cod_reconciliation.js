'use strict';
const fs = require('fs');
const path = require('path');
const SQL_FILE = path.join(__dirname, '019_cod_reconciliation.sql');
module.exports = {
  async up(queryInterface) { await queryInterface.sequelize.query(fs.readFileSync(SQL_FILE, 'utf8')); },
  async down(queryInterface) {
    await queryInterface.sequelize.query(
      'DROP INDEX IF EXISTS idx_payments_cod_pending;' +
      ' ALTER TABLE payments DROP COLUMN IF EXISTS reconciled_at, DROP COLUMN IF EXISTS reconciled_amount,' +
      ' DROP COLUMN IF EXISTS reconciled_by, DROP COLUMN IF EXISTS reconcile_note;',
    );
  },
};
