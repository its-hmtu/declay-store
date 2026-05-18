import { compareSync, hashSync } from 'bcryptjs';
import {
  CreationOptional,
  DataTypes,
  InferAttributes,
  InferCreationAttributes,
  Model,
} from 'sequelize';
import { sequelize } from '@/config/sequelize';

const SALT_ROUNDS = Number(process.env.AUTH_SALT_ROUNDS ?? 10);

export type AdminRole = 'super_admin' | 'admin' | 'editor';

class AdminUser extends Model<InferAttributes<AdminUser>, InferCreationAttributes<AdminUser>> {
  declare id: CreationOptional<number>;
  declare email: string;
  declare password: string;
  declare fullName: CreationOptional<string | null>;
  declare role: CreationOptional<AdminRole>;
  declare isActive: CreationOptional<boolean>;
  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;

  verifyPassword(password: string): boolean {
    return compareSync(password, this.password);
  }

  toSafeJSON() {
    return {
      id: this.id,
      email: this.email,
      fullName: this.fullName,
      role: this.role,
      isActive: this.isActive,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    };
  }
}

AdminUser.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    email: {
      type: DataTypes.STRING(255),
      allowNull: false,
      unique: true,
    },
    password: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    fullName: {
      type: DataTypes.STRING(255),
      allowNull: true,
      field: 'full_name',
    },
    role: {
      type: DataTypes.ENUM('super_admin', 'admin', 'editor'),
      allowNull: false,
      defaultValue: 'admin',
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
      field: 'is_active',
    },
    createdAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
      field: 'created_at',
    },
    updatedAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
      field: 'updated_at',
    },
  },
  {
    sequelize,
    tableName: 'admin_users',
    modelName: 'AdminUser',
    timestamps: true,
    underscored: true,
    defaultScope: {
      attributes: { exclude: ['password'] },
    },
    hooks: {
      beforeCreate: (admin: AdminUser) => {
        admin.password = hashSync(admin.password, SALT_ROUNDS);
      },
      beforeUpdate: (admin: AdminUser) => {
        if (admin.changed('password')) {
          admin.password = hashSync(admin.password, SALT_ROUNDS);
        }
      },
    },
  },
);

export default AdminUser;
