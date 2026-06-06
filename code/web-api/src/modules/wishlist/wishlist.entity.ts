import {
  CreationOptional,
  DataTypes,
  InferAttributes,
  InferCreationAttributes,
  Model,
} from 'sequelize';
import { sequelize } from '@/config/sequelize';
import User from '@/modules/user/user.entity';
import ProductVariant from '@/modules/product-variant/product-variant.entity';

class Wishlist extends Model<InferAttributes<Wishlist>, InferCreationAttributes<Wishlist>> {
  declare id: CreationOptional<number>;
  declare userId: number;
  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;
}

Wishlist.init(
  {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    userId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      unique: true,
      field: 'user_id',
      references: { model: 'users', key: 'id' },
      onDelete: 'CASCADE',
    },
    createdAt: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW, field: 'created_at' },
    updatedAt: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW, field: 'updated_at' },
  },
  {
    sequelize,
    tableName: 'wishlists',
    modelName: 'Wishlist',
    timestamps: true,
    underscored: true,
  },
);

class WishlistItem extends Model<InferAttributes<WishlistItem>, InferCreationAttributes<WishlistItem>> {
  declare id: CreationOptional<number>;
  declare wishlistId: number;
  declare variantId: number;
  declare addedAt: CreationOptional<Date>;
}

WishlistItem.init(
  {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    wishlistId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: 'wishlist_id',
      references: { model: 'wishlists', key: 'id' },
      onDelete: 'CASCADE',
    },
    variantId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: 'variant_id',
      references: { model: 'product_variants', key: 'id' },
      onDelete: 'CASCADE',
    },
    addedAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
      field: 'added_at',
    },
  },
  {
    sequelize,
    tableName: 'wishlist_items',
    modelName: 'WishlistItem',
    timestamps: false,
    underscored: true,
  },
);

// Associations
User.hasOne(Wishlist, { foreignKey: 'userId', as: 'wishlist', onDelete: 'CASCADE' });
Wishlist.belongsTo(User, { foreignKey: 'userId', as: 'user' });
Wishlist.hasMany(WishlistItem, { foreignKey: 'wishlistId', as: 'items', onDelete: 'CASCADE' });
WishlistItem.belongsTo(Wishlist, { foreignKey: 'wishlistId', as: 'wishlist' });
ProductVariant.hasMany(WishlistItem, { foreignKey: 'variantId', as: 'wishlistItems' });
WishlistItem.belongsTo(ProductVariant, { foreignKey: 'variantId', as: 'variant' });

export { Wishlist, WishlistItem };
