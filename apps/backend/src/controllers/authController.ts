import type { Request, Response } from "express";
import {
  getCurrentAccount,
  loginAccount,
  registerAccount,
  requestPasswordReset,
  resendEmailVerification,
  resetPassword,
  verifyEmailCode
} from "../services/authService.js";
import { transferGuestProgress } from "../services/guestTransferService.js";

export async function register(request: Request, response: Response) {
  const result = await registerAccount(request.body);
  response.status(201).json(result);
}

export async function login(request: Request, response: Response) {
  const result = await loginAccount(request.body);
  response.json(result);
}

export async function logout(_request: Request, response: Response) {
  response.json({ success: true });
}

export async function me(request: Request, response: Response) {
  const user = await getCurrentAccount(request.auth!.userId);
  response.json(user);
}

export async function forgotPassword(request: Request, response: Response) {
  response.json(await requestPasswordReset(request.body));
}

export async function resetPasswordController(request: Request, response: Response) {
  response.json(await resetPassword(request.body));
}

export async function verifyEmail(request: Request, response: Response) {
  response.json(await verifyEmailCode(request.body));
}

export async function resendVerification(request: Request, response: Response) {
  response.json(await resendEmailVerification(request.body));
}

export async function guestTransfer(request: Request, response: Response) {
  response.json(await transferGuestProgress(request.auth!.userId, request.body));
}
