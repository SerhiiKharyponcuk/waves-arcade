import type { Request, Response } from "express";
import { buySkin, equipSkin, getOwnedSkins, listShopSkins } from "../services/shopService.js";
import { equipTheme, listThemes, unlockTheme } from "../services/themeService.js";

export async function skins(request: Request, response: Response) {
  response.json(await listShopSkins(request.auth?.userId));
}

export async function mySkins(request: Request, response: Response) {
  response.json(await getOwnedSkins(request.auth!.userId));
}

export async function buy(request: Request, response: Response) {
  response.status(201).json(await buySkin(request.auth!.userId, request.body.skinId));
}

export async function equip(request: Request, response: Response) {
  response.json(await equipSkin(request.auth!.userId, request.body.skinId));
}

export async function themes(request: Request, response: Response) {
  response.json(await listThemes(request.auth?.userId));
}

export async function unlockThemeController(request: Request, response: Response) {
  response.status(201).json(await unlockTheme(request.auth!.userId, request.body.themeId));
}

export async function equipThemeController(request: Request, response: Response) {
  response.json(await equipTheme(request.auth!.userId, request.body.themeId));
}
