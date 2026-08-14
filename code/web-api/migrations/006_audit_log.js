'use strict';

const fs = require('fs');
const path = require('path');

const SQL_FILE = path.join(__dirname, '006_audit_log.sql');

/**
 * Wrapper migration: executes the raw SQL in 006_audit_log.sql.
 * The SQL is idempotent (IF NOT EXISTS), so re-running is safe.
 */
module.exports = {
  async up(queryInterface) {
    const sql = fs.readFileSync(SQL_FILE, 'utf8');
    await queryInterface.sequelize.query(sql);
  },

  async down(queryInterface) {
    await queryInterface.sequelize.query('DROP TABLE IF EXISTS audit_log;');
  },
};
