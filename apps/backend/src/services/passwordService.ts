import { randomInt } from "node:crypto";
import bcrypt from "bcryptjs";
import { prisma } from "../config/prisma.js";
import { AppError } from "../utils/appError.js";

const commonPasswords = new Set(["password", "password1", "12345678", "qwerty123", "letmein123", "admin123", "welcome1"]);

export function assertStrongPassword(password: string) {
  if (password.length < 10) {
    throw new AppError(400, "New password must be at least 10 characters.", "PASSWORD_TOO_SHORT");
  }
  if (!/[a-z]/.test(password) || !/[A-Z]/.test(password) || !/\d/.test(password)) {
    throw new AppError(400, "Use uppercase, lowercase, and a number in the new password.", "PASSWORD_TOO_SIMPLE");
  }
  if (commonPasswords.has(password.toLowerCase()) || /(.)\1{4,}/.test(password)) {
    throw new AppError(400, "This password is too easy to guess.", "PASSWORD_TOO_SIMPLE");
  }
}

export function generateTemporaryPassword() {
  const words = ["Pulse", "Nova", "Orbit", "Vector", "Comet", "Pixel", "Wave", "Neon"];
  const symbols = ["!", "#", "$", "%"];
  return `${words[randomInt(words.length)]}${symbols[randomInt(symbols.length)]}${randomInt(100_000, 1_000_000)}Z`;
}

export async function changeUserPassword(userId: string, input: { currentPassword?: string; newPassword: string }) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) {
    throw new AppError(404, "User not found.", "USER_NOT_FOUND");
  }

  assertStrongPassword(input.newPassword);
  if (await bcrypt.compare(input.newPassword, user.passwordHash)) {
    throw new AppError(400, "New password must be different from the current password.", "PASSWORD_UNCHANGED");
  }

  if (!user.mustChangePassword) {
    if (!input.currentPassword || !(await bcrypt.compare(input.currentPassword, user.passwordHash))) {
      throw new AppError(400, "Current password is incorrect.", "CURRENT_PASSWORD_INVALID");
    }
  }

  const passwordHash = await bcrypt.hash(input.newPassword, 12);
  const changedAt = new Date();
  await prisma.user.update({
    where: { id: userId },
    data: {
      passwordHash,
      mustChangePassword: false,
      temporaryPasswordUsed: true,
      lastPasswordChangeAt: changedAt
    }
  });

  return { success: true, lastPasswordChangeAt: changedAt.toISOString() };
}
