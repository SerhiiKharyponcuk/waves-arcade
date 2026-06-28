import type { Request, Response } from "express";
import { completeLiqPayPurchase, getLiqPayCheckoutSession } from "../services/walletService.js";
import { AppError } from "../utils/appError.js";

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll("\"", "&quot;");
}

export async function liqPayCheckout(request: Request, response: Response) {
  const orderId = request.params.orderId;
  if (!orderId) {
    throw new AppError(400, "Missing payment order ID.", "PAYMENT_ORDER_ID_MISSING");
  }
  const checkout = await getLiqPayCheckoutSession(orderId);
  response
    .status(200)
    .type("html")
    .send(`<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width,initial-scale=1" />
    <title>Waves Arcade Checkout</title>
    <style>
      body{margin:0;min-height:100vh;display:grid;place-items:center;background:radial-gradient(circle at top,#0ea5e9 0%,#07111f 45%,#020617 100%);font-family:Segoe UI,Arial,sans-serif;color:#e2e8f0}
      .panel{width:min(92vw,30rem);padding:2rem;border-radius:20px;background:rgba(2,6,23,.88);border:1px solid rgba(125,211,252,.22);box-shadow:0 20px 50px rgba(0,0,0,.35);text-align:center}
      .spinner{width:3rem;height:3rem;margin:0 auto 1rem;border-radius:999px;border:4px solid rgba(125,211,252,.2);border-top-color:#22d3ee;animation:spin 1s linear infinite}
      @keyframes spin{to{transform:rotate(360deg)}}
    </style>
  </head>
  <body>
    <div class="panel">
      <div class="spinner"></div>
      <h1>Redirecting to secure payment...</h1>
      <p>Your order is being opened in LiqPay.</p>
      <form id="liqpay-checkout" method="POST" action="${escapeHtml(checkout.actionUrl)}">
        <input type="hidden" name="data" value="${escapeHtml(checkout.data)}" />
        <input type="hidden" name="signature" value="${escapeHtml(checkout.signature)}" />
      </form>
    </div>
    <script>document.getElementById("liqpay-checkout")?.submit();</script>
  </body>
</html>`);
}

export async function liqPayWebhook(request: Request, response: Response) {
  const data = typeof request.body?.data === "string" ? request.body.data : "";
  const signature = typeof request.body?.signature === "string" ? request.body.signature : "";
  const result = await completeLiqPayPurchase({ data, signature });
  response.status(200).json(result);
}
