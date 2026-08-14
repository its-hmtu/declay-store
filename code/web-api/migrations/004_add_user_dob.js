'use strict';

const fs = require('fs');
const path = require('path');

const SQL_FILE = path.join(__dirname, '004_add_user_dob.sql');

/**
 * Wrapper migration: executes the raw SQL in 004_add_user_dob.sql.
 * The SQL is idempotent (IF NOT EXISTS), so re-running is safe.
 */
module.exports = {
  async up(queryInterface) {
    const sql = fs.readFileSync(SQL_FILE, 'utf8');
    await queryInterface.sequelize.query(sql);
  },

  async down(queryInterface) {
    await queryInterface.sequelize.query('ALTER TABLE users DROP COLUMN IF EXISTS date_of_birth;');
  },
};
