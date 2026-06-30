import { createHash, randomBytes, randomInt } from "node:crypto";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import type { SignOptions } from "jsonwebtoken";
import type { Prisma } from "@prisma/client";
import type { AuthResponseDto, AuthUserDto, EmailVerificationRequiredDto, SupportedLocale } from "@waves/shared";
import { prisma } from "../config/prisma.js";
import { env } from "../config/env.js";
import { sendEmailVerificationCode, sendPasswordResetEmail } from "./emailService.js";
import { AppError } from "../utils/appError.js";
import { getSafeStoredDisplayName, parseDisplayName } from "../utils/displayName.js";

export interface AuthUser {
  userId: string;
  email: string;
  role: "PLAYER" | "ADMIN";
}

type UserWithAccount = Prisma.UserGetPayload<{
  include: {
    profile: true;
    wallet: true;
    ownedSkins: true;
    subscription: true;
    ownedThemes: true;
    restrictions: {
      where: { active: true };
      orderBy: { createdAt: "desc" };
    };
    receivedActions: {
      take: 5;
      orderBy: { createdAt: "desc" };
      include: { admin: { select: { email: true } } };
    };
  };
}>;

const accountInclude = {
  profile: true,
  wallet: true,
  ownedSkins: true,
  subscription: true,
  ownedThemes: true,
  restrictions: {
    where: { active: true },
    orderBy: { createdAt: "desc" }
  },
  receivedActions: {
    take: 5,
    orderBy: { createdAt: "desc" },
    include: { admin: { select: { email: true } } }
  }
} satisfies Prisma.UserInclude;

function parseRecord(value: string): Record<string, unknown> {
  try {
    const parsed = JSON.parse(value) as unknown;
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed as Record<string, unknown> : {};
  } catch {
    return {};
  }
}

function signAccessToken(user: AuthUser) {
  return jwt.sign(user, env.JWT_ACCESS_SECRET, {
    expiresIn: env.JWT_ACCESS_EXPIRES_IN as SignOptions["expiresIn"],
    issuer: "waves-arcade"
  });
}

function hashResetToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

function hashEmailCode(email: string, code: string) {
  return createHash("sha256").update(`${email.toLowerCase()}:${code}:waves-email-v1`).digest("hex");
}

function generateEmailCode() {
  return String(randomInt(100_000, 1_000_000));
}

function adminEmailSet() {
  return new Set(
    env.ADMIN_EMAILS.split(",")
      .map((email) => email.trim().toLowerCase())
      .filter(Boolean)
  );
}

function roleForEmail(email: string, currentRole: string = "PLAYER"): "PLAYER" | "ADMIN" {
  return adminEmailSet().has(email.toLowerCase()) ? "ADMIN" : (currentRole as "PLAYER" | "ADMIN");
}

export function verifyAccessToken(token: string): AuthUser {
  try {
    return jwt.verify(token, env.JWT_ACCESS_SECRET, { issuer: "waves-arcade" }) as AuthUser;
  } catch {
    throw new AppError(401, "Invalid or expired authentication token.", "INVALID_TOKEN");
  }
}

