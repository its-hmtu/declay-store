'use strict';
const fs = require('fs');
const path = require('path');
const SQL_FILE = path.join(__dirname, '013_collections.sql');
module.exports = {
  async up(queryInterface) { await queryInterface.sequelize.query(fs.readFileSync(SQL_FILE, 'utf8')); },
  async down(queryInterface) { await queryInterface.sequelize.query('DROP TABLE IF EXISTS collection_products; DROP TABLE IF EXISTS collections;'); },
};
