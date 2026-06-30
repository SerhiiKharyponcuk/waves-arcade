import { createHash } from "node:crypto";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import { env } from "../config/env.js";
import type { NextFunction, Request, Response } from "express";

export const helmetMiddleware = helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" }
});

const allowedOrigins = env.CORS_ORIGIN.split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

export const corsMiddleware = cors({
  origin: allowedOrigins.length > 1 ? allowedOrigins : allowedOrigins[0],
  credentials: true
});

function resolveRateLimitKey(request: Request) {
  return request.auth?.userId ? `user:${request.auth.userId}` : `ip:${request.ip}`;
}

function hashRateLimitValue(value: string) {
  return createHash("sha256").update(value).digest("hex");
}

function resolveEmailAwareKey(request: Request) {
  if (request.auth?.userId) {
    return `user:${request.auth.userId}`;
  }

  const email = typeof request.body?.email === "string" ? request.body.email.trim().toLowerCase() : "";
  if (email && email.length <= 320) {
    return `email:${hashRateLimitValue(email)}`;
  }

  return `ip:${request.ip}`;
}

export const apiRateLimit = rateLimit({
  windowMs: 60_000,
  max: env.NODE_ENV === "production" ? 120 : 500,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: resolveRateLimitKey
});

export const analyticsRateLimit = rateLimit({
  windowMs: 60_000,
  max: env.NODE_ENV === "production" ? 30 : 300,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: resolveRateLimitKey,
  message: { message: "Too many analytics events. Please slow down.", code: "ANALYTICS_RATE_LIMITED" }
});

export const adminRateLimit = rateLimit({
  windowMs: 60_000,
  max: env.NODE_ENV === "production" ? 60 : 300,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: resolveRateLimitKey,
  message: { message: "Too many admin requests. Please wait a moment.", code: "ADMIN_RATE_LIMITED" }
});

export const paymentRateLimit = rateLimit({
  windowMs: 5 * 60_000,
  max: env.NODE_ENV === "production" ? 10 : 100,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: resolveRateLimitKey,
  message: { message: "Too many payment attempts. Please wait before trying again.", code: "PAYMENT_RATE_LIMITED" }
});

export const paymentWebhookRateLimit = rateLimit({
  windowMs: 5 * 60_000,
  max: env.NODE_ENV === "production" ? 120 : 600,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (request) => `webhook:${request.ip}`,
  message: { message: "Too many payment callbacks. Please retry shortly.", code: "PAYMENT_WEBHOOK_RATE_LIMITED" }
});

export const economyMutationRateLimit = rateLimit({
  windowMs: 60_000,
  max: env.NODE_ENV === "production" ? 12 : 120,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: resolveRateLimitKey,
  message: { message: "Too many economy actions. Please wait before trying again.", code: "ECONOMY_RATE_LIMITED" }
});

export const authRateLimit = rateLimit({
  windowMs: 60_000,
  max: env.NODE_ENV === "production" ? 10 : 100,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: resolveEmailAwareKey,
  message: { message: "Too many auth attempts. Please try again soon.", code: "RATE_LIMITED" }
});

export const registrationRateLimit = rateLimit({
  windowMs: 60 * 60_000,
  max: env.NODE_ENV === "production" ? 3 : 100,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: resolveEmailAwareKey,
  message: { message: "Too many accounts created from this network. Please try again later.", code: "REGISTRATION_RATE_LIMITED" }
});

export const passwordRecoveryRateLimit = rateLimit({
  windowMs: 15 * 60_000,
  max: env.NODE_ENV === "production" ? 5 : 100,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: resolveEmailAwareKey,
  message: { message: "Too many password recovery attempts. Please try again later.", code: "PASSWORD_RATE_LIMITED" }
});

export const supportRateLimit = rateLimit({
  windowMs: 60_000,
  max: env.NODE_ENV === "production" ? 5 : 50,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: resolveRateLimitKey,
  message: { message: "Too many support requests. Please wait a minute.", code: "SUPPORT_RATE_LIMITED" }
});

export const gameCheckpointRateLimit = rateLimit({
  windowMs: 60_000,
  max: env.NODE_ENV === "production" ? 20 : 200,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: resolveRateLimitKey,
  message: { message: "Too many game checkpoints.", code: "GAME_RATE_LIMITED" }
});

export const gameSessionRateLimit = rateLimit({
  windowMs: 60_000,
  max: env.NODE_ENV === "production" ? 30 : 200,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: resolveRateLimitKey,
  message: { message: "Too many game session requests.", code: "GAME_SESSION_RATE_LIMITED" }
});

export function noStoreApiMiddleware(_request: Request, response: Response, next: NextFunction) {
  response.setHeader("Cache-Control", "no-store");
  next();
}

export function strictJsonContentType(request: Request, response: Response, next: NextFunction) {
  if (request.path === "/api/payments/liqpay/webhook") {
    next();
    return;
  }
  const hasBody = Number(request.header("content-length") ?? "0") > 0;
  const mutates = ["POST", "PUT", "PATCH", "DELETE"].includes(request.method);
  if (mutates && hasBody && !request.is("application/json")) {
    response.status(415).json({ message: "Unsupported content type. Use application/json.", code: "UNSUPPORTED_CONTENT_TYPE" });
    return;
  }
  next();
}

export function requestTimeoutMiddleware(_request: Request, response: Response, next: NextFunction) {
  response.setTimeout(env.NODE_ENV === "production" ? 15_000 : 30_000, () => {
    if (!response.headersSent) {
      response.status(408).json({ message: "Request timed out.", code: "REQUEST_TIMEOUT" });
    }
  });
  next();
}
