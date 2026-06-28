import { PrismaClient } from "@prisma/client";
import { env } from "./env.js";

const isTestRun = process.env.npm_lifecycle_event === "test" || process.argv.some((argument) => argument.includes("--test"));

export const prisma = new PrismaClient({
  log: isTestRun ? [] : env.NODE_ENV === "development" ? ["warn", "error"] : ["error"]
});
