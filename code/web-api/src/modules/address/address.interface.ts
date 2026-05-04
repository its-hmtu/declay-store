import type { RequestHandler } from "express";

export interface IAddress {
  id: number;
  userId: number;
  receiverName: string;
  receiverPhone: string;
  addressLine: string;
  addressLine2?: string | null;
  ward: string;
  district: string;
  city: string;
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