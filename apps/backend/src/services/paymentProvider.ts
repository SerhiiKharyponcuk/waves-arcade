export interface PaymentIntentRequest {
  userId: string;
  sku: string;
  currency: "USD" | "EUR";
  amountCents: number;
  provider: "stripe" | "google_play" | "apple_iap" | "placeholder";
}

export interface PaymentIntentResponse {
  provider: string;
  externalId: string;
  status: "pending" | "requires_configuration";
  message: string;
}

export interface PaymentProvider {
  createPaymentIntent(request: PaymentIntentRequest): Promise<PaymentIntentResponse>;
}

export class PlaceholderPaymentProvider implements PaymentProvider {
  async createPaymentIntent(request: PaymentIntentRequest): Promise<PaymentIntentResponse> {
    return {
      provider: request.provider,
      externalId: `placeholder_${request.userId}_${Date.now()}`,
      status: "requires_configuration",
      message:
        "Payment provider is not configured yet. Connect Stripe, Google Play Billing, or Apple IAP here."
    };
  }
}

export const paymentProvider: PaymentProvider = new PlaceholderPaymentProvider();