function toAuthUserDto(user: UserWithAccount): AuthUserDto {
  if (!user.profile || !user.wallet) {
    throw new AppError(500, "Account is missing required profile data.", "ACCOUNT_INCOMPLETE");
  }

  const subscription = user.subscription
    ? {
        status: user.subscription.status as AuthUserDto["subscription"]["status"],
        plan: user.subscription.plan as AuthUserDto["subscription"]["plan"],
        provider: user.subscription.provider ?? null,
        startDate: user.subscription.startDate?.toISOString() ?? null,
        endDate: user.subscription.endDate?.toISOString() ?? null,
        cancelAtPeriodEnd: user.subscription.cancelAtPeriodEnd ?? false
      }
    : {
        status: "free" as AuthUserDto["subscription"]["status"],
        plan: "standard" as AuthUserDto["subscription"]["plan"],
        provider: null,
        startDate: null,
        endDate: null,
        cancelAtPeriodEnd: false
      };

  return {
    id: user.id,
    email: user.email,
    role: user.role as AuthUserDto["role"],
    status: user.status as AuthUserDto["status"],
    banReason: user.banReason,
    bannedAt: user.bannedAt?.toISOString() ?? null,
    termsAcceptedAt: user.termsAcceptedAt?.toISOString() ?? null,
    emailVerifiedAt: user.emailVerifiedAt?.toISOString() ?? null,
    mustChangePassword: user.mustChangePassword,
    temporaryPasswordUsed: user.temporaryPasswordUsed,
    lastPasswordChangeAt: user.lastPasswordChangeAt.toISOString(),
    trustStatus: user.trustStatus as AuthUserDto["trustStatus"],
    profile: {
      id: user.profile.id,
      displayName: getSafeStoredDisplayName(user.profile.displayName, user.id),
      locale: user.profile.locale as SupportedLocale,
      avatarUrl: user.profile.avatarUrl,
      highScore: user.profile.highScore,
      selectedArrowSkinId: user.profile.selectedArrowSkinId,
      selectedTrailSkinId: user.profile.selectedTrailSkinId,
      selectedThemeId: user.profile.selectedThemeId,
      customization: parseRecord(user.profile.customizationJson) as Record<string, string>,
      gameSettings: parseRecord(user.profile.gameSettingsJson),
      showUsernameInLeaderboard: user.profile.showUsernameInLeaderboard,
      hideProfile: user.profile.hideProfile,
      createdAt: user.profile.createdAt.toISOString()
    },
    wallet: {
      coins: user.wallet.coins,
      gems: user.wallet.gems,
      rouletteTickets: user.wallet.rouletteTickets,
      extraLives: user.wallet.extraLives,
      lifetimeCoins: user.wallet.lifetimeCoins
    },
    subscription,
    moderationNotices: user.receivedActions.map((action) => ({
      id: action.id,
      action: action.action as AuthUserDto["moderationNotices"][number]["action"],
      reason: action.reason,
      message: action.message,
      createdAt: action.createdAt.toISOString(),
      adminEmail: action.admin?.email ?? null
    })),
    activeRestrictions: user.restrictions.map((restriction) => ({
      id: restriction.id,
      userId: restriction.userId,
      type: restriction.type as AuthUserDto["activeRestrictions"][number]["type"],
      reason: restriction.reason,
      notes: restriction.notes,
      startsAt: restriction.startsAt.toISOString(),
      endsAt: restriction.endsAt?.toISOString() ?? null,
      active: restriction.active,
      appealPossible: true
    })),
    ownedThemes: user.ownedThemes.map((theme) => theme.themeId),
    ownedSkins: user.ownedSkins.map((owned) => ({
      skinId: owned.skinId,
      ownedAt: owned.ownedAt.toISOString(),
      equipped:
        owned.skinId === user.profile?.selectedArrowSkinId ||
        owned.skinId === user.profile?.selectedTrailSkinId
    }))
  };
}

async function getAccountById(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: accountInclude
  });

  if (!user) {
    throw new AppError(404, "User not found.", "USER_NOT_FOUND");
  }

  return user;
}

export async function registerAccount(input: {
  email: string;
  password: string;
  displayName: string;
  locale: SupportedLocale;
  termsAccepted: boolean;
}): Promise<AuthResponseDto | EmailVerificationRequiredDto> {
  if (!input.termsAccepted) {
    throw new AppError(400, "Terms of use must be accepted.", "TERMS_REQUIRED");
  }

  const existing = await prisma.user.findUnique({ where: { email: input.email.toLowerCase() } });
  if (existing) {
    throw new AppError(409, "An account with this email already exists.", "EMAIL_EXISTS");
  }

  const displayName = parseDisplayName(input.displayName, "displayName");

  const starterArrow = await prisma.skin.findUnique({ where: { slug: "cyber-green" } });
  const starterTrail = await prisma.skin.findUnique({ where: { slug: "neon-blue-trail" } });

  if (!starterArrow || !starterTrail) {
    throw new AppError(500, "Skin catalog is not ready.", "SKIN_CATALOG_MISSING");
  }

  const passwordHash = await bcrypt.hash(input.password, 12);

  const created = await prisma.user.create({
    data: {
      email: input.email.toLowerCase(),
      passwordHash,
      role: roleForEmail(input.email),
      termsAcceptedAt: new Date(),
      emailVerifiedAt: env.EMAIL_VERIFICATION_REQUIRED ? undefined : new Date(),
      profile: {
        create: {
          displayName,
          locale: input.locale,
          selectedArrowSkinId: starterArrow.id,
          selectedTrailSkinId: starterTrail.id
        }
      },
      wallet: {
        create: {
          coins: 250,
          gems: 0,
          lifetimeCoins: 250
        }
      },
      ownedSkins: {
        create: [{ skinId: starterArrow.id }, { skinId: starterTrail.id }]
      }
    },
    include: accountInclude
  });

  if (!env.EMAIL_VERIFICATION_REQUIRED) {
    const tokenUser: AuthUser = { userId: created.id, email: created.email, role: created.role as AuthUser["role"] };
    return { user: toAuthUserDto(created), accessToken: signAccessToken(tokenUser) };
  }

  return issueEmailVerificationCode(created.id, created.email);
}

