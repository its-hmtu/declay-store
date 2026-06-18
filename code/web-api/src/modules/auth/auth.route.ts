import AuthController from "./auth.controller";
import { Router } from "express";
import { validate } from "@/middlewares/validate";
import { routeProtect } from "@/middlewares/auth.middleware";
import { cache } from "@/middlewares/cache.middleware";
import { registerSchema, loginSchema, forgotPasswordSchema, resetPasswordSchema, verifyEmailSchema } from "./auth.validate";
import { IAuthService } from "./auth.interface";
import AuthService from "./auth.service";
import { cacheKey, redisConfigKeys } from "@/config/redis";
import passport from "passport";

export function createAuthRouter(): Router {
  const router = Router();
  const authService: IAuthService = new AuthService();
  const authController = new AuthController(authService);

  // Public routes
  router.post('/register', validate(registerSchema), authController.register);
  router.post('/login', validate(loginSchema), authController.login);
  router.post('/refresh', authController.refreshToken);

  // Google OAuth routes
  router.get('/google', passport.authenticate('google', { scope: ['profile', 'email'] }));
  
  router.get('/google/callback', 
    passport.authenticate('google', { failureRedirect: '/login', session: false }),
    authController.googleAuthCallback
  );

  // Protected routes (require authentication)
  router.post('/logout', routeProtect, authController.logout);
  
  // Cached route - cache user info for 30 minutes
  router.get('/user-info', 
    routeProtect,
    cache({
      ttl: redisConfigKeys.CACHE_30_MINUTES,
      keyGenerator: (req) => {
        const user = req.user as any;
        return `${cacheKey.USER_INFO}:${user.userId || user.id}`;
      }
    }),
    authController.getUserInfo
  );

  router.post('/forgot-password', validate(forgotPasswordSchema), authController.forgotPassword);
  router.post('/reset-password', validate(resetPasswordSchema), authController.resetPassword);
  router.post('/verify-email', validate(verifyEmailSchema), authController.verifyEmail);

  return router;
}