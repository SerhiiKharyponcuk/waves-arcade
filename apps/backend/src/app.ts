import cookieParser from "cookie-parser";
import express from "express";
import { apiRoutes } from "./routes/index.js";
import { apiRateLimit, corsMiddleware, helmetMiddleware } from "./middleware/security.js";
import { errorHandler, notFoundHandler } from "./middleware/errorHandler.js";

export function createApp() {
  const app = express();

  if (process.env.NODE_ENV === "production") app.set("trust proxy", 1);

  app.use(helmetMiddleware);
  app.use(corsMiddleware);
  app.use(apiRateLimit);
  app.use(express.json({ limit: "256kb" }));
  app.use(cookieParser());

  app.use("/api", apiRoutes);
  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
