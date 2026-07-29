import type { RequestHandler } from "express";

export interface IAddress {
  id: number;
  /** Null for guest checkout addresses (M-01). */
  userId: number | null;
  receiverName: string;
  receiverPhone: string;
  addressLine: string;
  addressLine2?: string | null;
  ward: string;
  district: string;
  city: string;
  // M-13: mã địa giới GHN — cần để tính phí và tạo vận đơn.
  ghnProvinceId?: number | null;
  ghnDistrictId?: number | null;
  ghnWardCode?: string | null;
  country?: string;
  postalCode?: string | null;
  isDefault?: boolean;
  addressType?: 'home' | 'work' | 'other';
  createdAt: Date;
  updatedAt: Date;
}

export interface IAddressService {
  createAddress(userId: number, addressData: Omit<IAddress, 'id' | 'userId' | 'createdAt' | 'updatedAt'>): Promise<IAddress>;
  updateAddress(addressId: number, userId: number, addressData: Partial<Omit<IAddress, 'id' | 'userId' | 'createdAt' | 'updatedAt'>>): Promise<IAddress | null>;
  deleteAddress(addressId: number, userId: number): Promise<null | boolean>;
  listAddresses(userId: number): Promise<IAddress[]>;
  findAddressById(addressId: number, userId: number): Promise<IAddress | null>;
}

export interface IAddressController {
  createAddress: RequestHandler;
  updateAddress: RequestHandler;
  deleteAddress: RequestHandler;
  getListAddresses: RequestHandler;
  getAddressById: RequestHandler;
}