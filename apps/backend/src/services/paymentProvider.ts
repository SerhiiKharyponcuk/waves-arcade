import type { PaymentCurrency } from "@waves/shared";
import { env } from "../config/env.js";
import { createLiqPayCheckoutForm } from "./liqpayProvider.js";

export type PaymentProviderId = "liqpay" | "stripe" | "mollie" | "paypal" | "adyen" | "google_play" | "apple_iap" | "placeholder";

export interface PaymentIntentRequest {
  userId: string;
  sku: string;
  currency: PaymentCurrency;
  amountCents: number;
  provider: PaymentProviderId;
  idempotencyKey: string;
}

export interface PaymentIntentResponse {
  provider: string;
  externalId: string;
  status: "pending" | "requires_configuration";
  message: string;
  checkoutUrl?: string;
  clientSecret?: string;
}

export interface PaymentProvider {
  createPaymentIntent(request: PaymentIntentRequest): Promise<PaymentIntentResponse>;
}

export class LiqPayPaymentProvider implements PaymentProvider {
  async createPaymentIntent(request: PaymentIntentRequest): Promise<PaymentIntentResponse> {
    const description = `Waves Arcade order ${request.sku}`;
    createLiqPayCheckoutForm({
      orderId: request.idempotencyKey,
      amountCents: request.amountCents,
      currency: request.currency,
      description
    });

    const webhookOrigin = new URL(env.LIQPAY_SERVER_URL!).origin;

    return {
      provider: "liqpay",
      externalId: request.idempotencyKey,
      status: "pending",
      message: "LiqPay checkout session created.",
      checkoutUrl: `${webhookOrigin}/api/payments/liqpay/checkout/${encodeURIComponent(request.idempotencyKey)}`
    };
  }
}

export class PlaceholderPaymentProvider implements PaymentProvider {
  async createPaymentIntent(request: PaymentIntentRequest): Promise<PaymentIntentResponse> {
    return {
      provider: request.provider,
      externalId: `placeholder_${request.idempotencyKey}`,
      status: "requires_configuration",
      message:
        `Payment provider "${request.provider}" is not configured yet. Connect LiqPay, Stripe, Mollie, PayPal, Adyen, Google Play Billing, or Apple IAP here.`
    };
  }
}

const placeholderPaymentProvider = new PlaceholderPaymentProvider();
const liqPayPaymentProvider = new LiqPayPaymentProvider();

export function getPaymentProvider(providerId: PaymentProviderId): PaymentProvider {
  if (providerId === "liqpay" && env.PAYMENT_PROVIDER === "liqpay") {
    return liqPayPaymentProvider;
  }
  return placeholderPaymentProvider;
}
