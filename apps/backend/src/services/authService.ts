import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import type { SignOptions } from "jsonwebtoken";
import type { Prisma } from "@prisma/client";
import type { AuthResponseDto, AuthUserDto, SupportedLocale } from "@waves/shared";
import { prisma } from "../config/prisma.js";
import { env } from "../config/env.js";
import { AppError } from "../utils/appError.js";

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
  };
}>;

function signAccessToken(user: AuthUser) {
  return jwt.sign(user, env.JWT_ACCESS_SECRET, {
    expiresIn: env.JWT_ACCESS_EXPIRES_IN as SignOptions["expiresIn"],
    issuer: "waves-arcade"
  });
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
    profile: {
      id: user.profile.id,
      displayName: user.profile.displayName,
      locale: user.profile.locale as SupportedLocale,
      avatarUrl: user.profile.avatarUrl,
      highScore: user.profile.highScore,
      selectedArrowSkinId: user.profile.selectedArrowSkinId,
      selectedTrailSkinId: user.profile.selectedTrailSkinId,
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
    include: { profile: true, wallet: true, ownedSkins: true, subscription: true }
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
}): Promise<AuthResponseDto> {
  const existing = await prisma.user.findUnique({ where: { email: input.email.toLowerCase() } });
  if (existing) {
    throw new AppError(409, "An account with this email already exists.", "EMAIL_EXISTS");
  }

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
      profile: {
        create: {
          displayName: input.displayName,
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
    include: { profile: true, wallet: true, ownedSkins: true, subscription: true }
  });

  const tokenUser: AuthUser = { userId: created.id, email: created.email, role: created.role as AuthUser["role"] };

  return {
    user: toAuthUserDto(created),
    accessToken: signAccessToken(tokenUser)
  };
}

export async function loginAccount(input: { email: string; password: string }): Promise<AuthResponseDto> {
  const user = await prisma.user.findUnique({
    where: { email: input.email.toLowerCase() },
    include: { profile: true, wallet: true, ownedSkins: true, subscription: true }
  });

  if (!user) {
    throw new AppError(401, "Invalid email or password.", "INVALID_CREDENTIALS");
  }

  const valid = await bcrypt.compare(input.password, user.passwordHash);
  if (!valid) {
    throw new AppError(401, "Invalid email or password.", "INVALID_CREDENTIALS");
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
