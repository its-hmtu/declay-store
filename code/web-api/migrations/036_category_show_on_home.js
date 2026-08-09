'use strict';
const fs = require('fs');
const path = require('path');
const SQL_FILE = path.join(__dirname, '036_category_show_on_home.sql');
module.exports = {
  async up(queryInterface) {
    await queryInterface.sequelize.query(fs.readFileSync(SQL_FILE, 'utf8'));
  },
  async down(queryInterface) {
    await queryInterface.sequelize.query(`
      DROP INDEX IF EXISTS idx_categories_show_on_home;
      ALTER TABLE categories DROP COLUMN IF EXISTS show_on_home;
    `);
  },
};
