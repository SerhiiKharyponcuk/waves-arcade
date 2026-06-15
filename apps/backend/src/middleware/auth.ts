import type { NextFunction, Request, Response } from "express";
import { verifyAccessToken } from "../services/authService.js";
import { AppError } from "../utils/appError.js";

export function requireAuth(request: Request, _response: Response, next: NextFunction) {
  try {
    const header = request.headers.authorization;

    if (!header?.startsWith("Bearer ")) {
      next(new AppError(401, "Authentication required.", "AUTH_REQUIRED"));
      return;
    }

    const token = header.slice("Bearer ".length);
    request.auth = verifyAccessToken(token);
    next();
  } catch (error) {
    next(error);
  }
}
