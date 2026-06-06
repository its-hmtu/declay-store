import {
  CreationOptional,
  DataTypes,
  InferAttributes,
  InferCreationAttributes,
  Model,
} from 'sequelize';
import { sequelize } from '@/config/sequelize';
import User from '@/modules/user/user.entity';

export class EmailVerificationToken extends Model<
  InferAttributes<EmailVerificationToken>,
  InferCreationAttributes<EmailVerificationToken>
> {
  declare id: CreationOptional<number>;
  declare userId: number;
  declare token: string;
  declare expiresAt: Date;
  declare usedAt: CreationOptional<Date | null>;
  declare createdAt: CreationOptional<Date>;
}

EmailVerificationToken.init(
  {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    userId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: 'user_id',
      references: { model: 'users', key: 'id' },
      onDelete: 'CASCADE',
    },
    token: { type: DataTypes.STRING(255), allowNull: false, unique: true },
    expiresAt: { type: DataTypes.DATE, allowNull: false, field: 'expires_at' },
    usedAt: { type: DataTypes.DATE, allowNull: true, field: 'used_at' },
    createdAt: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW, field: 'created_at' },
  },
  {
    sequelize,
    tableName: 'email_verification_tokens',
    modelName: 'EmailVerificationToken',
    timestamps: false,
    underscored: true,
  },
);

export class PasswordResetToken extends Model<
  InferAttributes<PasswordResetToken>,
  InferCreationAttributes<PasswordResetToken>
> {
  declare id: CreationOptional<number>;
  declare userId: number;
  declare token: string;
  declare expiresAt: Date;
  declare usedAt: CreationOptional<Date | null>;
  declare createdAt: CreationOptional<Date>;
}

PasswordResetToken.init(
  {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    userId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: 'user_id',
      references: { model: 'users', key: 'id' },
      onDelete: 'CASCADE',
    },
    token: { type: DataTypes.STRING(255), allowNull: false, unique: true },
    expiresAt: { type: DataTypes.DATE, allowNull: false, field: 'expires_at' },
    usedAt: { type: DataTypes.DATE, allowNull: true, field: 'used_at' },
    createdAt: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW, field: 'created_at' },
  },
  {
    sequelize,
    tableName: 'password_reset_tokens',
    modelName: 'PasswordResetToken',
    timestamps: false,
    underscored: true,
  },
);

// Associations
User.hasMany(EmailVerificationToken, { foreignKey: 'userId', as: 'emailVerificationTokens', onDelete: 'CASCADE' });
EmailVerificationToken.belongsTo(User, { foreignKey: 'userId', as: 'user' });

User.hasMany(PasswordResetToken, { foreignKey: 'userId', as: 'passwordResetTokens', onDelete: 'CASCADE' });
PasswordResetToken.belongsTo(User, { foreignKey: 'userId', as: 'user' });
