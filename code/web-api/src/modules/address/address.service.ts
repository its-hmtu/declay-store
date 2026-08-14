import { Op, Transaction } from "sequelize";
import { sequelize } from "@/config/sequelize";
import Address from "./address.entity";
import { IAddress, IAddressService } from "./address.interface";

class AddressService implements IAddressService {
  // A partial unique index allows only one default address per user, so clear any
  // existing default before promoting another — otherwise the insert/update collides.
  private async clearDefault(userId: number, exceptId: number | null, t: Transaction): Promise<void> {
    const where: Record<string, unknown> = { userId, isDefault: true };
    if (exceptId !== null) where.id = { [Op.ne]: exceptId };
    await Address.update({ isDefault: false }, { where, transaction: t });
  }

  async createAddress(userId: number, addressData: Omit<IAddress, 'id' | 'userId' | 'createdAt' | 'updatedAt'>): Promise<IAddress> {
    return sequelize.transaction(async (t) => {
      if (addressData.isDefault) {
        await this.clearDefault(userId, null, t);
      }
      return Address.create({ ...addressData, userId }, { transaction: t });
    });
  }

  async updateAddress(addressId: number, userId: number, addressData: Partial<Omit<IAddress, 'id' | 'userId' | 'createdAt' | 'updatedAt'>>): Promise<IAddress | null> {
    return sequelize.transaction(async (t) => {
      const address = await Address.findOne({ where: { id: addressId, userId }, transaction: t });
      if (!address) {
        return null;
      }
      if (addressData.isDefault) {
        await this.clearDefault(userId, addressId, t);
      }
      await address.update(addressData, { transaction: t });
      return address;
    });
  }

  async deleteAddress(addressId: number, userId: number): Promise<null | boolean> {
    // Implementation for deleting an address
    const address = await Address.findOne({ where: { id: addressId, userId } });
    if (!address) {
      return null;
    }
    await address.destroy();
    return true;
  }

  async listAddresses(userId: number): Promise<IAddress[]> {
    // Implementation for listing all addresses of a user
    const addresses = await Address.findAll({ where: { userId } });
    return addresses;
  }

  async findAddressById(addressId: number, userId: number): Promise<IAddress | null> {
    // Implementation for finding an address by ID
    const address = await Address.findOne({ where: { id: addressId, userId } });
    return address;
  }
}

export default AddressService;