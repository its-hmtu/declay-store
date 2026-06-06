import {
  CreationOptional,
  DataTypes,
  InferAttributes,
  InferCreationAttributes,
  Model,
} from 'sequelize';
import { sequelize } from '@/config/sequelize';
import User from '@/modules/user/user.entity';
import Product from '@/modules/product/product.entity';
import ProductVariant from '@/modules/product-variant/product-variant.entity';

class ProductReview extends Model<
  InferAttributes<ProductReview>,
  InferCreationAttributes<ProductReview>
> {
  declare id: CreationOptional<number>;
  declare userId: number;
  declare productId: number;
  declare variantId: CreationOptional<number | null>;
  declare rating: number;
  declare title: CreationOptional<string | null>;
  declare body: CreationOptional<string | null>;
  declare isVerifiedPurchase: CreationOptional<boolean>;
  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;
}

ProductReview.init(
  {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    userId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: 'user_id',
      references: { model: 'users', key: 'id' },
      onDelete: 'CASCADE',
    },
    productId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: 'product_id',
      references: { model: 'products', key: 'id' },
      onDelete: 'CASCADE',
    },
    variantId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      field: 'variant_id',
      references: { model: 'product_variants', key: 'id' },
      onDelete: 'SET NULL',
    },
    rating: {
      type: DataTypes.SMALLINT,
      allowNull: false,
      validate: { min: 1, max: 5 },
    },
    title: { type: DataTypes.STRING(200), allowNull: true },
    body: { type: DataTypes.TEXT, allowNull: true },
    isVerifiedPurchase: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      field: 'is_verified_purchase',
    },
    createdAt: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW, field: 'created_at' },
    updatedAt: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW, field: 'updated_at' },
  },
  {
    sequelize,
    tableName: 'product_reviews',
    modelName: 'ProductReview',
    timestamps: true,
    underscored: true,
  },
);

// Associations
User.hasMany(ProductReview, { foreignKey: 'userId', as: 'reviews' });
ProductReview.belongsTo(User, { foreignKey: 'userId', as: 'user' });

Product.hasMany(ProductReview, { foreignKey: 'productId', as: 'reviews' });
ProductReview.belongsTo(Product, { foreignKey: 'productId', as: 'product' });

ProductVariant.hasMany(ProductReview, { foreignKey: 'variantId', as: 'reviews' });
ProductReview.belongsTo(ProductVariant, { foreignKey: 'variantId', as: 'variant' });

export default ProductReview;
