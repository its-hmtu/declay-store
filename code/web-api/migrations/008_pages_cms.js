'use strict';
const fs = require('fs');
const path = require('path');
const SQL_FILE = path.join(__dirname, '008_pages_cms.sql');
module.exports = {
  async up(queryInterface) {
    const sql = fs.readFileSync(SQL_FILE, 'utf8');
    await queryInterface.sequelize.query(sql);
  },
  async down(queryInterface) {
    await queryInterface.sequelize.query('DROP TABLE IF EXISTS page_versions; DROP TABLE IF EXISTS pages;');
  },
};
