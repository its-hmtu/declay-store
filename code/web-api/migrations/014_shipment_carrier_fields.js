'use strict';
const fs = require('fs');
const path = require('path');
const SQL_FILE = path.join(__dirname, '014_shipment_carrier_fields.sql');
module.exports = {
  async up(queryInterface) { await queryInterface.sequelize.query(fs.readFileSync(SQL_FILE, 'utf8')); },
  async down(queryInterface) {
    await queryInterface.sequelize.query(
      "ALTER TABLE order_shipments DROP COLUMN IF EXISTS provider, DROP COLUMN IF EXISTS provider_shipment_id, DROP COLUMN IF EXISTS status, DROP COLUMN IF EXISTS incoterm, DROP COLUMN IF EXISTS label_url, DROP COLUMN IF EXISTS cost, DROP COLUMN IF EXISTS currency, DROP COLUMN IF EXISTS last_event, DROP COLUMN IF EXISTS last_event_at, DROP COLUMN IF EXISTS pod_url;",
    );
  },
};
