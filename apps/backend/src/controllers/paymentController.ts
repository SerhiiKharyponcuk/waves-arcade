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
  response.setHeader(
    "Content-Security-Policy",
    [
      "default-src 'self'",
      "base-uri 'self'",
      "form-action 'self' https://www.liqpay.ua",
      "frame-ancestors 'none'",
      "img-src 'self' data:",
      "script-src 'self' 'unsafe-inline'",
      "style-src 'self' 'unsafe-inline'"
    ].join("; ")
  );
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
      .actions{display:grid;gap:.75rem;justify-items:center;margin-top:1.5rem}
      .button{display:inline-flex;align-items:center;justify-content:center;min-width:16rem;padding:.95rem 1.25rem;border:none;border-radius:999px;background:linear-gradient(135deg,#22d3ee 0%,#0ea5e9 100%);color:#02111f;font-weight:700;font-size:1rem;cursor:pointer;box-shadow:0 12px 30px rgba(14,165,233,.3);transition:transform .2s ease,box-shadow .2s ease}
      .button:hover{transform:translateY(-1px);box-shadow:0 16px 38px rgba(14,165,233,.35)}
      .button:focus-visible{outline:2px solid #67e8f9;outline-offset:3px}
      .muted{margin:0;color:#93c5fd;font-size:.92rem}
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
        <div class="actions">
          <button class="button" type="submit">Continue to LiqPay</button>
          <p class="muted">If the redirect does not start automatically, tap the button.</p>
        </div>
      </form>
    </div>
    <script>
      window.setTimeout(() => {
        document.getElementById("liqpay-checkout")?.submit();
      }, 120);
    </script>
  </body>
</html>`);
}

export async function liqPayWebhook(request: Request, response: Response) {
  const data = typeof request.body?.data === "string" ? request.body.data : "";
  const signature = typeof request.body?.signature === "string" ? request.body.signature : "";
  const result = await completeLiqPayPurchase({ data, signature });
  response.status(200).json(result);
}
