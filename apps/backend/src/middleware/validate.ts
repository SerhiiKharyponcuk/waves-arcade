import type { NextFunction, Request, Response } from "express";
import type { ZodSchema } from "zod";

export function validateBody<T>(schema: ZodSchema<T>) {
  return (request: Request, _response: Response, next: NextFunction) => {
    try {
      request.body = schema.parse(request.body);
      next();
    } catch (error) {
      next(error);
    }
  };
}
