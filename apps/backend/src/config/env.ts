import "dotenv/config";
import { z } from "zod";

const optionalString = (schema: z.ZodString) => z.preprocess((value) => value === "" ? undefined : value, schema.optional());
const isAutomatedTestRun = process.env.npm_lifecycle_event === "test" || process.argv.some((argument) => argument.includes("--test"));

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
  PAYMENTS_ENABLED: z.enum(["true", "false"]).optional(),
  PAYMENT_PROVIDER: z.enum(["placeholder", "liqpay"]).default("placeholder"),
  LIQPAY_MODE: z.enum(["sandbox", "production"]).default("sandbox"),
  LIQPAY_PUBLIC_KEY: optionalString(z.string().min(8)),
  LIQPAY_PRIVATE_KEY: optionalString(z.string().min(8)),
  LIQPAY_CURRENCY: z.enum(["UAH", "EUR", "USD"]).default("UAH"),
  LIQPAY_RESULT_URL: optionalString(z.string().url()),
  LIQPAY_SERVER_URL: optionalString(z.string().url()),
  AD_PROVIDER: z.enum(["mock", "crazygames", "admob", "unity", "google_ad_manager"]).default("mock"),
  AD_SESSION_TTL_SECONDS: z.coerce.number().int().positive().default(600)
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error("Invalid backend environment variables", parsed.error.flatten().fieldErrors);
  throw new Error("Invalid backend environment variables");
}

export const env = {
  ...parsed.data,
  PAYMENTS_ENABLED: parsed.data.PAYMENTS_ENABLED
    ? parsed.data.PAYMENTS_ENABLED === "true"
    : parsed.data.NODE_ENV === "test" || isAutomatedTestRun
};

if (env.NODE_ENV === "production" && env.CAPTCHA_PROVIDER === "turnstile" && !env.TURNSTILE_SECRET_KEY) {
  throw new Error("TURNSTILE_SECRET_KEY is required when CAPTCHA_PROVIDER=turnstile");
}

if (env.PAYMENT_PROVIDER === "liqpay") {
  if (!env.LIQPAY_PUBLIC_KEY || !env.LIQPAY_PRIVATE_KEY) {
    throw new Error("LIQPAY_PUBLIC_KEY and LIQPAY_PRIVATE_KEY are required when PAYMENT_PROVIDER=liqpay");
  }
  if (!env.LIQPAY_RESULT_URL || !env.LIQPAY_SERVER_URL) {
    throw new Error("LIQPAY_RESULT_URL and LIQPAY_SERVER_URL are required when PAYMENT_PROVIDER=liqpay");
  }
}
