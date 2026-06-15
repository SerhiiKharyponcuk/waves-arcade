import type { Request, Response } from "express";
import { getUserProfile, updateUserProfile } from "../services/userService.js";

export async function profile(request: Request, response: Response) {
  response.json(await getUserProfile(request.auth!.userId));
}

export async function updateProfile(request: Request, response: Response) {
  response.json(await updateUserProfile(request.auth!.userId, request.body));
}
