import { FormEvent, useMemo, useState } from "react";
import {
  ArrowRight,
  BadgeEuro,
  Building2,
  CheckCircle2,
  CircleAlert,
  CreditCard,
  Heart,
  Landmark,
  LoaderCircle,
  LockKeyhole,
  ReceiptText,
  RotateCcw,
  ShieldCheck,
  Smartphone,
  Sparkles,
  WalletCards
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "../components/ui/Button";
import { Input } from "../components/ui/Input";
import { walletApi, type PaymentIntentDto, type PaymentProviderId } from "../services/walletApi";
import { useUiStore } from "../store/uiStore";

type PaymentMethodId = "card" | "ideal" | "paypal" | "applePay" | "googlePay" | "bankTransfer" | "revolut";
type PaymentStatus = "idle" | "loading" | "checkout_ready" | "provider_required" | "error";
type PaymentErrors = Partial<Record<"idealBank" | "supportAmount", string>>;

const baseAmount = 4.99;
const supportOptions = [1, 3, 5] as const;
const idealBanks = ["ING", "Rabobank", "ABN AMRO", "Bunq", "Revolut"];

function createPaymentKey() {
  return `checkout-${Date.now()}-${crypto.randomUUID?.() ?? Math.random().toString(36).slice(2)}`;
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "EUR"
  }).format(value);
}

function normalizeAmount(value: string) {
  return Number(value.replace(",", ".").trim());
}

function providerForMethod(method: PaymentMethodId): PaymentProviderId {
  if (method === "ideal" || method === "bankTransfer" || method === "revolut") return "mollie";
  if (method === "paypal") return "paypal";
  return "stripe";
}

