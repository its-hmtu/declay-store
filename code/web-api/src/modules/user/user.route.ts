import UserController from "./user.controller";
import { Router } from "express";
import { validate } from "@/middlewares/validate";
import { routeProtect } from "@/middlewares/auth.middleware";
import { cache } from "@/middlewares/cache.middleware";
import { cacheKey, redisConfigKeys } from "@/config/redis";
import { IUserService } from "./user.interface";
import UserService from "./user.service";
import { updateUserSchema, changePasswordSchema } from "./user.validate";

export function createUserRouter(): Router {
  const router = Router();
  const userService: IUserService = new UserService();
  const userController = new UserController(userService);

  // Protected routes (require authentication)
  router.get('/info',
    routeProtect,
    cache({
      ttl: redisConfigKeys.CACHE_30_MINUTES,
      keyGenerator: (req) => {
        const user = req.user as any;
        const userId = user?.userId || user?.id;
        return cacheKey.USER_INFO + ':' + userId;
      }
    }),
    userController.getUserInfo
  );

  router.put('/info',
    routeProtect,
    validate(updateUserSchema),
    userController.updateUserInfo
  );

  router.post('/change-password',
    routeProtect,
    validate(changePasswordSchema),
    userController.changePassword
  );

  return router;
}
