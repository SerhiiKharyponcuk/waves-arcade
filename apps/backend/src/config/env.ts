import "dotenv/config";
import { z } from "zod";

const optionalString = (schema: z.ZodString) => z.preprocess((value) => value === "" ? undefined : value, schema.optional());

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
  PASSWORD_RESET_BASE_URL: z.string().url().default("http://localhost:5173"),
  EMAIL_PROVIDER: z.enum(["none", "resend"]).default("none"),
  EMAIL_FROM: optionalString(z.string().email()),
  RESEND_API_KEY: z.string().optional(),
  EMAIL_VERIFICATION_REQUIRED: z.enum(["true", "false"]).default("false").transform((value) => value === "true"),
  CAPTCHA_PROVIDER: z.enum(["none", "turnstile"]).default("none"),
  TURNSTILE_SECRET_KEY: optionalString(z.string().min(10)),
  SENTRY_DSN: optionalString(z.string().url()),
  SENTRY_ENVIRONMENT: z.string().default("development"),
  AD_PROVIDER: z.enum(["mock", "crazygames", "admob", "unity", "google_ad_manager"]).default("mock"),
  AD_SESSION_TTL_SECONDS: z.coerce.number().int().positive().default(600)
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error("Invalid backend environment variables", parsed.error.flatten().fieldErrors);
  throw new Error("Invalid backend environment variables");
}

export const env = parsed.data;

if (env.NODE_ENV === "production" && env.CAPTCHA_PROVIDER === "turnstile" && !env.TURNSTILE_SECRET_KEY) {
  throw new Error("TURNSTILE_SECRET_KEY is required when CAPTCHA_PROVIDER=turnstile");
}
