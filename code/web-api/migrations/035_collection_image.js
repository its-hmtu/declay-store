'use strict';
const fs = require('fs');
const path = require('path');
const SQL_FILE = path.join(__dirname, '035_collection_image.sql');
module.exports = {
  async up(queryInterface) {
    await queryInterface.sequelize.query(fs.readFileSync(SQL_FILE, 'utf8'));
  },
  async down(queryInterface) {
    await queryInterface.sequelize.query('ALTER TABLE collections DROP COLUMN IF EXISTS image_url;');
  },
};
