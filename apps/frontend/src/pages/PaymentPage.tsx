import { FormEvent, useMemo, useState } from "react";
import {
  ArrowRight,
  BadgeEuro,
  Bitcoin,
  Building2,
  CheckCircle2,
  CircleAlert,
  CreditCard,
  Heart,
  Landmark,
  LoaderCircle,
  LockKeyhole,
  ShieldCheck,
  Smartphone,
  Sparkles,
  WalletCards
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "../components/ui/Button";
import { Input } from "../components/ui/Input";
import { useUiStore } from "../store/uiStore";

type PaymentMethodId = "card" | "ideal" | "paypal" | "applePay" | "googlePay" | "bankTransfer" | "revolut" | "crypto";
type PaymentStatus = "idle" | "loading" | "success" | "error";

type PaymentErrors = Partial<Record<"cardNumber" | "expiry" | "cvc" | "cardName" | "idealBank" | "supportAmount", string>>;

const baseAmount = 4.99;
const supportOptions = [1, 3, 5] as const;
const idealBanks = ["ING", "Rabobank", "ABN AMRO", "Bunq", "Revolut"];

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "EUR"
  }).format(value);
}

function normalizeAmount(value: string) {
  return Number(value.replace(",", ".").trim());
}

function formatCardNumber(value: string) {
  return value.replace(/\D/g, "").slice(0, 19).replace(/(.{4})/g, "$1 ").trim();
}

function formatExpiry(value: string) {
  const digits = value.replace(/\D/g, "").slice(0, 4);
  if (digits.length <= 2) return digits;
  return `${digits.slice(0, 2)}/${digits.slice(2)}`;
}

function isValidExpiry(value: string) {
  const match = /^(0[1-9]|1[0-2])\/\d{2}$/.exec(value);
  if (!match) return false;
  const [month, year] = value.split("/").map(Number);
  const expiry = new Date(2000 + Number(year), Number(month), 0, 23, 59, 59);
  return expiry >= new Date();
}

async function demoProcessPayment() {
  // TODO: Replace this demo layer with a real provider call.
  // Stripe, Mollie, Adyen, PayPal, Apple Pay and Google Pay must tokenize sensitive payment data client-side.
  await new Promise((resolve) => window.setTimeout(resolve, 1100));
}

