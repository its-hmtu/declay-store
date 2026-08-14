'use strict';
const fs = require('fs');
const path = require('path');
const SQL_FILE = path.join(__dirname, '026_cancellation_return_refund.sql');
module.exports = {
  async up(queryInterface) {
    await queryInterface.sequelize.query(fs.readFileSync(SQL_FILE, 'utf8'));
  },
  async down(queryInterface) {
    await queryInterface.sequelize.query(
      'ALTER TABLE refunds' +
      '  DROP COLUMN IF EXISTS method,' +
      '  DROP COLUMN IF EXISTS provider,' +
      '  DROP COLUMN IF EXISTS provider_ref,' +
      '  DROP COLUMN IF EXISTS type,' +
      '  DROP COLUMN IF EXISTS cancellation_request_id,' +
      '  DROP COLUMN IF EXISTS return_request_id,' +
      '  DROP COLUMN IF EXISTS initiated_by,' +
      '  DROP COLUMN IF EXISTS currency,' +
      '  DROP COLUMN IF EXISTS updated_at;' +
      ' DROP TABLE IF EXISTS return_request_items;' +
      ' DROP TABLE IF EXISTS return_requests;' +
      ' DROP TABLE IF EXISTS cancellation_requests;' +
      ' ALTER TABLE orders DROP COLUMN IF EXISTS partial_returned;',
    );
  },
};
