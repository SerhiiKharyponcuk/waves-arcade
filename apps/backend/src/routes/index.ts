import { Router } from "express";
import { authRoutes } from "./authRoutes.js";
import { gameRoutes } from "./gameRoutes.js";
import { shopRoutes } from "./shopRoutes.js";
import { userRoutes } from "./userRoutes.js";
import { walletRoutes } from "./walletRoutes.js";

export const apiRoutes = Router();

apiRoutes.get("/health", (_request, response) => {
  response.json({ status: "ok", service: "waves-backend" });
});

apiRoutes.use("/auth", authRoutes);
apiRoutes.use("/user", userRoutes);
apiRoutes.use("/game", gameRoutes);
apiRoutes.use("/shop", shopRoutes);
apiRoutes.use("/wallet", walletRoutes);
