'use strict';

const fs = require('fs');
const path = require('path');

const SQL_FILE = path.join(__dirname, '007_payments_refunds.sql');

module.exports = {
  async up(queryInterface) {
    const sql = fs.readFileSync(SQL_FILE, 'utf8');
    await queryInterface.sequelize.query(sql);
  },
  async down(queryInterface) {
    await queryInterface.sequelize.query('DROP TABLE IF EXISTS refunds; DROP TABLE IF EXISTS payments;');
  },
};
