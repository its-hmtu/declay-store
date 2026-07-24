import type { Request, Response } from 'express';
import asyncHandler from 'express-async-handler';
import { sendSuccess } from '@/utils/response';
import { PRODUCT_SORTS } from './product.interface';
import type { IProductController, IProductService, ProductSort } from './product.interface';

export default class ProductController implements IProductController {
  constructor(private productService: IProductService) {}

  list = asyncHandler(async (req: Request, res: Response) => {
    await this.respondWithList(req, res, false);
  });

  // Admin variant — includes inactive (hidden) products.
  adminList = asyncHandler(async (req: Request, res: Response) => {
    await this.respondWithList(req, res, true);
  });

  private async respondWithList(req: Request, res: Response, includeInactive: boolean) {
    const categoryId = typeof req.query.categoryId === 'string' ? req.query.categoryId : undefined;
    const collectionId = typeof req.query.collectionId === 'string' ? req.query.collectionId : undefined;
    const minPrice = typeof req.query.minPrice === 'string' ? req.query.minPrice : undefined;
    const maxPrice = typeof req.query.maxPrice === 'string' ? req.query.maxPrice : undefined;
    const page = typeof req.query.page === 'string' ? req.query.page : undefined;
    const limit = typeof req.query.limit === 'string' ? req.query.limit : undefined;
    const search = typeof req.query.search === 'string' ? req.query.search : undefined;
    const sortRaw = typeof req.query.sort === 'string' ? req.query.sort : undefined;
    const sort = (PRODUCT_SORTS as readonly string[]).includes(sortRaw ?? '')
      ? (sortRaw as ProductSort)
      : undefined;
    const resolvedPage = page ? Number(page) : 1;
    const resolvedLimit = limit ? Math.min(Number(limit), 100) : 20;
    const result = await this.productService.list({
      categoryId: categoryId ? Number(categoryId) : undefined,
      collectionId: collectionId ? Number(collectionId) : undefined,
      minPrice: minPrice !== undefined ? Number(minPrice) : undefined,
      maxPrice: maxPrice !== undefined ? Number(maxPrice) : undefined,
      page: resolvedPage,
      limit: resolvedLimit,
      search,
      sort,
      includeInactive,
    });
    sendSuccess(res, result.rows, 'Products retrieved successfully', 200, {
      total: result.count,
      page: resolvedPage,
      limit: resolvedLimit,
      totalPages: Math.max(1, Math.ceil(result.count / resolvedLimit)),
    });
  }

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
