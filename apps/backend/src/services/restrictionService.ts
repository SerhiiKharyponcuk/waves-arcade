import { prisma } from "../config/prisma.js";
import { AppError } from "../utils/appError.js";

export async function assertNoActiveRestriction(userId: string, types: string[], feature: string) {
  const restriction = await prisma.restriction.findFirst({
    where: {
      userId,
      active: true,
      type: { in: types },
      OR: [{ endsAt: null }, { endsAt: { gt: new Date() } }]
    },
    orderBy: { createdAt: "desc" }
  });
  if (!restriction) return;

  throw new AppError(
    403,
    `${feature} is restricted${restriction.endsAt ? ` until ${restriction.endsAt.toISOString()}` : ""}: ${restriction.reason}. Contact Support to appeal.`,
    "FEATURE_RESTRICTED"
  );
}
