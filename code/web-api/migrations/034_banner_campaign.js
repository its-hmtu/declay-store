'use strict';
const fs = require('fs');
const path = require('path');
const SQL_FILE = path.join(__dirname, '034_banner_campaign.sql');
module.exports = {
  async up(queryInterface) {
    await queryInterface.sequelize.query(fs.readFileSync(SQL_FILE, 'utf8'));
  },
  async down(queryInterface) {
    await queryInterface.sequelize.query(`
      DROP INDEX IF EXISTS idx_banners_campaign;
      ALTER TABLE banners DROP COLUMN IF EXISTS campaign_id;
    `);
  },
};
