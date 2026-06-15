import type { NextFunction, Request, Response } from "express";
import { ZodError } from "zod";
import type { ApiErrorDto } from "@waves/shared";
import { AppError } from "../utils/appError.js";
import { env } from "../config/env.js";

export function notFoundHandler(request: Request, _response: Response, next: NextFunction) {
  next(new AppError(404, `Route not found: ${request.method} ${request.path}`, "ROUTE_NOT_FOUND"));
}

export function errorHandler(error: unknown, _request: Request, response: Response, _next: NextFunction) {
  if (error instanceof ZodError) {
    const body: ApiErrorDto = {
      message: "Invalid request data.",
      code: "VALIDATION_ERROR",
      fields: error.flatten().fieldErrors as Record<string, string[]>
    };
    response.status(400).json(body);
    return;
  }

  if (error instanceof AppError) {
    const body: ApiErrorDto = {
      message: error.message,
      code: error.code,
      fields: error.fields
    };
    response.status(error.statusCode).json(body);
    return;
  }

  const body: ApiErrorDto = {
    message: env.NODE_ENV === "production" ? "Unexpected server error." : String(error),
    code: "INTERNAL_SERVER_ERROR"
  };
  response.status(500).json(body);
}
