'use strict';
const fs = require('fs');
const path = require('path');
const SQL_FILE = path.join(__dirname, '033_live_chat_handoff.sql');

module.exports = {
  async up(queryInterface) {
    const sequelize = queryInterface.sequelize;

    // 1) New role values, each on its own statement. PostgreSQL refuses
    //    ALTER TYPE ... ADD VALUE inside a multi-statement transaction, so these
    //    cannot live in the .sql file (same workaround as 018_order_returns.js).
    //    The type is `chat_role_enum` — see 003_new_tables.sql. This schema uses
    //    hand-written enum names, not Sequelize's `enum_<table>_<column>` default.
    await sequelize.query("ALTER TYPE chat_role_enum ADD VALUE IF NOT EXISTS 'staff';");
    await sequelize.query("ALTER TYPE chat_role_enum ADD VALUE IF NOT EXISTS 'system';");

    // 2) Columns, indexes and backfill.
    await sequelize.query(fs.readFileSync(SQL_FILE, 'utf8'));
  },

  async down(queryInterface) {
    // PostgreSQL cannot drop a single enum value, so 'staff'/'system' stay on
    // chat_role_enum. Harmless — nothing reads them once the columns are gone.
    await queryInterface.sequelize.query(`
      DROP INDEX IF EXISTS idx_chat_sessions_queue;
      DROP INDEX IF EXISTS idx_chat_sessions_assigned;
      DROP INDEX IF EXISTS idx_chat_sessions_guest;
      DROP INDEX IF EXISTS idx_chat_messages_session_created;
      ALTER TABLE chat_messages
        DROP COLUMN IF EXISTS admin_id,
        DROP COLUMN IF EXISTS author_name;
      ALTER TABLE chat_sessions
        DROP COLUMN IF EXISTS mode,
        DROP COLUMN IF EXISTS assigned_admin_id,
        DROP COLUMN IF EXISTS guest_session_id,
        DROP COLUMN IF EXISTS guest_name,
        DROP COLUMN IF EXISTS guest_email,
        DROP COLUMN IF EXISTS handoff_reason,
        DROP COLUMN IF EXISTS handoff_requested_at,
        DROP COLUMN IF EXISTS claimed_at,
        DROP COLUMN IF EXISTS closed_at,
        DROP COLUMN IF EXISTS last_message_at,
        DROP COLUMN IF EXISTS staff_last_read_at;
      DROP TYPE IF EXISTS chat_mode_enum;
    `);
  },
};
