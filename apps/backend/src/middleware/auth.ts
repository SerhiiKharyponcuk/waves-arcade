import type { NextFunction, Request, Response } from "express";
import { verifyAccessToken } from "../services/authService.js";
import { prisma } from "../config/prisma.js";
import { AppError } from "../utils/appError.js";

export async function requireAuth(request: Request, _response: Response, next: NextFunction) {
  try {
    const header = request.headers.authorization;

    if (!header?.startsWith("Bearer ")) {
      next(new AppError(401, "Authentication required.", "AUTH_REQUIRED"));
      return;
    }

    const token = header.slice("Bearer ".length);
    const auth = verifyAccessToken(token);
    const user = await prisma.user.findUnique({
      where: { id: auth.userId },
      select: { id: true, email: true, role: true, status: true, banReason: true }
    });

    if (!user) {
      next(new AppError(401, "Account not found.", "ACCOUNT_NOT_FOUND"));
      return;
    }
    if (user.status !== "ACTIVE") {
      next(new AppError(403, user.status === "BANNED" && user.banReason ? `Account banned: ${user.banReason}` : "Account is not active.", "ACCOUNT_INACTIVE"));
      return;
    }

    request.auth = { userId: user.id, email: user.email, role: user.role as "PLAYER" | "ADMIN" };
    next();
  } catch (error) {
    next(error);
  }
}

export async function optionalAuth(request: Request, _response: Response, next: NextFunction) {
  const header = request.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    next();
    return;
  }
  try {
    const auth = verifyAccessToken(header.slice("Bearer ".length));
    const user = await prisma.user.findUnique({ where: { id: auth.userId }, select: { id: true, email: true, role: true, status: true } });
    if (user?.status === "ACTIVE") {
      request.auth = { userId: user.id, email: user.email, role: user.role as "PLAYER" | "ADMIN" };
    }
  } catch {
    // Public catalog remains available when an optional stale token is present.
  }
  next();
}

export function requireAdmin(request: Request, _response: Response, next: NextFunction) {
  if (request.auth?.role !== "ADMIN") {
    next(new AppError(403, "Admin access required.", "ADMIN_REQUIRED"));
    return;
  }

  next();
}
