import type { Request, Response } from "express";
import { getAdminAnalytics, recordAnalyticsEvent } from "../services/analyticsService.js";

export async function createAnalyticsEvent(request: Request, response: Response) {
  response.status(202).json(await recordAnalyticsEvent({ ...request.body, userId: request.auth?.userId }));
}

export async function adminAnalytics(_request: Request, response: Response) {
  response.json(await getAdminAnalytics());
}
