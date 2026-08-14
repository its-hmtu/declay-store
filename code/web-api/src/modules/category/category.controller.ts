import type { Request, Response } from 'express';
import asyncHandler from 'express-async-handler';
import { sendSuccess } from '@/utils/response';
import { httpError } from '@/utils/http-error';
import type { ICategoryController, ICategoryService } from './category.interface';

export default class CategoryController implements ICategoryController {
  constructor(private categoryService: ICategoryService) {}

  list = asyncHandler(async (req: Request, res: Response) => {
    // M-47: `?homeOnly=1` returns just the categories flagged for the home page.
    const homeOnly = req.query.homeOnly === '1' || req.query.homeOnly === 'true';
    const categories = await this.categoryService.list(homeOnly);
    sendSuccess(res, categories, 'Categories retrieved successfully');
  });

  adminList = asyncHandler(async (req: Request, res: Response) => {
    const categories = await this.categoryService.listAll();
    sendSuccess(res, categories, 'Categories retrieved successfully');
  });

  findById = asyncHandler(async (req: Request, res: Response) => {
    const id = Number(req.params.id);
    const category = await this.categoryService.findById(id);
    sendSuccess(res, category, 'Category retrieved successfully');
  });

  create = asyncHandler(async (req: Request, res: Response) => {
    const category = await this.categoryService.create(req.body);
    sendSuccess(res, category, 'Category created successfully', 201);
  });

  update = asyncHandler(async (req: Request, res: Response) => {
    const id = Number(req.params.id);
    const category = await this.categoryService.update(id, req.body);
    sendSuccess(res, category, 'Category updated successfully');
  });

  delete = asyncHandler(async (req: Request, res: Response) => {
    const id = Number(req.params.id);
    await this.categoryService.delete(id);
    sendSuccess(res, null, 'Category deleted successfully');
  });
}
