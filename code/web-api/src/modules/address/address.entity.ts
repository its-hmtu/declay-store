import {
  CreationOptional,
  DataTypes,
  InferAttributes,
  InferCreationAttributes,
  Model,
} from 'sequelize';
import { sequelize } from '@/config/sequelize';

class Address extends Model<InferAttributes<Address>, InferCreationAttributes<Address>> {
  declare id: CreationOptional<number>;
  declare userId: number;
  declare receiverName: string;
  declare receiverPhone: string;
  declare addressLine: string;
  declare addressLine2: CreationOptional<string | null>;
  declare ward: string;
  declare district: string;
  declare city: string;
  declare country: CreationOptional<string>;
  declare postalCode: CreationOptional<string | null>;
  declare isDefault: CreationOptional<boolean>;
  declare addressType: CreationOptional<'home' | 'work' | 'other'>;
  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;

  toJSON(): {
    id: number;
    userId: number;
    receiverName: string;
    receiverPhone: string;
    addressLine: string;
    addressLine2: string | null;
    ward: string;
    district: string;
    city: string;
    country: string;
    postalCode: string | null;
    isDefault: boolean;
    addressType: 'home' | 'work' | 'other';
    createdAt: Date;
    updatedAt: Date;
  } {
    return {
      id: this.id,
      userId: this.userId,
      receiverName: this.receiverName,
      receiverPhone: this.receiverPhone,
      addressLine: this.addressLine,
      addressLine2: this.addressLine2,
      ward: this.ward,
      district: this.district,
      city: this.city,
      country: this.country,
      postalCode: this.postalCode,
      isDefault: this.isDefault,
      addressType: this.addressType,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    }
  }
}

Address.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    userId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: 'user_id',
      references: {
        model: 'users',
        key: 'id',
      },
      onDelete: 'CASCADE',
    },
    receiverName: {
      type: DataTypes.STRING(255),
      allowNull: false,
      field: 'receiver_name',
    },
    receiverPhone: {
      type: DataTypes.STRING(20),
      allowNull: false,
      field: 'receiver_phone',
    },
    addressLine: {
      type: DataTypes.STRING(255),
      allowNull: false,
      field: 'address_line',
    },
    addressLine2: {
      type: DataTypes.STRING(255),
      allowNull: true,
      field: 'address_line2',
    },
    ward: {
      type: DataTypes.STRING(100),
      allowNull: true,
    },
    district: {
      type: DataTypes.STRING(100),
      allowNull: true,
    },
    city: {
      type: DataTypes.STRING(100),
      allowNull: true,
    },
    country: {
      type: DataTypes.STRING(100),
      allowNull: false,
      defaultValue: 'Vietnam',
    },
    postalCode: {
      type: DataTypes.STRING(20),
      allowNull: true,
      field: 'postal_code',
    },
    isDefault: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      field: 'is_default',
    },
    addressType: {
      type: DataTypes.ENUM('home', 'work', 'other'),
      allowNull: true,
      defaultValue: 'home',
      field: 'address_type',
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
    tableName: 'addresses',
    modelName: 'Address',
    timestamps: true,
    underscored: true,
    defaultScope: {
      attributes: { exclude: ['createdAt', 'updatedAt'] },
    },
    hooks: {
      beforeCreate: (address) => {
        if (!address.country) {
          address.country = 'Vietnam';
        }
      },
    }
  }
)

export default Address;