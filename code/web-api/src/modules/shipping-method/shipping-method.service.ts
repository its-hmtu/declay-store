import ShippingMethod from './shipping-method.entity';
import { httpError } from '@/utils/http-error';
import type {
  IShippingMethod, IShippingMethodService, ICreateShippingMethodData, IUpdateShippingMethodData,
} from './shipping-method.interface';

export default class ShippingMethodService implements IShippingMethodService {
  async listActive(): Promise<IShippingMethod[]> {
    const rows = await ShippingMethod.findAll({ where: { isActive: true }, order: [['sortOrder', 'ASC'], ['id', 'ASC']] });
    return rows.map((r) => r.toJSON() as IShippingMethod);
  }

  async listAll(): Promise<IShippingMethod[]> {
    const rows = await ShippingMethod.findAll({ order: [['sortOrder', 'ASC'], ['id', 'ASC']] });
    return rows.map((r) => r.toJSON() as IShippingMethod);
  }

  async findById(id: number): Promise<IShippingMethod> {
    const m = await ShippingMethod.findByPk(id);
    if (!m) throw httpError(404, 'Shipping method not found');
    return m.toJSON() as IShippingMethod;
  }

  async create(data: ICreateShippingMethodData): Promise<IShippingMethod> {
    const m = await ShippingMethod.create({ ...data });
    return m.toJSON() as IShippingMethod;
  }

  async update(id: number, data: IUpdateShippingMethodData): Promise<IShippingMethod> {
    const m = await ShippingMethod.findByPk(id);
    if (!m) throw httpError(404, 'Shipping method not found');
    await m.update(data);
    return m.toJSON() as IShippingMethod;
  }

  async remove(id: number): Promise<void> {
    const m = await ShippingMethod.findByPk(id);
    if (!m) throw httpError(404, 'Shipping method not found');
    await m.destroy();
  }
}
