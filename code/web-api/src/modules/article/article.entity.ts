import {
  CreationOptional,
  DataTypes,
  InferAttributes,
  InferCreationAttributes,
  Model,
} from 'sequelize';
import { sequelize } from '@/config/sequelize';

class Article extends Model<InferAttributes<Article>, InferCreationAttributes<Article>> {
  declare id: CreationOptional<number>;
  declare title: string;
  declare content: string;
  declare authorId: number;
  declare slug: string;
  declare views: CreationOptional<number>;
  declare isPublished: CreationOptional<boolean>;
  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;

  toJSON() {
    return {
      id: this.id,
      title: this.title,
      content: this.content,
      authorId: this.authorId,
      slug: this.slug,
      views: this.views,
      isPublished: this.isPublished,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    };
  }
}

Article.init(
  {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    title: { type: DataTypes.STRING(255), allowNull: false },
    content: { type: DataTypes.TEXT, allowNull: false },
    // authorId references admin_users — stored as a plain integer without DB-level FK
    // to avoid coupling article writes to the users table
    authorId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: 'author_id',
    },
    slug: { type: DataTypes.STRING(255), allowNull: false, unique: true },
    views: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
    isPublished: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      field: 'is_published',
    },
    createdAt: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW, field: 'created_at' },
    updatedAt: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW, field: 'updated_at' },
  },
  {
    sequelize,
    tableName: 'articles',
    modelName: 'Article',
    timestamps: true,
    underscored: true,
  },
);

export default Article;
