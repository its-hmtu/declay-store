import expressAsyncHandler from "express-async-handler";
import { IAddressController, IAddressService } from "./address.interface";
import type { Request, Response } from "express";
import { sendSuccess } from "@/utils/response";
import { httpError } from "@/utils/http-error";

export default class AddressController implements IAddressController {
  constructor(private addressService: IAddressService) {}

  createAddress = expressAsyncHandler(async (req: Request, res: Response) => {
    const user = req.user as any;
    const userId = user?.userId || user?.id;
    const {
      receiverName,
      receiverPhone,
      addressLine,
      addressLine2,
      ward,
      district,
      city,
      country,
      postalCode,
      isDefault,
      addressType,
    } = req.body;
    const result = await this.addressService.createAddress(userId, {
      receiverName,
      receiverPhone,
      addressLine,
      addressLine2,
      ward,
      district,
      city,
      country,
      postalCode,
      isDefault,
      addressType,
    });
    if (!result) {
      throw httpError(500, "Failed to create address");
    } else {
      sendSuccess(res, result, "Address created successfully", 201);
    }
  });

  updateAddress = expressAsyncHandler(async (req: Request, res: Response) => {
    const user = req.user as any;
    const userId = user?.userId || user?.id;
    const addressId = parseInt(
      Array.isArray(req.params.id)
        ? req.params.id[0]
        : (req.params.id as string),
      10,
    );
    const {
      receiverName,
      receiverPhone,
      addressLine,
      addressLine2,
      ward,
      district,
      city,
      country,
      postalCode,
      isDefault,
      addressType,
    } = req.body;
    const result = await this.addressService.updateAddress(addressId, userId, {
      receiverName,
      receiverPhone,
      addressLine,
      addressLine2,
      ward,
      district,
      city,
      country,
      postalCode,
      isDefault,
      addressType,
    });
    if (!result) {
      throw httpError(404, "Address not found");
    } else {
      sendSuccess(res, result, "Address updated successfully", 200);
    }
  });

  deleteAddress = expressAsyncHandler(async (req: Request, res: Response) => {
    const user = req.user as any;
    const userId = user?.userId || user?.id;
    const addressId = parseInt(
      Array.isArray(req.params.id)
        ? req.params.id[0]
        : (req.params.id as string),
      10,
    );
    const result = await this.addressService.deleteAddress(addressId, userId);
    if (result === null) {
      throw httpError(404, "Address not found");
    } else if (result === false) {
      throw httpError(500, "Failed to delete address");
    } else {
      sendSuccess(res, null, "Address deleted successfully", 200);
    }
  });

  getListAddresses = expressAsyncHandler(
    async (req: Request, res: Response) => {
      const user = req.user as any;
      const userId = user?.userId || user?.id;
      const result = await this.addressService.listAddresses(userId);
      if (!result) {
        throw httpError(500, "Failed to retrieve addresses");
      } else {
        sendSuccess(res, result, "Addresses retrieved successfully", 200);
      }
    },
  );

  getAddressById = expressAsyncHandler(async (req: Request, res: Response) => {
    const user = req.user as any;
    const userId = user?.userId || user?.id;
    const addressId = parseInt(
      Array.isArray(req.params.id)
        ? req.params.id[0]
        : (req.params.id as string),
      10,
    );
    const result = await this.addressService.findAddressById(addressId, userId);
    if (!result) {
      throw httpError(404, "Address not found");
    } else {
      sendSuccess(res, result, "Address retrieved successfully", 200);
    }
  });
}
