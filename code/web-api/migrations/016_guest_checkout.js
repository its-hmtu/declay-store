'use strict';
const fs = require('fs');
const path = require('path');
const SQL_FILE = path.join(__dirname, '016_guest_checkout.sql');
module.exports = {
  async up(queryInterface) { await queryInterface.sequelize.query(fs.readFileSync(SQL_FILE, 'utf8')); },
  async down(queryInterface) {
    await queryInterface.sequelize.query(
      'DROP INDEX IF EXISTS idx_carts_session; ALTER TABLE carts DROP COLUMN IF EXISTS session_id;' +
      ' ALTER TABLE orders DROP COLUMN IF EXISTS guest_name, DROP COLUMN IF EXISTS guest_email, DROP COLUMN IF EXISTS guest_phone, DROP COLUMN IF EXISTS guest_token;',
    );
  },
};
