import type { Request, Response } from "express";
import { deleteUserAccount, getUserProfile, updateUserProfile } from "../services/userService.js";
import { changeUserPassword } from "../services/passwordService.js";
import { getProgression } from "../services/progressionService.js";

export async function profile(request: Request, response: Response) {
  response.json(await getUserProfile(request.auth!.userId));
}

export async function updateProfile(request: Request, response: Response) {
  response.json(await updateUserProfile(request.auth!.userId, request.body));
}

export async function changePassword(request: Request, response: Response) {
  response.json(await changeUserPassword(request.auth!.userId, request.body));
}

export async function progression(request: Request, response: Response) {
  response.json(await getProgression(request.auth!.userId));
}

export async function deleteAccount(request: Request, response: Response) {
  response.json(await deleteUserAccount(request.auth!.userId, request.body.password));
}
