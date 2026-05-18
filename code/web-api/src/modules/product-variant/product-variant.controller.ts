import type { Request, Response } from 'express';
import asyncHandler from 'express-async-handler';
import { sendSuccess } from '@/utils/response';
import type { IProductVariantController, IProductVariantService } from './product-variant.interface';

export default class ProductVariantController implements IProductVariantController {
  constructor(private variantService: IProductVariantService) {}

  listByProduct = asyncHandler(async (req: Request, res: Response) => {
    const variants = await this.variantService.listByProduct(Number(req.params.id));
    sendSuccess(res, variants, 'Variants retrieved successfully');
  });

  findById = asyncHandler(async (req: Request, res: Response) => {
    const variant = await this.variantService.findById(Number(req.params.variantId));
    sendSuccess(res, variant, 'Variant retrieved successfully');
  });

  create = asyncHandler(async (req: Request, res: Response) => {
    const variant = await this.variantService.create({
      ...req.body,
      productId: Number(req.params.id),
    });
    sendSuccess(res, variant, 'Variant created successfully', 201);
  });

  update = asyncHandler(async (req: Request, res: Response) => {
    const variant = await this.variantService.update(Number(req.params.variantId), req.body);
    sendSuccess(res, variant, 'Variant updated successfully');
  });

  delete = asyncHandler(async (req: Request, res: Response) => {
    await this.variantService.delete(Number(req.params.variantId));
    sendSuccess(res, null, 'Variant deleted successfully');
  });
}
