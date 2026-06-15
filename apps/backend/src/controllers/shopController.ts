import type { Request, Response } from "express";
import { buySkin, equipSkin, getOwnedSkins, listShopSkins } from "../services/shopService.js";

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
