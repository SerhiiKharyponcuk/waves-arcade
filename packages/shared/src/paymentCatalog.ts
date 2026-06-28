export type PaymentCurrency = "UAH" | "EUR" | "USD";

export type PaymentProductKind = "coins" | "premium" | "skin";

export interface PaymentProduct {
  sku: string;
  kind: PaymentProductKind;
  nameKey: string;
  descriptionKey: string;
  currency: PaymentCurrency;
  amountCents: number;
  coins?: number;
  premiumDays?: number;
  skinSlug?: string;
  featured?: boolean;
  bestValue?: boolean;
}

export const paymentProducts: readonly PaymentProduct[] = [
  {
    sku: "coins_1000",
    kind: "coins",
    nameKey: "payment.products.coins1000.name",
    descriptionKey: "payment.products.coins1000.description",
    currency: "UAH",
    amountCents: 9_900,
    coins: 1_000,
    featured: true
  },
  {
    sku: "coins_2500",
    kind: "coins",
    nameKey: "payment.products.coins2500.name",
    descriptionKey: "payment.products.coins2500.description",
    currency: "UAH",
    amountCents: 22_900,
    coins: 2_500
  },
  {
    sku: "coins_5500",
    kind: "coins",
    nameKey: "payment.products.coins5500.name",
    descriptionKey: "payment.products.coins5500.description",
    currency: "UAH",
    amountCents: 44_900,
    coins: 5_500,
    bestValue: true
  },
  {
    sku: "premium_30",
    kind: "premium",
    nameKey: "payment.products.premium30.name",
    descriptionKey: "payment.products.premium30.description",
    currency: "UAH",
    amountCents: 14_900,
    premiumDays: 30,
    featured: true
  },
  {
    sku: "premium_90",
    kind: "premium",
    nameKey: "payment.products.premium90.name",
    descriptionKey: "payment.products.premium90.description",
    currency: "UAH",
    amountCents: 39_900,
    premiumDays: 90,
    bestValue: true
  },
  {
    sku: "skin_galaxy_vip",
    kind: "skin",
    nameKey: "payment.products.skinGalaxyVip.name",
    descriptionKey: "payment.products.skinGalaxyVip.description",
    currency: "UAH",
    amountCents: 19_900,
    skinSlug: "galaxy-line"
  }
] as const;

export type PaymentProductSku = (typeof paymentProducts)[number]["sku"];

export function findPaymentProduct(sku: string): PaymentProduct | undefined {
  return paymentProducts.find((product) => product.sku === sku);
}
