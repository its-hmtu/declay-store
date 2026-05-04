import { Router } from "express";
import { IAddressService } from "./address.interface";
import AddressService from "./address.service";
import AddressController from "./address.controller";
import { cache } from "@/middlewares/cache.middleware";
import { routeProtect } from "@/middlewares/auth.middleware";
import { validate } from "@/middlewares/validate";

export function createAddressRoutes(): Router {
  const router = Router();
  const addressService: IAddressService = new AddressService();
  const addressController = new AddressController(addressService);

  router.post('/', routeProtect, addressController.createAddress);
  router.put('/:id', routeProtect, addressController.updateAddress);
  router.delete('/:id', routeProtect, addressController.deleteAddress);
  router.get('/', routeProtect, addressController.getListAddresses);
  router.get('/:id', routeProtect, addressController.getAddressById);
  return router;
}