export async function loginAccount(input: { email: string; password: string }): Promise<AuthResponseDto> {
  let user = await prisma.user.findUnique({
    where: { email: input.email.toLowerCase() },
    include: accountInclude
  });

  if (!user) {
    throw new AppError(401, "Invalid email or password.", "INVALID_CREDENTIALS");
  }

  const valid = await bcrypt.compare(input.password, user.passwordHash);
  if (!valid) {
    throw new AppError(401, "Invalid email or password.", "INVALID_CREDENTIALS");
  }

  if (user.status !== "ACTIVE") {
    throw new AppError(403, user.banReason ? `Account banned: ${user.banReason}` : "Account banned.", "ACCOUNT_BANNED");
  }
  if (env.EMAIL_VERIFICATION_REQUIRED && !user.emailVerifiedAt) {
    throw new AppError(403, "Email address is not verified. Please enter the verification code from your email.", "EMAIL_NOT_VERIFIED");
  }

  const resolvedRole = roleForEmail(user.email, user.role);
  const shouldMarkEmailVerified = !env.EMAIL_VERIFICATION_REQUIRED && !user.emailVerifiedAt;
  if (resolvedRole !== user.role || shouldMarkEmailVerified) {
    user = await prisma.user.update({
      where: { id: user.id },
      data: {
        role: resolvedRole,
        emailVerifiedAt: shouldMarkEmailVerified ? new Date() : undefined
      },
      include: accountInclude
    });
  }

  if (user.mustChangePassword && !user.temporaryPasswordUsed) {
    user = await prisma.user.update({
      where: { id: user.id },
      data: { temporaryPasswordUsed: true },
      include: accountInclude
    });
  }

  const tokenUser: AuthUser = { userId: user.id, email: user.email, role: user.role as AuthUser["role"] };

  return {
    user: toAuthUserDto(user),
    accessToken: signAccessToken(tokenUser)
  };
}

export async function getCurrentAccount(userId: string): Promise<AuthUserDto> {
  return toAuthUserDto(await getAccountById(userId));
}

export async function issueEmailVerificationCode(userId: string, email: string): Promise<EmailVerificationRequiredDto> {
  const code = generateEmailCode();
  const issuedAt = new Date();

  await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    await tx.emailVerificationCode.updateMany({
      where: {
        userId,
        usedAt: null
      },
      data: { usedAt: issuedAt }
    });

    await tx.emailVerificationCode.create({
      data: {
        userId,
        codeHash: hashEmailCode(email, code),
        expiresAt: new Date(issuedAt.getTime() + 15 * 60_000)
      }
    });
  });

  const emailResult = await sendEmailVerificationCode(email, code);
  return {
    success: true,
    emailVerificationRequired: true,
    email,
    emailSent: emailResult.sent,
    devCode: env.NODE_ENV === "development" && !emailResult.sent ? code : undefined
  };
}

export async function resendEmailVerification(input: { email: string }): Promise<EmailVerificationRequiredDto> {
  const user = await prisma.user.findUnique({ where: { email: input.email.toLowerCase() } });
  if (!user) {
    return { success: true, emailVerificationRequired: true, email: input.email.toLowerCase(), emailSent: true };
  }
  if (user.emailVerifiedAt) {
    return { success: true, emailVerificationRequired: true, email: user.email, emailSent: true };
  }

  return issueEmailVerificationCode(user.id, user.email);
}

