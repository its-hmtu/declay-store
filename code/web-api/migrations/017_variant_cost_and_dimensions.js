'use strict';
const fs = require('fs');
const path = require('path');
const SQL_FILE = path.join(__dirname, '017_variant_cost_and_dimensions.sql');
module.exports = {
  async up(queryInterface) { await queryInterface.sequelize.query(fs.readFileSync(SQL_FILE, 'utf8')); },
  async down(queryInterface) {
    await queryInterface.sequelize.query(
      'ALTER TABLE product_variants DROP COLUMN IF EXISTS cost_price, DROP COLUMN IF EXISTS weight_gram,' +
      ' DROP COLUMN IF EXISTS length_cm, DROP COLUMN IF EXISTS width_cm, DROP COLUMN IF EXISTS height_cm;',
    );
  },
};
