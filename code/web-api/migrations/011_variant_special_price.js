'use strict';
const fs = require('fs');
const path = require('path');
const SQL_FILE = path.join(__dirname, '011_variant_special_price.sql');
module.exports = {
  async up(queryInterface) { await queryInterface.sequelize.query(fs.readFileSync(SQL_FILE, 'utf8')); },
  async down(queryInterface) { await queryInterface.sequelize.query('ALTER TABLE product_variants DROP COLUMN IF EXISTS special_price;'); },
};
