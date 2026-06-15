import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import { env } from "../config/env.js";

export const helmetMiddleware = helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" }
});

export const corsMiddleware = cors({
  origin: env.CORS_ORIGIN,
  credentials: true
});

export const apiRateLimit = rateLimit({
  windowMs: 60_000,
  max: env.NODE_ENV === "production" ? 120 : 500,
  standardHeaders: true,
  legacyHeaders: false
});

export const authRateLimit = rateLimit({
  windowMs: 60_000,
  max: env.NODE_ENV === "production" ? 10 : 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Too many auth attempts. Please try again soon.", code: "RATE_LIMITED" }
});
