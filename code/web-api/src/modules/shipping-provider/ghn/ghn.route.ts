import { Router, type Request, type Response } from 'express';
import asyncHandler from 'express-async-handler';
import GhnService from './ghn.service';
import CartService from '@/modules/cart/cart.service';
import { resolveCartOwner } from '@/modules/cart/cart.owner';
import { Op } from 'sequelize';
import ProductVariant from '@/modules/product-variant/product-variant.entity';
import { optionalAuth } from '@/middlewares/auth.middleware';
import { adminProtect, requireRole } from '@/middlewares/admin.middleware';

/**
 * M-13: dữ liệu địa giới + báo phí.
 * Công khai (không cần đăng nhập) vì khách vãng lai cũng phải chọn địa chỉ và
 * xem phí trước khi đặt hàng.
 */
export function createGhnRouter(): Router {
  const router = Router();
  const service = new GhnService();
  const cartService = new CartService();

  router.get('/provinces', asyncHandler(async (_req: Request, res: Response) => {
    res.json({ success: true, data: await service.listProvinces(), message: 'Provinces' });
  }));

  router.get('/districts', asyncHandler(async (req: Request, res: Response) => {
    const provinceId = Number(req.query.provinceId);
    if (!Number.isInteger(provinceId) || provinceId <= 0) {
      res.status(400).json({ success: false, message: 'provinceId không hợp lệ' });
      return;
    }
    res.json({ success: true, data: await service.listDistricts(provinceId), message: 'Districts' });
  }));

  router.get('/wards', asyncHandler(async (req: Request, res: Response) => {
    const districtId = Number(req.query.districtId);
    if (!Number.isInteger(districtId) || districtId <= 0) {
      res.status(400).json({ success: false, message: 'districtId không hợp lệ' });
      return;
    }
    res.json({ success: true, data: await service.listWards(districtId), message: 'Wards' });
  }));

  /**
   * Báo phí cho GIỎ HÀNG HIỆN TẠI. Cố ý không nhận danh sách sản phẩm từ client:
   * khách sửa payload là sửa được cân nặng, dẫn tới phí sai.
   */
  router.post('/quote', optionalAuth, asyncHandler(async (req: Request, res: Response) => {
    const districtId = Number(req.body?.districtId) || null;
    const wardCode = typeof req.body?.wardCode === 'string' ? req.body.wardCode : null;

    const owner = resolveCartOwner(
      (req as Request & { user?: { id: number } }).user?.id,
      req.header('X-Guest-Session') ?? undefined,
    );
    if (!owner) {
      res.status(400).json({ success: false, message: 'Không xác định được giỏ hàng' });
      return;
    }
    const cart = await cartService.getCart(owner);

    // Lấy thông số kiện hàng thẳng từ CSDL, không tin payload của client:
    // sửa được cân nặng là sửa được phí ship.
    const variantIds = (cart.items ?? []).map((item) => item.variantId);
    const variants = variantIds.length
      ? await ProductVariant.findAll({ where: { id: { [Op.in]: variantIds } } })
      : [];
    const byId = new Map(variants.map((v) => [v.id, v]));

    const items = (cart.items ?? []).map((item) => {
      const v = byId.get(item.variantId);
      return {
        quantity: item.quantity,
        weightGram: v?.weightGram ?? null,
        lengthCm: v?.lengthCm ?? null,
        widthCm: v?.widthCm ?? null,
        heightCm: v?.heightCm ?? null,
      };
    });

    const subtotalVnd = (cart.items ?? []).reduce((sum, item) => {
      const v = byId.get(item.variantId);
      const price = Number(v?.specialPrice ?? v?.price ?? 0);
      return sum + price * item.quantity;
    }, 0);

    const quote = await service.quote({ districtId, wardCode, items, subtotalVnd });
    res.json({ success: true, data: quote, message: 'Shipping quote' });
  }));

  return router;
}

/** Đồng bộ dữ liệu địa giới — chỉ admin, vì gọi ra ngoài rất tốn thời gian. */
export function createAdminGhnRouter(): Router {
  const router = Router();
  router.use(adminProtect, requireRole('admin', 'super_admin'));
  const service = new GhnService();

  router.post('/sync', asyncHandler(async (_req: Request, res: Response) => {
    const result = await service.syncMasterData();
    res.json({
      success: true,
      data: { ...result, provider: service.isMock ? 'mock' : 'ghn' },
      message: service.isMock
        ? 'Đã nạp DỮ LIỆU MẪU (chưa cấu hình GHN_TOKEN/GHN_SHOP_ID).'
        : 'Đã đồng bộ dữ liệu địa giới từ GHN.',
    });
  }));

  return router;
}
