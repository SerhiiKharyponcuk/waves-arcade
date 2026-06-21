import type { Request, Response } from "express";
import { endGameSession, getLeaderboard, getMyBestScore, recordGameCheckpoint, startGameSession } from "../services/gameService.js";

export async function startSession(request: Request, response: Response) {
  response.status(201).json(await startGameSession(request.auth!.userId));
}

export async function endSession(request: Request, response: Response) {
  response.json(await endGameSession(request.auth!.userId, request.body));
}

export async function checkpointSession(request: Request, response: Response) {
  response.json(await recordGameCheckpoint(request.auth!.userId, request.body));
}

export async function submitScore(request: Request, response: Response) {
  response.json(await endGameSession(request.auth!.userId, request.body));
}

export async function leaderboard(request: Request, response: Response) {
  const limit = Number(request.query.limit ?? 10);
  response.json({
    global: await getLeaderboard(Number.isFinite(limit) ? Math.min(50, Math.max(1, limit)) : 10),
    weeklyPlaceholder: [],
    myBest: request.auth ? await getMyBestScore(request.auth.userId) : null
  });
}
