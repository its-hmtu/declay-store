import {
  DataTypes,
  Model,
  type InferAttributes,
  type InferCreationAttributes,
  type CreationOptional,
} from 'sequelize';
import { sequelize } from '@/config/sequelize';

export type AuditActorType = 'admin' | 'ai_assistant' | 'system';
export type AuditSource = 'admin_ui' | 'ai_assistant' | 'system';

export class AuditLog extends Model<InferAttributes<AuditLog>, InferCreationAttributes<AuditLog>> {
  declare id: CreationOptional<number>;
  declare actorType: AuditActorType;
  declare actorId: CreationOptional<number | null>;
  declare action: string;
  declare entity: CreationOptional<string | null>;
  declare entityId: CreationOptional<string | null>;
  declare source: AuditSource;
  declare status: CreationOptional<string>;
  declare metadata: CreationOptional<Record<string, unknown> | null>;
  declare createdAt: CreationOptional<Date>;
}

AuditLog.init(
  {
    id: { type: DataTypes.BIGINT, autoIncrement: true, primaryKey: true },
    actorType: { type: DataTypes.STRING(20), allowNull: false, field: 'actor_type' },
    actorId: { type: DataTypes.INTEGER, allowNull: true, field: 'actor_id' },
    action: { type: DataTypes.STRING(255), allowNull: false },
    entity: { type: DataTypes.STRING(100), allowNull: true },
    entityId: { type: DataTypes.STRING(100), allowNull: true, field: 'entity_id' },
    source: { type: DataTypes.STRING(20), allowNull: false },
    status: { type: DataTypes.STRING(20), allowNull: false, defaultValue: 'success' },
    metadata: { type: DataTypes.JSONB, allowNull: true },
    createdAt: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW, field: 'created_at' },
  },
  {
    sequelize,
    tableName: 'audit_log',
    modelName: 'AuditLog',
    timestamps: false,
    underscored: true,
  },
);
