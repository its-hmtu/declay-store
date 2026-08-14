'use strict';

const fs = require('fs');
const path = require('path');

const SQL_FILE = path.join(__dirname, '003_new_tables.sql');

/**
 * Wrapper migration: executes the raw SQL in 003_new_tables.sql.
 * The SQL is idempotent (IF NOT EXISTS), so re-running is safe.
 * No-op `down` — write reverse DDL here if you need rollback support.
 */
module.exports = {
  async up(queryInterface) {
    const sql = fs.readFileSync(SQL_FILE, 'utf8');
    await queryInterface.sequelize.query(sql);
  },

  async down() {
    // Forward-only migration. Add reverse DDL here to support db:migrate:undo.
  },
};
