import { Router } from "express";
import {
  adReward,
  adRewardComplete,
  adRewardStart,
  dailyRewardStatus,
  purchasePlaceholder,
  reward,
  rouletteConfig,
  rouletteSpin,
  subscriptionBenefits,
  wallet
} from "../controllers/walletController.js";
import { requireAuth } from "../middleware/auth.js";
import { validateBody } from "../middleware/validate.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { adRewardCompleteSchema, adRewardSchema, purchasePlaceholderSchema, rouletteSpinSchema } from "./schemas.js";

export const walletRoutes = Router();

walletRoutes.get("/", requireAuth, asyncHandler(wallet));
walletRoutes.get("/daily-reward", requireAuth, asyncHandler(dailyRewardStatus));
walletRoutes.post("/reward", requireAuth, asyncHandler(reward));
walletRoutes.get("/roulette/config", requireAuth, asyncHandler(rouletteConfig));
walletRoutes.post("/roulette/spin", requireAuth, validateBody(rouletteSpinSchema), asyncHandler(rouletteSpin));
walletRoutes.get("/subscription/benefits", requireAuth, asyncHandler(subscriptionBenefits));
walletRoutes.post("/ad/reward", requireAuth, validateBody(adRewardSchema), asyncHandler(adReward));
walletRoutes.post("/ad/reward/start", requireAuth, validateBody(adRewardSchema), asyncHandler(adRewardStart));
walletRoutes.post("/ad/reward/complete", requireAuth, validateBody(adRewardCompleteSchema), asyncHandler(adRewardComplete));
walletRoutes.post(
  "/purchase-placeholder",
  requireAuth,
  validateBody(purchasePlaceholderSchema),
  asyncHandler(purchasePlaceholder)
);
