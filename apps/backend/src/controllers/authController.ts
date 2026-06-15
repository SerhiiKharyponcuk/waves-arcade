import type { Request, Response } from "express";
import { getCurrentAccount, loginAccount, registerAccount } from "../services/authService.js";

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
