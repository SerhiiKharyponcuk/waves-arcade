import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import { env } from "../config/env.js";

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
