import { Router } from "express";
import { buy, equip, mySkins, skins } from "../controllers/shopController.js";
import { requireAuth } from "../middleware/auth.js";
import { validateBody } from "../middleware/validate.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { skinMutationSchema } from "./schemas.js";

export const shopRoutes = Router();

shopRoutes.get("/skins", requireAuth, asyncHandler(skins));
shopRoutes.get("/my-skins", requireAuth, asyncHandler(mySkins));
shopRoutes.post("/buy-skin", requireAuth, validateBody(skinMutationSchema), asyncHandler(buy));
shopRoutes.post("/equip-skin", requireAuth, validateBody(skinMutationSchema), asyncHandler(equip));
