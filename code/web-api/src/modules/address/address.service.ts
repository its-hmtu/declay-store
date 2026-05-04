import Address from "./address.entity";
import { IAddress, IAddressService } from "./address.interface";

class AddressService implements IAddressService {
  async createAddress(userId: number, addressData: Omit<IAddress, 'id' | 'userId' | 'createdAt' | 'updatedAt'>): Promise<IAddress> {
    // Implementation for creating a new address
    const { receiverName, receiverPhone, addressLine, addressLine2, ward, district, city, country, postalCode, isDefault, addressType } = addressData;
    const newAddress = await Address.create({ ...addressData, userId });
    return newAddress;
  }

  async updateAddress(addressId: number, userId: number, addressData: Partial<Omit<IAddress, 'id' | 'userId' | 'createdAt' | 'updatedAt'>>): Promise<IAddress | null> {
    // Implementation for updating an existing address
    const address = await Address.findOne({ where: { id: addressId, userId } });
    if (!address) {
      return null;
    }
    await address.update(addressData);
    return address;
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