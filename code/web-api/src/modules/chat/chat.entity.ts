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
export type ChatRole = 'user' | 'assistant';

export class ChatSession extends Model<
  InferAttributes<ChatSession>,
  InferCreationAttributes<ChatSession>
> {
  declare id: CreationOptional<number>;
  declare sessionType: CreationOptional<ChatSessionType>;
  declare userId: CreationOptional<number | null>;
  declare adminId: CreationOptional<number | null>;
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
      type: DataTypes.ENUM('user', 'assistant'),
      allowNull: false,
    },
    content: { type: DataTypes.TEXT, allowNull: false },
    toolCalls: {
      type: DataTypes.JSONB,
      allowNull: true,
      field: 'tool_calls',
    },
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
ChatSession.hasMany(ChatMessage, { foreignKey: 'sessionId', as: 'messages', onDelete: 'CASCADE' });
ChatMessage.belongsTo(ChatSession, { foreignKey: 'sessionId', as: 'session' });
