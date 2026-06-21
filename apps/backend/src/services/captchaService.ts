import { env } from "../config/env.js";
import { AppError } from "../utils/appError.js";

interface TurnstileResponse {
  success: boolean;
  hostname?: string;
  "error-codes"?: string[];
}

export async function verifyRegistrationCaptcha(token: string | undefined, remoteIp: string | undefined) {
  if (env.CAPTCHA_PROVIDER === "none") {
    return;
  }

  if (!token || !env.TURNSTILE_SECRET_KEY) {
    throw new AppError(400, "Complete the security check.", "CAPTCHA_REQUIRED");
  }

  const body = new URLSearchParams({ secret: env.TURNSTILE_SECRET_KEY, response: token });
  if (remoteIp) body.set("remoteip", remoteIp);

  let result: TurnstileResponse;
  try {
    const response = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body,
      signal: AbortSignal.timeout(5_000)
    });
    result = await response.json() as TurnstileResponse;
  } catch {
    throw new AppError(503, "Security check is temporarily unavailable.", "CAPTCHA_UNAVAILABLE");
  }

  if (!result.success) {
    throw new AppError(400, "Security check failed. Please try again.", "CAPTCHA_FAILED");
  }
}
