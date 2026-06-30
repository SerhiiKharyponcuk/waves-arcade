import type { NextFunction, Request, Response } from "express";
import { ZodError } from "zod";
import type { ApiErrorDto } from "@waves/shared";
import { AppError } from "../utils/appError.js";
import { captureServerError } from "../services/errorTrackingService.js";

type KnownPrismaError = {
  code?: string;
};

function isKnownPrismaError(error: unknown, code: string): error is KnownPrismaError {
  return Boolean(error && typeof error === "object" && "code" in error && (error as KnownPrismaError).code === code);
}

export function notFoundHandler(request: Request, _response: Response, next: NextFunction) {
  next(new AppError(404, `Route not found: ${request.method} ${request.path}`, "ROUTE_NOT_FOUND"));
}

export function errorHandler(error: unknown, request: Request, response: Response, _next: NextFunction) {
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

  if (isKnownPrismaError(error, "P2002")) {
    const body: ApiErrorDto = {
      message: "Request conflicts with an existing record.",
      code: "CONFLICT"
    };
    response.status(409).json(body);
    return;
  }

  if (isKnownPrismaError(error, "P1008") || isKnownPrismaError(error, "P2028") || isKnownPrismaError(error, "P2034")) {
    const body: ApiErrorDto = {
      message: "The request conflicts with another operation. Please try again.",
      code: "TRANSACTION_CONFLICT"
    };
    response.status(409).json(body);
    return;
  }

  if (isKnownPrismaError(error, "P2025")) {
    const body: ApiErrorDto = {
      message: "Requested record was not found.",
      code: "RECORD_NOT_FOUND"
    };
    response.status(404).json(body);
    return;
  }

  const body: ApiErrorDto = {
    message: "Unexpected server error.",
    code: "INTERNAL_SERVER_ERROR"
  };
  captureServerError(error, { method: request.method, path: request.path, requestId: request.header("x-request-id") });
  response.status(500).json(body);
}
