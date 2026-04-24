import { Router } from "express";
import { authMiddleware } from "../middlewares/auth.middleware";
import AuthController from "../controllers/auth.controllers";

export function createAuthRouter(): Router {
  const router = Router();

  router.post("/register", AuthController.register);
  router.post("/login", AuthController.login);
  router.post("/refresh", AuthController.refresh);
  router.get("/me", authMiddleware, AuthController.currentUser);
  return router;
}
