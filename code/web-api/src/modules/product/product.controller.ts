import type { Request, Response } from 'express';
import asyncHandler from 'express-async-handler';
import { sendSuccess } from '@/utils/response';
import type { IProductController, IProductService } from './product.interface';

export default class ProductController implements IProductController {
  constructor(private productService: IProductService) {}

  list = asyncHandler(async (req: Request, res: Response) => {
    const categoryId = typeof req.query.categoryId === 'string' ? req.query.categoryId : undefined;
    const page = typeof req.query.page === 'string' ? req.query.page : undefined;
    const limit = typeof req.query.limit === 'string' ? req.query.limit : undefined;
    const search = typeof req.query.search === 'string' ? req.query.search : undefined;
    const result = await this.productService.list({
      categoryId: categoryId ? Number(categoryId) : undefined,
      page: page ? Number(page) : 1,
      limit: limit ? Math.min(Number(limit), 100) : 20,
      search,
    });
    sendSuccess(res, result.rows, 'Products retrieved successfully', 200, {
      total: result.count,
      page: page ? Number(page) : 1,
      limit: limit ? Math.min(Number(limit), 100) : 20,
    });
  });

  findById = asyncHandler(async (req: Request, res: Response) => {
    const product = await this.productService.findById(Number(req.params.id));
    sendSuccess(res, product, 'Product retrieved successfully');
  });

  findBySlug = asyncHandler(async (req: Request, res: Response) => {
    const product = await this.productService.findBySlug(req.params.slug as string);
    sendSuccess(res, product, 'Product retrieved successfully');
  });

  create = asyncHandler(async (req: Request, res: Response) => {
    const product = await this.productService.create(req.body);
    sendSuccess(res, product, 'Product created successfully', 201);
  });

  update = asyncHandler(async (req: Request, res: Response) => {
    const product = await this.productService.update(Number(req.params.id), req.body);
    sendSuccess(res, product, 'Product updated successfully');
  });

  delete = asyncHandler(async (req: Request, res: Response) => {
    await this.productService.delete(Number(req.params.id));
    sendSuccess(res, null, 'Product deleted successfully');
  });
}
