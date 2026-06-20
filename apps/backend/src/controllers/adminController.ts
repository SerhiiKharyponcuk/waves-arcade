import type { Request, Response } from "express";
import {
  banUser,
  createUserRestriction,
  listAdminAuditLogs,
  listGuestTransferAttempts,
  listScoresForReview,
  listAdminUsers,
  manuallyVerifyUserEmail,
  moderateScore,
  removeUserRestriction,
  resetUserPassword,
  resetUserScores,
  resendUserEmailVerification,
  setUserTrust,
  thankUser,
  unbanUser
} from "../services/adminService.js";
import { AppError } from "../utils/appError.js";

export async function adminUsers(request: Request, response: Response) {
  response.json(await listAdminUsers(String(request.query.q ?? "")));
}

function getTargetUserId(request: Request) {
  const userId = request.params.userId;
  if (!userId) {
    throw new AppError(400, "Target user is required.", "TARGET_USER_REQUIRED");
  }

  return userId;
}

export async function adminBanUser(request: Request, response: Response) {
  response.json(await banUser(request.auth!.userId, getTargetUserId(request), request.body.reason));
}

export async function adminUnbanUser(request: Request, response: Response) {
  response.json(await unbanUser(request.auth!.userId, getTargetUserId(request), request.body.reason ?? ""));
}

export async function adminThankUser(request: Request, response: Response) {
  response.status(201).json(await thankUser(request.auth!.userId, getTargetUserId(request), request.body.message));
}

export async function adminResendEmailVerification(request: Request, response: Response) {
  response.json(await resendUserEmailVerification(getTargetUserId(request)));
}

export async function adminVerifyUserEmail(request: Request, response: Response) {
  response.json(await manuallyVerifyUserEmail(request.auth!.userId, getTargetUserId(request)));
}

export async function adminResetPassword(request: Request, response: Response) {
  response.json(await resetUserPassword(request.auth!.userId, getTargetUserId(request)));
}

export async function adminScores(request: Request, response: Response) {
  response.json(await listScoresForReview((request.query.status ?? "pending_review") as Parameters<typeof listScoresForReview>[0]));
}

export async function adminModerateScore(request: Request, response: Response) {
  response.json(await moderateScore(request.auth!.userId, request.params.scoreId!, request.body.status, request.body.reason));
}

export async function adminResetScores(request: Request, response: Response) {
  response.json(await resetUserScores(request.auth!.userId, getTargetUserId(request), request.body.reason));
}

export async function adminSetTrust(request: Request, response: Response) {
  response.json(await setUserTrust(request.auth!.userId, getTargetUserId(request), request.body.trustStatus, request.body.reason));
}

export async function adminRestrictUser(request: Request, response: Response) {
  response.status(201).json(await createUserRestriction(request.auth!.userId, getTargetUserId(request), request.body));
}

export async function adminRemoveRestriction(request: Request, response: Response) {
  response.json(await removeUserRestriction(request.auth!.userId, request.params.restrictionId!, request.body.reason));
}

export async function adminAuditLogs(_request: Request, response: Response) {
  response.json(await listAdminAuditLogs());
}

export async function adminGuestTransfers(_request: Request, response: Response) {
  response.json(await listGuestTransferAttempts());
}
