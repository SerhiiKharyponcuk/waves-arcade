import { Router } from "express";
import { buy, equip, equipThemeController, mySkins, skins, themes, unlockThemeController } from "../controllers/shopController.js";
import { optionalAuth, requireAuth } from "../middleware/auth.js";
import { validateBody } from "../middleware/validate.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { skinMutationSchema, themeMutationSchema } from "./schemas.js";

export const shopRoutes = Router();

shopRoutes.get("/skins", optionalAuth, asyncHandler(skins));
shopRoutes.get("/my-skins", requireAuth, asyncHandler(mySkins));
shopRoutes.post("/buy-skin", requireAuth, validateBody(skinMutationSchema), asyncHandler(buy));
shopRoutes.post("/equip-skin", requireAuth, validateBody(skinMutationSchema), asyncHandler(equip));
shopRoutes.get("/themes", optionalAuth, asyncHandler(themes));
shopRoutes.post("/unlock-theme", requireAuth, validateBody(themeMutationSchema), asyncHandler(unlockThemeController));
shopRoutes.post("/equip-theme", requireAuth, validateBody(themeMutationSchema), asyncHandler(equipThemeController));
