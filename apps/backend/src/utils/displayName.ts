import { z } from "zod";
import { AppError } from "./appError.js";

export const INVALID_DISPLAY_NAME_MESSAGE =
  "Invalid nickname. Use 2-32 characters: letters, numbers, spaces, dots, underscores and dashes.";

const allowedDisplayNamePattern = /^[\p{Script=Latin}\p{Script=Cyrillic}0-9._ -]+$/u;
const containsLetterOrDigitPattern = /[\p{Script=Latin}\p{Script=Cyrillic}0-9]/u;
const controlCharacterPattern = /[\u0000-\u001F\u007F]/u;
const htmlTagPattern = /<[^>]*>/u;
const eventHandlerPattern = /\bon[a-z]+\s*=/iu;
const javascriptProtocolPattern = /javascript\s*:/iu;

function isValidDisplayName(value: string) {
  if (value.length < 2 || value.length > 32) {
    return false;
  }
  if (controlCharacterPattern.test(value)) {
    return false;
  }
  if (htmlTagPattern.test(value) || eventHandlerPattern.test(value) || javascriptProtocolPattern.test(value)) {
    return false;
  }
  if (!allowedDisplayNamePattern.test(value)) {
    return false;
  }
  if (!containsLetterOrDigitPattern.test(value)) {
    return false;
  }
  return true;
}

export const displayNameSchema = z
  .string()
  .transform((value) => value.trim())
  .refine(isValidDisplayName, INVALID_DISPLAY_NAME_MESSAGE);

export function parseDisplayName(
  value: string,
  field: "displayName" | "nickname" | "username" | "contactName" = "displayName"
) {
  const result = displayNameSchema.safeParse(value);
  if (!result.success) {
    throw new AppError(422, INVALID_DISPLAY_NAME_MESSAGE, "INVALID_NICKNAME", {
      [field]: [INVALID_DISPLAY_NAME_MESSAGE]
    });
  }

  return result.data;
}

export function parseOptionalDisplayName(
  value: string | undefined | null,
  field: "displayName" | "nickname" | "username" | "contactName" = "displayName"
) {
  if (typeof value !== "string") {
    return undefined;
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return undefined;
  }

  return parseDisplayName(trimmed, field);
}

export function getSafeStoredDisplayName(value: string | null | undefined, fallbackId: string, prefix = "User") {
  if (typeof value === "string") {
    const result = displayNameSchema.safeParse(value);
    if (result.success) {
      return result.data;
    }
  }

  return `${prefix}-${fallbackId.slice(0, 6)}`;
}