export async function verifyEmailCode(input: { email: string; code: string }): Promise<AuthResponseDto> {
  const email = input.email.toLowerCase();
  const user = await prisma.user.findUnique({
    where: { email },
    include: accountInclude
  });
  if (!user) {
    throw new AppError(400, "Verification code is invalid or expired.", "EMAIL_CODE_INVALID");
  }
  if (user.status !== "ACTIVE") {
    throw new AppError(403, user.banReason ? `Account banned: ${user.banReason}` : "Account banned.", "ACCOUNT_BANNED");
  }
  if (user.emailVerifiedAt) {
    const tokenUser: AuthUser = { userId: user.id, email: user.email, role: user.role as AuthUser["role"] };
    return { user: toAuthUserDto(user), accessToken: signAccessToken(tokenUser) };
  }

  const codeHash = hashEmailCode(email, input.code);
  const verification = await prisma.emailVerificationCode.findFirst({
    where: {
      userId: user.id,
      usedAt: null,
      expiresAt: { gt: new Date() }
    },
    orderBy: { createdAt: "desc" }
  });

  if (!verification || verification.attempts >= 5) {
    throw new AppError(400, "Verification code is invalid or expired.", "EMAIL_CODE_INVALID");
  }

  if (verification.codeHash !== codeHash) {
    const now = new Date();
    await prisma.emailVerificationCode.update({
      where: { id: verification.id },
      data: {
        attempts: { increment: 1 },
        usedAt: verification.attempts + 1 >= 5 ? now : undefined
      }
    });
    throw new AppError(400, "Verification code is invalid or expired.", "EMAIL_CODE_INVALID");
  }

  const verified = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    await tx.emailVerificationCode.update({
      where: { id: verification.id },
      data: { usedAt: new Date(), attempts: { increment: 1 } }
    });
    return tx.user.update({
      where: { id: user.id },
      data: { emailVerifiedAt: new Date() },
      include: accountInclude
    });
  });

  const tokenUser: AuthUser = { userId: verified.id, email: verified.email, role: verified.role as AuthUser["role"] };
  return { user: toAuthUserDto(verified), accessToken: signAccessToken(tokenUser) };
}

export async function requestPasswordReset(input: { email: string }) {
  const user = await prisma.user.findUnique({ where: { email: input.email.toLowerCase() } });
  if (!user || user.status !== "ACTIVE") {
    return { success: true };
  }

  const token = randomBytes(32).toString("hex");
  const resetUrl = `${env.PASSWORD_RESET_BASE_URL.replace(/\/$/, "")}/?resetToken=${encodeURIComponent(token)}`;

  await prisma.passwordResetToken.create({
    data: {
      userId: user.id,
      tokenHash: hashResetToken(token),
      expiresAt: new Date(Date.now() + 30 * 60_000)
    }
  });

  const emailResult = await sendPasswordResetEmail(user.email, resetUrl);
  return {
    success: true,
    emailSent: emailResult.sent,
    resetUrl: env.NODE_ENV === "development" && !emailResult.sent ? resetUrl : undefined
  };
}

export async function resetPassword(input: { token: string; password: string }) {
  const tokenHash = hashResetToken(input.token);
  const resetToken = await prisma.passwordResetToken.findUnique({ where: { tokenHash } });
  if (!resetToken || resetToken.usedAt || resetToken.expiresAt.getTime() < Date.now()) {
    throw new AppError(400, "Password reset link is invalid or expired.", "PASSWORD_RESET_INVALID");
  }

  const passwordHash = await bcrypt.hash(input.password, 12);
  await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    await tx.user.update({
      where: { id: resetToken.userId },
      data: {
        passwordHash,
        mustChangePassword: false,
        temporaryPasswordUsed: true,
        lastPasswordChangeAt: new Date()
      }
    });
    await tx.passwordResetToken.update({
      where: { id: resetToken.id },
      data: { usedAt: new Date() }
    });
  });

  return { success: true };
}
