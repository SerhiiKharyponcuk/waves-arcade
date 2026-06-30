import express, { Router } from "express";
import { liqPayCheckout, liqPayWebhook } from "../controllers/paymentController.js";
import { requirePaymentsEnabled } from "../middleware/features.js";
import { paymentRateLimit, paymentWebhookRateLimit } from "../middleware/security.js";
import { asyncHandler } from "../utils/asyncHandler.js";

export const paymentRoutes = Router();

paymentRoutes.use(requirePaymentsEnabled);
paymentRoutes.get("/liqpay/checkout/:orderId", paymentRateLimit, asyncHandler(liqPayCheckout));
paymentRoutes.post(
  "/liqpay/webhook",
  paymentWebhookRateLimit,
  express.urlencoded({ extended: false, limit: "32kb", parameterLimit: 2 }),
  asyncHandler(liqPayWebhook)
);
