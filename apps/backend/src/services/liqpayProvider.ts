import { createHash } from "node:crypto";
import { env } from "../config/env.js";
import { AppError } from "../utils/appError.js";

type LiqPayCurrency = "UAH" | "EUR" | "USD";

type LiqPayCheckoutParams = {
  public_key: string;
  version: "3";
  action: "pay";
  amount: string;
  currency: LiqPayCurrency;
  description: string;
  order_id: string;
  result_url: string;
  server_url: string;
  sandbox?: "1";
};

export type LiqPayCallbackPayload = {
  order_id?: string;
  status?: string;
  amount?: string | number;
  currency?: LiqPayCurrency;
  transaction_id?: number | string;
  sender_phone?: string;
  err_code?: string;
  err_description?: string;
};

export function signLiqPayData(data: string, privateKey: string) {
  return createHash("sha1").update(privateKey + data + privateKey).digest("base64");
}

export function encodeLiqPayData(params: LiqPayCheckoutParams) {
  return Buffer.from(JSON.stringify(params)).toString("base64");
}

export function decodeLiqPayData(data: string): LiqPayCallbackPayload {
  return JSON.parse(Buffer.from(data, "base64").toString("utf8")) as LiqPayCallbackPayload;
}

export function verifyLiqPaySignature(data: string, signature: string, privateKey: string) {
  return signLiqPayData(data, privateKey) === signature;
}

export function createLiqPayCheckoutForm(input: {
  orderId: string;
  amountCents: number;
  currency: LiqPayCurrency;
  description: string;
}) {
  if (!env.LIQPAY_PUBLIC_KEY || !env.LIQPAY_PRIVATE_KEY || !env.LIQPAY_RESULT_URL || !env.LIQPAY_SERVER_URL) {
    throw new AppError(503, "LiqPay is not configured.", "LIQPAY_NOT_CONFIGURED");
  }

  const params: LiqPayCheckoutParams = {
    public_key: env.LIQPAY_PUBLIC_KEY,
    version: "3",
    action: "pay",
    amount: (input.amountCents / 100).toFixed(2),
    currency: input.currency,
    description: input.description,
    order_id: input.orderId,
    result_url: env.LIQPAY_RESULT_URL,
    server_url: env.LIQPAY_SERVER_URL,
    sandbox: env.LIQPAY_MODE === "sandbox" ? "1" : undefined
  };

  const data = encodeLiqPayData(params);
  const signature = signLiqPayData(data, env.LIQPAY_PRIVATE_KEY);

  return {
    actionUrl: "https://www.liqpay.ua/api/3/checkout",
    data,
    signature
  };
}
