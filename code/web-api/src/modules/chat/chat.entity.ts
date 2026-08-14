import {
  CreationOptional,
  DataTypes,
  InferAttributes,
  InferCreationAttributes,
  Model,
} from 'sequelize';
import { sequelize } from '@/config/sequelize';
import User from '@/modules/user/user.entity';
import AdminUser from '@/modules/admin-auth/admin-auth.entity';

export type ChatSessionType = 'storefront' | 'admin';
/** 'staff' = a human replied; 'system' = transcript marker, not shown as a bubble. */
export type ChatRole = 'user' | 'assistant' | 'staff' | 'system';
/** M-42: session state machine — bot → waiting → live → closed. */
export type ChatMode = 'bot' | 'waiting' | 'live' | 'closed';

export class ChatSession extends Model<
  InferAttributes<ChatSession>,
  InferCreationAttributes<ChatSession>
> {
  declare id: CreationOptional<number>;
  declare sessionType: CreationOptional<ChatSessionType>;
  declare userId: CreationOptional<number | null>;
  declare adminId: CreationOptional<number | null>;
  // M-42: live-chat handoff.
  declare mode: CreationOptional<ChatMode>;
  declare assignedAdminId: CreationOptional<number | null>;
  declare guestSessionId: CreationOptional<string | null>;
  declare guestName: CreationOptional<string | null>;
  declare guestEmail: CreationOptional<string | null>;
  declare handoffReason: CreationOptional<string | null>;
  declare handoffRequestedAt: CreationOptional<Date | null>;
  declare claimedAt: CreationOptional<Date | null>;
  declare closedAt: CreationOptional<Date | null>;
  declare lastMessageAt: CreationOptional<Date | null>;
  declare staffLastReadAt: CreationOptional<Date | null>;
  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;
}

ChatSession.init(
  {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    sessionType: {
      type: DataTypes.ENUM('storefront', 'admin'),
      allowNull: false,
      defaultValue: 'storefront',
      field: 'session_type',
    },
    userId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      field: 'user_id',
      references: { model: 'users', key: 'id' },
      onDelete: 'SET NULL',
    },
    adminId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      field: 'admin_id',
      references: { model: 'admin_users', key: 'id' },
      onDelete: 'SET NULL',
    },
    mode: {
      type: DataTypes.ENUM('bot', 'waiting', 'live', 'closed'),
      allowNull: false,
      defaultValue: 'bot',
    },
    assignedAdminId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      field: 'assigned_admin_id',
      references: { model: 'admin_users', key: 'id' },
      onDelete: 'SET NULL',
    },
    guestSessionId: { type: DataTypes.STRING(64), allowNull: true, field: 'guest_session_id' },
    guestName: { type: DataTypes.STRING(120), allowNull: true, field: 'guest_name' },
    guestEmail: { type: DataTypes.STRING(255), allowNull: true, field: 'guest_email' },
    handoffReason: { type: DataTypes.STRING(255), allowNull: true, field: 'handoff_reason' },
    handoffRequestedAt: { type: DataTypes.DATE, allowNull: true, field: 'handoff_requested_at' },
    claimedAt: { type: DataTypes.DATE, allowNull: true, field: 'claimed_at' },
    closedAt: { type: DataTypes.DATE, allowNull: true, field: 'closed_at' },
    lastMessageAt: { type: DataTypes.DATE, allowNull: true, field: 'last_message_at' },
    staffLastReadAt: { type: DataTypes.DATE, allowNull: true, field: 'staff_last_read_at' },
    createdAt: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW, field: 'created_at' },
    updatedAt: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW, field: 'updated_at' },
  },
  {
    sequelize,
    tableName: 'chat_sessions',
    modelName: 'ChatSession',
    timestamps: true,
    underscored: true,
  },
);

export class ChatMessage extends Model<
  InferAttributes<ChatMessage>,
  InferCreationAttributes<ChatMessage>
> {
  declare id: CreationOptional<number>;
  declare sessionId: number;
  declare role: ChatRole;
  declare content: string;
  declare toolCalls: CreationOptional<object | null>;
  /** M-42: who wrote it, when a human did. Name is snapshotted so the transcript survives staff turnover. */
  declare adminId: CreationOptional<number | null>;
  declare authorName: CreationOptional<string | null>;
  declare createdAt: CreationOptional<Date>;
}

ChatMessage.init(
  {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    sessionId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: 'session_id',
      references: { model: 'chat_sessions', key: 'id' },
      onDelete: 'CASCADE',
    },
    role: {
      type: DataTypes.ENUM('user', 'assistant', 'staff', 'system'),
      allowNull: false,
    },
    content: { type: DataTypes.TEXT, allowNull: false },
    toolCalls: {
      type: DataTypes.JSONB,
      allowNull: true,
      field: 'tool_calls',
    },
    adminId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      field: 'admin_id',
      references: { model: 'admin_users', key: 'id' },
      onDelete: 'SET NULL',
    },
    authorName: { type: DataTypes.STRING(120), allowNull: true, field: 'author_name' },
    createdAt: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW, field: 'created_at' },
  },
  {
    sequelize,
    tableName: 'chat_messages',
    modelName: 'ChatMessage',
    timestamps: false,
    underscored: true,
  },
);

// Associations
User.hasMany(ChatSession, { foreignKey: 'userId', as: 'chatSessions' });
ChatSession.belongsTo(User, { foreignKey: 'userId', as: 'user' });
AdminUser.hasMany(ChatSession, { foreignKey: 'adminId', as: 'chatSessions' });
ChatSession.belongsTo(AdminUser, { foreignKey: 'adminId', as: 'admin' });
// M-42: separate from `admin` (which marks an admin-assistant session) — this is
// the staff member handling a customer conversation.
ChatSession.belongsTo(AdminUser, { foreignKey: 'assignedAdminId', as: 'assignedAdmin' });
ChatSession.hasMany(ChatMessage, { foreignKey: 'sessionId', as: 'messages', onDelete: 'CASCADE' });
ChatMessage.belongsTo(ChatSession, { foreignKey: 'sessionId', as: 'session' });
