import type { NextFunction, Request, Response } from "express";
import { env } from "../config/env.js";

export function requirePaymentsEnabled(_request: Request, response: Response, next: NextFunction) {
  if (!env.PAYMENTS_ENABLED) {
    response.status(503).json({
      message: "Payments are temporarily unavailable while the billing setup is being reviewed.",
      code: "PAYMENTS_DISABLED"
    });
    return;
  }

  next();
}
