import type { Request, Response } from "express";
import {
  claimDailyReward,
  completeAdRewardSession,
  createPurchasePlaceholder,
  getDailyRewardStatus,
  getRouletteConfig,
  getSubscriptionBenefits,
  startAdRewardSession,
  spinRoulette,
  watchAdReward,
  getWallet
} from "../services/walletService.js";

export async function wallet(request: Request, response: Response) {
  response.json(await getWallet(request.auth!.userId));
}

export async function dailyRewardStatus(request: Request, response: Response) {
  response.json(await getDailyRewardStatus(request.auth!.userId));
}

export async function reward(request: Request, response: Response) {
  response.status(201).json(await claimDailyReward(request.auth!.userId));
}

export async function rouletteConfig(request: Request, response: Response) {
  response.json(await getRouletteConfig(request.auth!.userId));
}

export async function rouletteSpin(request: Request, response: Response) {
  response.status(201).json(await spinRoulette(request.auth!.userId, request.body.adsWatched));
}

export async function subscriptionBenefits(request: Request, response: Response) {
  response.json(await getSubscriptionBenefits(request.auth!.userId));
}

export async function adReward(request: Request, response: Response) {
  response.status(201).json(await watchAdReward(request.auth!.userId, request.body.placement));
}

export async function adRewardStart(request: Request, response: Response) {
  response.status(201).json(await startAdRewardSession(request.auth!.userId, request.body.placement, request.body.provider));
}

export async function adRewardComplete(request: Request, response: Response) {
  response.status(201).json(await completeAdRewardSession(request.auth!.userId, request.body));
}

export async function purchasePlaceholder(request: Request, response: Response) {
  response.status(202).json(await createPurchasePlaceholder(request.auth!.userId, request.body));
}
