import type { PaymentCurrency } from "@waves/shared";

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

export const paymentProvider: PaymentProvider = new PlaceholderPaymentProvider();
