import AuthController from "./auth.controller";
import { Router, type Request, type Response } from "express";
import { validate } from "@/middlewares/validate";
import { routeProtect } from "@/middlewares/auth.middleware";
import { cache } from "@/middlewares/cache.middleware";
import { registerSchema, loginSchema } from "@/user/user.validate";
import { IAuthService } from "./auth.interface";
import AuthService from "./auth.service";

export function createAuthRouter(): Router {
  const router = Router();
  const authService: IAuthService = new AuthService();
  const authController = new AuthController(authService);

  // Public routes
  router.post('/register', validate(registerSchema), authController.register);
  router.post('/login', validate(loginSchema), authController.login);
  router.post('/refresh-token', authController.refreshToken);

  // Protected routes (require authentication)
  router.post('/logout', routeProtect, authController.logout);
  
  // Cached route - cache user info for 30 minutes
  router.get('/user-info', 
    routeProtect,
    cache({
      ttl: 1800, // 30 minutes
      keyGenerator: (req) => `user:${req.user?.userId}:info`
    }),
    authController.getUserInfo
  );

  return router;
}