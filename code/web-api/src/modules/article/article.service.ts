import { IArticleService } from "./artical.interface";
import Article from "./article.entity";
import { httpError } from "@/utils/http-error";

class ArticleService implements IArticleService {
  async findArticleBySlug(slug: string): Promise<any | null> {
    const article = await Article.findOne({ where: { slug } });
    
    if (article) {
      // Increment view count
      article.views = (article.views || 0) + 1;
      await article.save();
      return article.toJSON();
    }

    return null;
  }

  async listArticles(limit?: number, offset?: number): Promise<any[]> {
    const articles = await Article.findAll({
      limit: limit || 10,
      offset: offset || 0,
      order: [['createdAt', 'DESC']],
    });

    return articles.map(article => article.toJSON());
  }

  async listArticlesByAuthor(authorId: number, limit?: number, offset?: number): Promise<any[]> {
    const articles = await Article.findAll({
      where: { authorId },
      limit: limit || 10,
      offset: offset || 0,
      order: [['createdAt', 'DESC']],
    });

    return articles.map(article => article.toJSON());
  }
}

export default ArticleService;