export function PaymentPage() {
  const { t } = useTranslation();
  const setView = useUiStore((state) => state.setView);
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethodId>("ideal");
  const [status, setStatus] = useState<PaymentStatus>("idle");
  const [errors, setErrors] = useState<PaymentErrors>({});
  const [idealBank, setIdealBank] = useState("");
  const [supportEnabled, setSupportEnabled] = useState(false);
  const [selectedSupportAmount, setSelectedSupportAmount] = useState<number | "custom">(3);
  const [customSupportAmount, setCustomSupportAmount] = useState("");
  const [paymentIntent, setPaymentIntent] = useState<PaymentIntentDto | null>(null);
  const [idempotencyKey, setIdempotencyKey] = useState(createPaymentKey);

  const paymentMethods = [
    { id: "ideal" as const, provider: "mollie" as const, icon: Landmark, title: t("payment.methods.ideal"), description: t("payment.methods.idealDescription"), recommended: true },
    { id: "card" as const, provider: "stripe" as const, icon: CreditCard, title: t("payment.methods.card"), description: t("payment.methods.cardDescription") },
    { id: "paypal" as const, provider: "paypal" as const, icon: WalletCards, title: t("payment.methods.paypal"), description: t("payment.methods.paypalDescription") },
    { id: "applePay" as const, provider: "stripe" as const, icon: Smartphone, title: t("payment.methods.applePay"), description: t("payment.methods.applePayDescription") },
    { id: "googlePay" as const, provider: "stripe" as const, icon: BadgeEuro, title: t("payment.methods.googlePay"), description: t("payment.methods.googlePayDescription") },
    { id: "bankTransfer" as const, provider: "mollie" as const, icon: Building2, title: t("payment.methods.bankTransfer"), description: t("payment.methods.bankTransferDescription") },
    { id: "revolut" as const, provider: "mollie" as const, icon: Sparkles, title: t("payment.methods.revolut"), description: t("payment.methods.revolutDescription") }
  ];

  const supportAmount = useMemo(() => {
    if (!supportEnabled) return 0;
    if (selectedSupportAmount !== "custom") return selectedSupportAmount;
    const value = normalizeAmount(customSupportAmount);
    return Number.isFinite(value) && value >= 1 && value <= 250 ? value : 0;
  }, [customSupportAmount, selectedSupportAmount, supportEnabled]);

  const totalAmount = baseAmount + supportAmount;
  const activeMethod = paymentMethods.find((method) => method.id === selectedMethod) ?? paymentMethods[0]!;
  const ActiveMethodIcon = activeMethod.icon;

  function validate() {
    const nextErrors: PaymentErrors = {};
    if (selectedMethod === "ideal" && !idealBank) {
      nextErrors.idealBank = t("payment.validation.idealBank");
    }
    if (supportEnabled && selectedSupportAmount === "custom" && customSupportAmount.trim()) {
      const value = normalizeAmount(customSupportAmount);
      if (!Number.isFinite(value) || value < 1 || value > 250) {
        nextErrors.supportAmount = t("payment.validation.supportAmount");
      }
    }
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  }

  function resetPayment() {
    setStatus("idle");
    setErrors({});
    setPaymentIntent(null);
    setIdempotencyKey(createPaymentKey());
  }

  async function submitPayment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPaymentIntent(null);
    setStatus("idle");
    if (!validate()) {
      setStatus("error");
      return;
    }

    setStatus("loading");
    try {
      const intent = await walletApi.purchasePlaceholder({
        sku: "premium_starter_pack",
        supportAmountCents: Math.round(supportAmount * 100),
        currency: "EUR",
        provider: providerForMethod(selectedMethod),
        idempotencyKey
      });
      setPaymentIntent(intent);
      if (intent.checkoutUrl) {
        window.location.assign(intent.checkoutUrl);
        return;
      }
      setStatus(intent.status === "requires_configuration" ? "provider_required" : "checkout_ready");
    } catch (error) {
      setPaymentIntent({
        provider: activeMethod.provider,
        externalId: idempotencyKey,
        status: "requires_configuration",
        message: error instanceof Error ? error.message : t("payment.error.description")
      });
      setStatus("error");
    }
  }

  return (
    <section className="payment-page-enter grid gap-6">
      <header className="relative overflow-hidden rounded-lg border border-cyanGlow/20 bg-[radial-gradient(circle_at_16%_18%,rgba(33,212,253,0.22),transparent_28rem),linear-gradient(135deg,rgba(15,23,42,0.98),rgba(7,9,20,0.96))] p-5 sm:p-6">
        <div className="payment-orbit absolute -right-16 -top-20 hidden h-52 w-52 rounded-full border border-cyanGlow/20 bg-cyanGlow/5 lg:block" />
        <div className="relative grid gap-5 lg:grid-cols-[minmax(0,1fr)_22rem] lg:items-center">
          <div>
            <div className="mb-3 inline-flex items-center gap-2 rounded-md bg-cyanGlow px-3 py-2 text-sm font-black text-ink">
              <LockKeyhole size={17} />
              {t("payment.title")}
            </div>
            <h1 className="max-w-3xl text-4xl font-black text-white neon-text sm:text-5xl">{t("payment.heading")}</h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-300 sm:text-base">{t("payment.subtitle")}</p>
          </div>
          <div className="rounded-lg border border-white/10 bg-ink/70 p-4 text-sm text-slate-300 shadow-2xl">
            <div className="mb-3 flex items-center gap-2 font-black text-cyanGlow">
              <ShieldCheck size={19} />
              {t("payment.security.badge")}
            </div>
            <div className="grid gap-2">
              {[t("payment.flow.order"), t("payment.flow.provider"), t("payment.flow.confirmation")].map((item, index) => (
                <div key={item} className="flex items-center gap-3 rounded-md bg-white/[0.04] px-3 py-2">
                  <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-cyanGlow/15 text-xs font-black text-cyanGlow">{index + 1}</span>
                  <span>{item}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </header>

      <form className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_25rem]" onSubmit={(event) => void submitPayment(event)}>
        <div className="grid gap-6">
          <section className="arcade-border rounded-lg p-4 sm:p-5">
            <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <h2 className="text-2xl font-black text-white">{t("payment.methods.title")}</h2>
                <p className="mt-1 text-sm text-slate-400">{t("payment.methods.subtitle")}</p>
              </div>
              <div className="rounded-md border border-cyanGlow/20 bg-cyanGlow/10 px-3 py-2 text-xs font-black uppercase tracking-wide text-cyanGlow">
                {t("payment.providerStatus.safeMode")}
              </div>
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              {paymentMethods.map((method) => {
                const Icon = method.icon;
                const selected = selectedMethod === method.id;
                return (
                  <button
                    key={method.id}
                    type="button"
                    aria-pressed={selected}
                    disabled={status === "loading"}
                    onClick={() => {
                      setSelectedMethod(method.id);
                      resetPayment();
                    }}
                    className={`payment-method-card group min-h-32 rounded-lg border p-4 text-left transition focus:outline-none focus:ring-2 focus:ring-cyanGlow/60 disabled:cursor-not-allowed disabled:opacity-60 ${
                      selected
                        ? "payment-method-selected border-cyanGlow bg-cyanGlow/10 shadow-neon"
                        : "border-white/10 bg-white/[0.04] hover:border-cyanGlow/60 hover:bg-white/[0.07]"
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <span className={`grid h-12 w-12 shrink-0 place-items-center rounded-md border ${selected ? "border-cyanGlow bg-cyanGlow text-ink" : "border-white/10 bg-ink/70 text-cyanGlow"}`}>
                        <Icon size={22} />
                      </span>
                      <span className="min-w-0">
                        <span className="flex flex-wrap items-center gap-2 font-black text-white">
                          {method.title}
                          {method.recommended ? <span className="rounded-md bg-goldGlow px-2 py-0.5 text-[10px] uppercase text-ink">{t("payment.methods.recommended")}</span> : null}
                        </span>
                        <span className="mt-1 block text-sm leading-5 text-slate-400">{method.description}</span>
                        <span className="mt-3 inline-flex items-center gap-2 rounded-md bg-white/[0.05] px-2 py-1 text-xs font-bold text-slate-300">
                          <ReceiptText size={13} />
                          {t("payment.providerStatus.via", { provider: method.provider.toUpperCase() })}
                        </span>
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </section>

          <section className="arcade-border rounded-lg p-4 sm:p-5">
            <div className="mb-5 flex items-center justify-between gap-3 border-b border-white/10 pb-4">
              <div>
                <h2 className="text-xl font-black text-white">{t("payment.details.title")}</h2>
                <p className="mt-1 text-sm text-slate-400">{t("payment.details.hostedNotice")}</p>
              </div>
              <ActiveMethodIcon className="hidden text-cyanGlow sm:block" size={24} />
            </div>

            {selectedMethod === "ideal" ? (
              <label className="grid gap-2 text-sm text-slate-300">
                <span>{t("payment.ideal.bank")}</span>
                <select
                  value={idealBank}
                  onChange={(event) => setIdealBank(event.target.value)}
                  aria-invalid={Boolean(errors.idealBank)}
                  aria-describedby={errors.idealBank ? "ideal-bank-error" : undefined}
                  className="min-h-11 rounded-md border border-slate-700 bg-ink/70 px-3 py-2 text-slate-50 outline-none transition focus:border-cyanGlow focus:ring-2 focus:ring-cyanGlow/20"
                >
                  <option value="">{t("payment.ideal.chooseBank")}</option>
                  {idealBanks.map((bank) => <option key={bank} value={bank}>{bank}</option>)}
                </select>
                {errors.idealBank ? <span id="ideal-bank-error" className="payment-error-text">{errors.idealBank}</span> : null}
              </label>
            ) : null}

            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              <div className="rounded-lg border border-white/10 bg-white/[0.04] p-3 text-sm">
                <div className="font-black text-white">{t("payment.details.noCardStorageTitle")}</div>
                <p className="mt-1 leading-5 text-slate-400">{t("payment.details.noCardStorageBody")}</p>
              </div>
              <div className="rounded-lg border border-white/10 bg-white/[0.04] p-3 text-sm">
                <div className="font-black text-white">{t("payment.details.idempotencyTitle")}</div>
                <p className="mt-1 break-all leading-5 text-slate-400">{idempotencyKey}</p>
              </div>
              <div className="rounded-lg border border-white/10 bg-white/[0.04] p-3 text-sm">
                <div className="font-black text-white">{t("payment.details.providerTitle")}</div>
                <p className="mt-1 leading-5 text-slate-400">{t("payment.providerStatus.via", { provider: providerForMethod(selectedMethod).toUpperCase() })}</p>
              </div>
            </div>
          </section>

          <section className="rounded-lg border border-goldGlow/25 bg-goldGlow/5 p-4 sm:p-5">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0">
                <div className="flex items-center gap-2 text-xl font-black text-white">
                  <Heart className="support-heart text-goldGlow" size={22} />
                  {t("payment.support.title")}
                </div>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-300">{t("payment.support.description")}</p>
              </div>
              <label className="inline-flex min-h-11 shrink-0 cursor-pointer items-center gap-2 rounded-md border border-white/10 bg-white/5 px-3 text-sm font-black text-slate-200">
                <input type="checkbox" checked={supportEnabled} onChange={(event) => setSupportEnabled(event.target.checked)} className="h-4 w-4 accent-cyanGlow" />
                {t("payment.support.add")}
              </label>
            </div>
            {supportEnabled ? (
              <div className="mt-4 grid gap-3">
                <div className="flex flex-wrap gap-2">
                  {supportOptions.map((amount) => (
                    <button
                      key={amount}
                      type="button"
                      onClick={() => setSelectedSupportAmount(amount)}
                      className={`min-h-10 rounded-md border px-4 text-sm font-black transition ${selectedSupportAmount === amount ? "border-goldGlow bg-goldGlow text-ink" : "border-white/10 bg-white/5 text-slate-200 hover:border-goldGlow"}`}
                    >
                      {formatCurrency(amount)}
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => setSelectedSupportAmount("custom")}
                    className={`min-h-10 rounded-md border px-4 text-sm font-black transition ${selectedSupportAmount === "custom" ? "border-goldGlow bg-goldGlow text-ink" : "border-white/10 bg-white/5 text-slate-200 hover:border-goldGlow"}`}
                  >
                    {t("payment.support.customAmount")}
                  </button>
                </div>
                {selectedSupportAmount === "custom" ? (
                  <div className="max-w-xs">
                    <Input
                      label={t("payment.support.customAmount")}
                      inputMode="decimal"
                      value={customSupportAmount}
                      onChange={(event) => setCustomSupportAmount(event.target.value.replace(/[^\d.,]/g, "").slice(0, 8))}
                      aria-invalid={Boolean(errors.supportAmount)}
                      aria-describedby={errors.supportAmount ? "support-error" : undefined}
                      placeholder="3.50"
                    />
                    {errors.supportAmount ? <p id="support-error" className="payment-error-text">{errors.supportAmount}</p> : null}
                  </div>
                ) : null}
              </div>
            ) : null}
          </section>
        </div>

        <aside className="xl:sticky xl:top-32 xl:self-start">
          <div className="arcade-border rounded-lg p-5">
            <h2 className="text-xl font-black text-white">{t("payment.summary.title")}</h2>
            <div className="mt-5 grid gap-3 text-sm">
              <div className="rounded-md border border-cyanGlow/20 bg-cyanGlow/10 p-4">
                <div className="font-black text-white">{t("payment.summary.productName")}</div>
                <p className="mt-1 text-slate-300">{t("payment.summary.productDescription")}</p>
              </div>
              <div className="flex items-center justify-between gap-3 rounded-md bg-white/5 px-3 py-3">
                <span className="text-slate-300">{t("payment.summary.price")}</span>
                <strong className="text-white">{formatCurrency(baseAmount)}</strong>
              </div>
              <div className="flex items-center justify-between gap-3 rounded-md bg-white/5 px-3 py-3">
                <span className="text-slate-300">{t("payment.summary.support")}</span>
                <strong className={supportAmount > 0 ? "text-goldGlow" : "text-slate-400"}>{formatCurrency(supportAmount)}</strong>
              </div>
              <div className="flex items-center justify-between gap-3 rounded-md bg-white/5 px-3 py-3">
                <span className="text-slate-300">{t("payment.summary.fees")}</span>
                <strong className="text-white">{formatCurrency(0)}</strong>
              </div>
              <div className="mt-2 flex items-center justify-between border-t border-white/10 pt-4">
                <span className="font-black text-white">{t("payment.summary.total")}</span>
                <strong className="text-3xl text-cyanGlow">{formatCurrency(totalAmount)}</strong>
              </div>
            </div>

            {status === "provider_required" ? (
              <div role="status" className="payment-error-shake mt-4 rounded-md border border-goldGlow/40 bg-goldGlow/10 p-4 text-sm leading-6 text-slate-100">
                <div className="flex items-center gap-2 font-black text-goldGlow"><CircleAlert size={17} /> {t("payment.providerStatus.title")}</div>
                <p className="mt-1">{t("payment.providerStatus.description")}</p>
                {paymentIntent ? <p className="mt-2 break-all text-xs text-slate-400">{paymentIntent.message}</p> : null}
              </div>
            ) : null}

            {status === "checkout_ready" ? (
              <div role="status" className="mt-4 rounded-md border border-cyanGlow/40 bg-cyanGlow/10 p-4 text-center text-sm text-slate-100">
                <CheckCircle2 className="payment-success-check mx-auto text-cyanGlow" size={42} />
                <div className="mt-3 text-lg font-black text-white">{t("payment.checkoutReady.title")}</div>
                <p className="mt-1 leading-6 text-slate-300">{t("payment.checkoutReady.description")}</p>
              </div>
            ) : null}

            {status === "error" ? (
              <div role="alert" className="payment-error-shake mt-4 rounded-md border border-magentaGlow/40 bg-magentaGlow/10 p-3 text-sm leading-6 text-pink-100">
                <div className="flex items-center gap-2 font-black"><CircleAlert size={17} /> {t("payment.error.title")}</div>
                <p className="mt-1">{t("payment.error.description")}</p>
              </div>
            ) : null}

            <Button
              type="submit"
              disabled={status === "loading"}
              className="mt-5 w-full"
              icon={status === "loading" ? <LoaderCircle className="animate-spin" size={18} /> : <ArrowRight size={18} />}
            >
              {status === "loading" ? t("payment.actions.processing") : t("payment.actions.createCheckout")}
            </Button>

            {status !== "idle" ? (
              <Button type="button" variant="ghost" className="mt-2 w-full" onClick={resetPayment} icon={<RotateCcw size={17} />}>
                {t("payment.actions.reset")}
              </Button>
            ) : null}

            <div className="mt-4 rounded-md border border-white/10 bg-ink/70 p-3 text-xs leading-5 text-slate-400">
              <div className="mb-1 flex items-center gap-2 font-black text-slate-200"><ShieldCheck size={14} /> {t("payment.security.badge")}</div>
              {t("payment.security.sensitiveData")}
            </div>
          </div>
        </aside>
      </form>

      <div className="grid gap-3 rounded-lg border border-white/10 bg-white/[0.03] p-4 sm:grid-cols-3">
        {[t("payment.launchChecklist.provider"), t("payment.launchChecklist.webhook"), t("payment.launchChecklist.ads")].map((item) => (
          <div key={item} className="flex items-center gap-3 text-sm text-slate-300">
            <span className="grid h-8 w-8 shrink-0 place-items-center rounded-md bg-cyanGlow/10 text-cyanGlow"><CheckCircle2 size={17} /></span>
            <span>{item}</span>
          </div>
        ))}
      </div>

      <Button type="button" variant="ghost" className="justify-self-start" onClick={() => setView("settings")}>
        {t("payment.actions.backToSettings")}
      </Button>
    </section>
  );
}
