import type { Request, Response } from "express";
import { banUser, listAdminUsers, thankUser, unbanUser } from "../services/adminService.js";
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
