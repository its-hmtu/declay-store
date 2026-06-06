import {
  CreationOptional,
  DataTypes,
  InferAttributes,
  InferCreationAttributes,
  Model,
} from 'sequelize';
import { sequelize } from '@/config/sequelize';
import Product from '@/modules/product/product.entity';
import Article from '@/modules/article/article.entity';

class Tag extends Model<InferAttributes<Tag>, InferCreationAttributes<Tag>> {
  declare id: CreationOptional<number>;
  declare name: string;
  declare slug: string;
  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;
}

Tag.init(
  {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    name: { type: DataTypes.STRING(100), allowNull: false },
    slug: { type: DataTypes.STRING(120), allowNull: false, unique: true },
    createdAt: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW, field: 'created_at' },
    updatedAt: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW, field: 'updated_at' },
  },
  {
    sequelize,
    tableName: 'tags',
    modelName: 'Tag',
    timestamps: true,
    underscored: true,
  },
);

// Many-to-many: Product ↔ Tag
Product.belongsToMany(Tag, {
  through: 'product_tags',
  foreignKey: 'product_id',
  otherKey: 'tag_id',
  as: 'tags',
});
Tag.belongsToMany(Product, {
  through: 'product_tags',
  foreignKey: 'tag_id',
  otherKey: 'product_id',
  as: 'products',
});

// Many-to-many: Article ↔ Tag
Article.belongsToMany(Tag, {
  through: 'article_tags',
  foreignKey: 'article_id',
  otherKey: 'tag_id',
  as: 'tags',
});
Tag.belongsToMany(Article, {
  through: 'article_tags',
  foreignKey: 'tag_id',
  otherKey: 'article_id',
  as: 'articles',
});

export default Tag;
