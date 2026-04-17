import { compareSync, hashSync } from 'bcryptjs';
import {
  CreationOptional,
  DataTypes,
  InferAttributes,
  InferCreationAttributes,
  Model,
} from 'sequelize';
import { sequelize } from '../lib/sequelize';

export type UserRole = 'user' | 'admin';

const SALT_ROUNDS = Number(process.env.AUTH_SALT_ROUNDS ?? 10);

class User extends Model<InferAttributes<User>, InferCreationAttributes<User>> {
  declare id: CreationOptional<string>;
  declare email: string;
  declare username: CreationOptional<string | null>;
  declare fullName: CreationOptional<string | null>;
  declare passwordHash: string;
  declare role: CreationOptional<UserRole>;
  declare isActive: CreationOptional<boolean>;
  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;

  verifyPassword(password: string): boolean {
    return compareSync(password, this.passwordHash);
  }

  toSafeJSON(): {
    id: string;
    email: string;
    username: string | null;
    fullName: string | null;
    role: UserRole;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
  } {
    return {
      id: this.id,
      email: this.email,
      username: this.username,
      fullName: this.fullName,
      role: this.role,
      isActive: this.isActive,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    };
  }
}

User.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
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
    passwordHash: {
      type: DataTypes.STRING(255),
      allowNull: false,
      field: 'password_hash',
      validate: {
        notEmpty: true,
      },
    },
    role: {
      type: DataTypes.ENUM('user', 'admin'),
      allowNull: false,
      defaultValue: 'user',
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
    tableName: 'users',
    modelName: 'User',
    timestamps: true,
    underscored: true,
    defaultScope: {
      attributes: { exclude: ['passwordHash'] },
    },
    hooks: {
      beforeCreate: (user: User) => {
        if (user.passwordHash) {
          user.passwordHash = hashSync(user.passwordHash, SALT_ROUNDS);
        }
      },
      beforeUpdate: (user: User) => {
        if (user.changed('passwordHash') && user.passwordHash) {
          user.passwordHash = hashSync(user.passwordHash, SALT_ROUNDS);
        }
      },
    },
  },
);

export default User;
