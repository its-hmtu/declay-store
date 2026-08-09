'use strict';
const fs = require('fs');
const path = require('path');
const SQL_FILE = path.join(__dirname, '032_order_item_campaign.sql');
module.exports = {
  async up(queryInterface) {
    await queryInterface.sequelize.query(fs.readFileSync(SQL_FILE, 'utf8'));
  },
  async down(queryInterface) {
    await queryInterface.sequelize.query(`
      DROP INDEX IF EXISTS idx_order_items_campaign;
      ALTER TABLE order_items
        DROP COLUMN IF EXISTS campaign_id,
        DROP COLUMN IF EXISTS campaign_name_at_purchase,
        DROP COLUMN IF EXISTS campaign_discount_percent,
        DROP COLUMN IF EXISTS campaign_discount_amount,
        DROP COLUMN IF EXISTS base_price_at_purchase;
    `);
  },
};
