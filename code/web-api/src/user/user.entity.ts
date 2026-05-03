import { compareSync, hashSync } from 'bcryptjs';
import {
  CreationOptional,
  DataTypes,
  InferAttributes,
  InferCreationAttributes,
  Model,
} from 'sequelize';
import { sequelize } from '@/config/database';

export type UserRole = 'user' | 'admin';

const SALT_ROUNDS = Number(process.env.AUTH_SALT_ROUNDS ?? 10);

class User extends Model<InferAttributes<User>, InferCreationAttributes<User>> {
  declare id: CreationOptional<number>;
  declare email: string;
  declare username: CreationOptional<string | null>;
  declare fullName: CreationOptional<string | null>;
  declare phoneNumber: CreationOptional<string | null>;
  declare password: string;
  declare isActive: CreationOptional<boolean>;
  declare isEmailVerified: CreationOptional<boolean>;
  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;

  verifyPassword(password: string): boolean {
    return compareSync(password, this.password);
  };

  toSafeJSON(): {
    id: number;
    email: string;
    username: string | null;
    fullName: string | null;
    phoneNumber: string | null;
    isActive: boolean;
    isEmailVerified: boolean;
    createdAt: Date;
    updatedAt: Date;
  } {
    return {
      id: this.id,
      email: this.email,
      username: this.username,
      fullName: this.fullName,
      phoneNumber: this.phoneNumber,
      isActive: this.isActive,
      isEmailVerified: this.isEmailVerified,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    };
  }
}

User.init(
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
      validate: {
        isEmail: true,
        notEmpty: true,
      },
    },
    username: {
      type: DataTypes.STRING(100),
      allowNull: true,
      unique: true,
      validate: {
        len: [3, 100],
      },
    },
    fullName: {
      type: DataTypes.STRING(255),
      allowNull: true,
      field: 'full_name',
    },
    password: {
      type: DataTypes.STRING(255),
      allowNull: false,
      field: 'password',
      validate: {
        notEmpty: true,
      },
    },
    phoneNumber: {
      type: DataTypes.STRING(20),
      allowNull: true,
      field: 'phone_number',
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
      field: 'is_active',
    },
    isEmailVerified: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      field: 'is_email_verified',
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
    tableName: 'users',
    modelName: 'User',
    timestamps: true,
    underscored: true,
    defaultScope: {
      attributes: { exclude: ['password', 'isActive'] },
    },
    hooks: {
      beforeCreate: (user: User) => {
        if (user.password) {
          user.password = hashSync(user.password, SALT_ROUNDS);
        }
      },
      beforeUpdate: (user: User) => {
        if (user.changed('password') && user.password) {
          user.password = hashSync(user.password, SALT_ROUNDS);
        }
      },
    },
  },
);

export default User;
