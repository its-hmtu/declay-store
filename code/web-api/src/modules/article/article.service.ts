import { IArticleService, ICreateArticleData, IUpdateArticleData, IArticle } from './artical.interface';
import Article from './article.entity';
import { httpError } from '@/utils/http-error';
import { invalidateCache } from '@/middlewares/cache.middleware';
import { cacheKey } from '@/config/redis';

class ArticleService implements IArticleService {
  async findById(id: number): Promise<IArticle> {
    const article = await Article.findByPk(id);
    if (!article) throw httpError(404, 'Article not found');
    return article.toJSON() as IArticle;
  }

  async findArticleBySlug(slug: string): Promise<IArticle | null> {
    const article = await Article.findOne({ where: { slug, isPublished: true } });
    if (!article) return null;

    article.views = (article.views || 0) + 1;
    await article.save();
    return article.toJSON() as IArticle;
  }

  async listArticles(limit = 10, offset = 0): Promise<IArticle[]> {
    const articles = await Article.findAll({
      where: { isPublished: true },
      limit,
      offset,
      order: [['createdAt', 'DESC']],
    });
    return articles.map((a) => a.toJSON() as IArticle);
  }

  async listAll(limit = 20, offset = 0): Promise<IArticle[]> {
    const articles = await Article.findAll({ limit, offset, order: [['createdAt', 'DESC']] });
    return articles.map((a) => a.toJSON() as IArticle);
  }

  async create(data: ICreateArticleData): Promise<IArticle> {
    const existing = await Article.findOne({ where: { slug: data.slug } });
    if (existing) throw httpError(409, 'An article with this slug already exists');

    const article = await Article.create(data);
    await invalidateCache(`${cacheKey.ARTICLE_LIST}*`);
    return article.toJSON() as IArticle;
  }

  async update(id: number, data: IUpdateArticleData): Promise<IArticle> {
    const article = await Article.findByPk(id);
    if (!article) throw httpError(404, 'Article not found');

    if (data.slug && data.slug !== article.slug) {
      const conflict = await Article.findOne({ where: { slug: data.slug } });
      if (conflict) throw httpError(409, 'An article with this slug already exists');
    }

    await article.update(data);
    await invalidateCache(`${cacheKey.ARTICLE_LIST}*`);
    await invalidateCache(`${cacheKey.ARTICLE_DETAIL}:${article.slug}`);
    return article.toJSON() as IArticle;
  }

  async delete(id: number): Promise<void> {
    const article = await Article.findByPk(id);
    if (!article) throw httpError(404, 'Article not found');
    await invalidateCache(`${cacheKey.ARTICLE_DETAIL}:${article.slug}`);
    await article.destroy();
    await invalidateCache(`${cacheKey.ARTICLE_LIST}*`);
  }
}

export default ArticleService;