export function PaymentPage() {
  const { t } = useTranslation();
  const setView = useUiStore((state) => state.setView);
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethodId>("card");
  const [status, setStatus] = useState<PaymentStatus>("idle");
  const [errors, setErrors] = useState<PaymentErrors>({});
  const [cardNumber, setCardNumber] = useState("");
  const [expiry, setExpiry] = useState("");
  const [cvc, setCvc] = useState("");
  const [cardName, setCardName] = useState("");
  const [idealBank, setIdealBank] = useState("");
  const [supportEnabled, setSupportEnabled] = useState(false);
  const [selectedSupportAmount, setSelectedSupportAmount] = useState<number | "custom">(3);
  const [customSupportAmount, setCustomSupportAmount] = useState("");

  const paymentMethods = [
    { id: "card" as const, icon: CreditCard, title: t("payment.methods.card"), description: t("payment.methods.cardDescription"), disabled: false },
    { id: "ideal" as const, icon: Landmark, title: t("payment.methods.ideal"), description: t("payment.methods.idealDescription"), disabled: false },
    { id: "paypal" as const, icon: WalletCards, title: t("payment.methods.paypal"), description: t("payment.methods.paypalDescription"), disabled: false },
    { id: "applePay" as const, icon: Smartphone, title: t("payment.methods.applePay"), description: t("payment.methods.applePayDescription"), disabled: false },
    { id: "googlePay" as const, icon: BadgeEuro, title: t("payment.methods.googlePay"), description: t("payment.methods.googlePayDescription"), disabled: false },
    { id: "bankTransfer" as const, icon: Building2, title: t("payment.methods.bankTransfer"), description: t("payment.methods.bankTransferDescription"), disabled: false },
    { id: "revolut" as const, icon: Sparkles, title: t("payment.methods.revolut"), description: t("payment.methods.revolutDescription"), disabled: false },
    { id: "crypto" as const, icon: Bitcoin, title: t("payment.methods.crypto"), description: t("payment.methods.cryptoDescription"), disabled: true }
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

    if (selectedMethod === "card") {
      const digits = cardNumber.replace(/\D/g, "");
      if (digits.length < 12 || digits.length > 19) nextErrors.cardNumber = t("payment.validation.cardNumber");
      if (!isValidExpiry(expiry)) nextErrors.expiry = t("payment.validation.expiry");
      if (!/^\d{3,4}$/.test(cvc)) nextErrors.cvc = t("payment.validation.cvc");
      if (cardName.trim().length < 2) nextErrors.cardName = t("payment.validation.cardName");
    }

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

  async function submitPayment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (activeMethod.disabled) return;
    setStatus("idle");
    if (!validate()) {
      setStatus("error");
      return;
    }

    setStatus("loading");
    try {
      await demoProcessPayment();
      setStatus("success");
    } catch {
      setStatus("error");
    }
  }

  function resetPayment() {
    setStatus("idle");
    setErrors({});
  }

  return (
    <section className="payment-page-enter grid gap-6">
      <header className="flex flex-col gap-5 rounded-lg border border-cyanGlow/20 bg-gradient-to-br from-white/[0.08] to-white/[0.03] p-5 sm:p-6 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <div className="mb-3 inline-flex items-center gap-2 rounded-md bg-cyanGlow px-3 py-2 text-sm font-black text-ink">
            <LockKeyhole size={17} />
            {t("payment.title")}
          </div>
          <h1 className="text-4xl font-black text-white neon-text sm:text-5xl">{t("payment.heading")}</h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-300 sm:text-base">{t("payment.subtitle")}</p>
        </div>
        <div className="grid max-w-sm gap-3 rounded-lg border border-white/10 bg-ink/60 p-4 text-sm text-slate-300">
          <div className="flex items-center gap-2 font-black text-cyanGlow"><ShieldCheck size={19} /> {t("payment.security.badge")}</div>
          <p className="leading-6">{t("payment.security.note")}</p>
        </div>
      </header>

      <form className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_24rem]" onSubmit={(event) => void submitPayment(event)}>
        <div className="grid gap-6">
          <section>
            <div className="mb-4 flex items-end justify-between gap-3">
              <div>
                <h2 className="text-2xl font-black text-white">{t("payment.methods.title")}</h2>
                <p className="mt-1 text-sm text-slate-400">{t("payment.methods.subtitle")}</p>
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              {paymentMethods.map((method) => {
                const Icon = method.icon;
                const selected = selectedMethod === method.id;
                return (
                  <button
                    key={method.id}
                    type="button"
                    disabled={method.disabled || status === "loading"}
                    aria-pressed={selected}
                    onClick={() => {
                      if (!method.disabled) {
                        setSelectedMethod(method.id);
                        resetPayment();
                      }
                    }}
                    className={`payment-method-card group min-h-28 rounded-lg border p-4 text-left transition focus:outline-none focus:ring-2 focus:ring-cyanGlow/60 disabled:cursor-not-allowed disabled:opacity-55 ${
                      selected
                        ? "payment-method-selected border-cyanGlow bg-cyanGlow/10 shadow-neon"
                        : "border-white/10 bg-white/[0.04] hover:border-cyanGlow/60 hover:bg-white/[0.07]"
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <span className={`grid h-11 w-11 shrink-0 place-items-center rounded-md border ${selected ? "border-cyanGlow bg-cyanGlow text-ink" : "border-white/10 bg-ink/70 text-cyanGlow"}`}>
                        <Icon size={21} />
                      </span>
                      <span className="min-w-0">
                        <span className="flex items-center gap-2 font-black text-white">
                          {method.title}
                          {method.disabled ? <span className="rounded-md bg-white/10 px-2 py-0.5 text-[10px] uppercase text-slate-300">{t("payment.methods.comingSoon")}</span> : null}
                        </span>
                        <span className="mt-1 block text-sm leading-5 text-slate-400">{method.description}</span>
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
                <p className="mt-1 text-sm text-slate-400">{t("payment.details.demoNotice")}</p>
              </div>
              <ActiveMethodIcon className="hidden text-cyanGlow sm:block" size={24} />
            </div>

            {selectedMethod === "card" ? (
              <div className="grid gap-4">
                <Input
                  label={t("payment.card.number")}
                  inputMode="numeric"
                  autoComplete="cc-number"
                  value={cardNumber}
                  onChange={(event) => setCardNumber(formatCardNumber(event.target.value))}
                  aria-invalid={Boolean(errors.cardNumber)}
                  aria-describedby={errors.cardNumber ? "card-number-error" : undefined}
                  placeholder="4242 4242 4242 4242"
                />
                {errors.cardNumber ? <p id="card-number-error" className="payment-error-text">{errors.cardNumber}</p> : null}
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <Input
                      label={t("payment.card.expiry")}
                      inputMode="numeric"
                      autoComplete="cc-exp"
                      value={expiry}
                      onChange={(event) => setExpiry(formatExpiry(event.target.value))}
                      aria-invalid={Boolean(errors.expiry)}
                      aria-describedby={errors.expiry ? "expiry-error" : undefined}
                      placeholder="MM/YY"
                    />
                    {errors.expiry ? <p id="expiry-error" className="payment-error-text">{errors.expiry}</p> : null}
                  </div>
                  <div>
                    <Input
                      label={t("payment.card.cvc")}
                      inputMode="numeric"
                      autoComplete="cc-csc"
                      value={cvc}
                      onChange={(event) => setCvc(event.target.value.replace(/\D/g, "").slice(0, 4))}
                      aria-invalid={Boolean(errors.cvc)}
                      aria-describedby={errors.cvc ? "cvc-error" : undefined}
                      placeholder="123"
                    />
                    {errors.cvc ? <p id="cvc-error" className="payment-error-text">{errors.cvc}</p> : null}
                  </div>
                </div>
                <Input
                  label={t("payment.card.name")}
                  autoComplete="cc-name"
                  value={cardName}
                  onChange={(event) => setCardName(event.target.value)}
                  aria-invalid={Boolean(errors.cardName)}
                  aria-describedby={errors.cardName ? "card-name-error" : undefined}
                  placeholder="Serhii Kharyponcuk"
                />
                {errors.cardName ? <p id="card-name-error" className="payment-error-text">{errors.cardName}</p> : null}
              </div>
            ) : null}

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

            {["paypal", "applePay", "googlePay", "bankTransfer", "revolut"].includes(selectedMethod) ? (
              <div className="rounded-lg border border-cyanGlow/25 bg-cyanGlow/10 p-4 text-sm leading-6 text-slate-200">
                <div className="mb-2 flex items-center gap-2 font-black text-white"><ActiveMethodIcon size={18} /> {activeMethod.title}</div>
                <p>{t(`payment.providerBlocks.${selectedMethod}`)}</p>
              </div>
            ) : null}
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
              <div className="flex items-center justify-between gap-3 rounded-md bg-white/5 px-3 py-3">
                <span className="text-slate-300">{t("payment.summary.product")}</span>
                <strong className="text-white">{t("payment.summary.productName")}</strong>
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

            {status === "error" ? (
              <div role="alert" className="payment-error-shake mt-4 rounded-md border border-magentaGlow/40 bg-magentaGlow/10 p-3 text-sm leading-6 text-pink-100">
                <div className="flex items-center gap-2 font-black"><CircleAlert size={17} /> {t("payment.error.title")}</div>
                <p className="mt-1">{t("payment.error.description")}</p>
              </div>
            ) : null}

            {status === "success" ? (
              <div role="status" className="mt-4 rounded-md border border-cyanGlow/40 bg-cyanGlow/10 p-4 text-center text-sm text-slate-100">
                <CheckCircle2 className="payment-success-check mx-auto text-cyanGlow" size={42} />
                <div className="mt-3 text-lg font-black text-white">{t("payment.success.title")}</div>
                <p className="mt-1 leading-6 text-slate-300">{t("payment.success.description")}</p>
                <Button type="button" variant="secondary" className="mt-4 w-full" onClick={() => setView("premium")}>
                  {t("payment.actions.continue")}
                </Button>
              </div>
            ) : (
              <Button
                type="submit"
                disabled={status === "loading" || activeMethod.disabled}
                className="mt-5 w-full"
                icon={status === "loading" ? <LoaderCircle className="animate-spin" size={18} /> : <ArrowRight size={18} />}
              >
                {status === "loading" ? t("payment.actions.processing") : selectedMethod === "ideal" ? t("payment.actions.continueIdeal") : t("payment.actions.payNow")}
              </Button>
            )}

            {status === "error" ? (
              <Button type="button" variant="ghost" className="mt-2 w-full" onClick={resetPayment}>
                {t("payment.actions.tryAgain")}
              </Button>
            ) : null}

            <div className="mt-4 rounded-md border border-white/10 bg-ink/70 p-3 text-xs leading-5 text-slate-400">
              <div className="mb-1 flex items-center gap-2 font-black text-slate-200"><ShieldCheck size={14} /> {t("payment.security.badge")}</div>
              {t("payment.security.sensitiveData")}
            </div>
          </div>
        </aside>
      </form>
    </section>
  );
}
