import "dotenv/config";
import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().positive().default(4000),
  DATABASE_URL: z.string().url(),
  JWT_ACCESS_SECRET: z.string().min(32),
  JWT_REFRESH_SECRET: z.string().min(32),
  JWT_ACCESS_EXPIRES_IN: z.string().default("15m"),
  JWT_REFRESH_EXPIRES_IN: z.string().default("7d"),
  CORS_ORIGIN: z.string().default("http://localhost:5173"),
  ADMIN_EMAILS: z.string().default(""),
  AD_PROVIDER: z.enum(["mock", "crazygames", "admob", "unity", "google_ad_manager"]).default("mock"),
  AD_SESSION_TTL_SECONDS: z.coerce.number().int().positive().default(600)
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error("Invalid backend environment variables", parsed.error.flatten().fieldErrors);
  throw new Error("Invalid backend environment variables");
}

export const env = parsed.data;
