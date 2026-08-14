'use strict';
const fs = require('fs');
const path = require('path');
const SQL_FILE = path.join(__dirname, '022_ghn_master_data.sql');
module.exports = {
  async up(queryInterface) { await queryInterface.sequelize.query(fs.readFileSync(SQL_FILE, 'utf8')); },
  async down(queryInterface) {
    await queryInterface.sequelize.query(
      'ALTER TABLE orders DROP COLUMN IF EXISTS shipping_carrier, DROP COLUMN IF EXISTS ghn_service_id,' +
      ' DROP COLUMN IF EXISTS ghn_service_type_id, DROP COLUMN IF EXISTS shipping_fee_quoted,' +
      ' DROP COLUMN IF EXISTS shipping_weight_gram;' +
      ' ALTER TABLE addresses DROP COLUMN IF EXISTS ghn_province_id, DROP COLUMN IF EXISTS ghn_district_id,' +
      ' DROP COLUMN IF EXISTS ghn_ward_code;' +
      ' DROP TABLE IF EXISTS ghn_wards; DROP TABLE IF EXISTS ghn_districts; DROP TABLE IF EXISTS ghn_provinces;',
    );
  },
};
