import { FormEvent, useEffect, useState } from "react";
import { ArrowRight, Gamepad2, LifeBuoy, LogIn, MailCheck, Send, UserPlus } from "lucide-react";
import { useTranslation } from "react-i18next";
import type { SupportedLocale, SupportTicketCategory } from "@waves/shared";
import { Button } from "../components/ui/Button";
import { Input } from "../components/ui/Input";
import { Modal } from "../components/ui/Modal";
import { authApi } from "../services/authApi";
import { supportApi } from "../services/supportApi";
import { useAuthStore } from "../store/authStore";
import { useGuestStore } from "../store/guestStore";
import { gameRuleSections } from "../data/gameRules";
import { TurnstileWidget } from "../components/auth/TurnstileWidget";
import { PolicyPage } from "./PolicyPage";
import { AboutPage } from "./AboutPage";

const supportedLocales: readonly SupportedLocale[] = ["en", "nl", "ru", "uk"];
const publicSupportCategories: SupportTicketCategory[] = ["APPEAL", "ACCOUNT", "SCORE", "BUG", "PAYMENT", "SHOP", "OTHER"];

function resolveAccountLocale(language: string): SupportedLocale {
  const locale = language.slice(0, 2) as SupportedLocale;
  return supportedLocales.includes(locale) ? locale : "en";
}

export function AuthPage() {
  const { t, i18n } = useTranslation();
  const requestedAuthMode = useGuestStore((state) => state.requestedAuthMode);
  const clearAuthenticationRequest = useGuestStore((state) => state.clearAuthenticationRequest);
  const continueAsGuest = useGuestStore((state) => state.continueAsGuest);
  const [mode, setMode] = useState<"login" | "register">(requestedAuthMode ?? "login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [captchaToken, setCaptchaToken] = useState("");
  const [termsOpen, setTermsOpen] = useState(false);
  const [policyOpen, setPolicyOpen] = useState<"privacy" | "cookies" | null>(null);
  const [aboutOpen, setAboutOpen] = useState(false);
  const [botWebsite, setBotWebsite] = useState("");
  const [formStartedAt] = useState(() => Date.now());
  const [forgotOpen, setForgotOpen] = useState(false);
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotMessage, setForgotMessage] = useState("");
  const [resetToken, setResetToken] = useState("");
  const [resetPassword, setResetPassword] = useState("");
  const [resetMessage, setResetMessage] = useState("");
  const [verificationEmail, setVerificationEmail] = useState("");
  const [verificationCode, setVerificationCode] = useState("");
  const [verificationMessage, setVerificationMessage] = useState("");
  const [verificationDevCode, setVerificationDevCode] = useState("");
  const [supportOpen, setSupportOpen] = useState(false);
  const [supportEmail, setSupportEmail] = useState("");
  const [supportName, setSupportName] = useState("");
  const [supportCategory, setSupportCategory] = useState<SupportTicketCategory>("ACCOUNT");
  const [supportSubject, setSupportSubject] = useState("");
  const [supportMessage, setSupportMessage] = useState("");
  const [supportResult, setSupportResult] = useState("");
  const [supportBusy, setSupportBusy] = useState(false);
  const [passwordBusy, setPasswordBusy] = useState(false);
  const { login, register, verifyEmail, loading, error } = useAuthStore();

  useEffect(() => {
    const token = new URLSearchParams(window.location.search).get("resetToken");
    if (token) {
      setResetToken(token);
    }
  }, []);

  useEffect(() => {
    if (requestedAuthMode) {
      setMode(requestedAuthMode);
      clearAuthenticationRequest();
    }
  }, [clearAuthenticationRequest, requestedAuthMode]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (mode === "login") {
      await login({ email: email.trim(), password });
      return;
    }

    const result = await register({
      email: email.trim(),
      password,
      displayName: displayName.trim(),
      locale: resolveAccountLocale(i18n.language),
      termsAccepted,
      captchaToken: captchaToken || undefined,
      website: botWebsite,
      formStartedAt
    });

    if (result && "emailVerificationRequired" in result) {
      setVerificationEmail(result.email);
      setVerificationDevCode(result.devCode ?? "");
      setVerificationMessage(result.emailSent ? t("auth.verificationSent") : t("auth.verificationCreated"));
      setMode("login");
    }
  }

  async function submitForgotPassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPasswordBusy(true);
    setForgotMessage("");
    try {
      const result = await authApi.forgotPassword({
        email: forgotEmail.trim(),
        website: botWebsite,
        formStartedAt
      });
      setForgotMessage(result.resetUrl ? `${t("auth.resetReady")} ${result.resetUrl}` : t("auth.resetSent"));
    } catch (error) {
      setForgotMessage(error instanceof Error ? error.message : t("common.error"));
    } finally {
      setPasswordBusy(false);
    }
  }

  async function submitResetPassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPasswordBusy(true);
    setResetMessage("");
    try {
      await authApi.resetPassword({ token: resetToken, password: resetPassword });
      setResetMessage(t("auth.passwordResetDone"));
      setResetPassword("");
      window.history.replaceState({}, "", window.location.pathname);
    } catch (error) {
      setResetMessage(error instanceof Error ? error.message : t("common.error"));
    } finally {
      setPasswordBusy(false);
    }
  }

  async function submitVerificationCode(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await verifyEmail({ email: verificationEmail, code: verificationCode.trim() });
  }

  async function resendVerificationCode() {
    setPasswordBusy(true);
    setVerificationMessage("");
    try {
      const result = await authApi.resendVerification({
        email: verificationEmail || email.trim(),
        website: botWebsite,
        formStartedAt
      });
      if ("emailVerificationRequired" in result) {
        setVerificationEmail(result.email);
        setVerificationDevCode(result.devCode ?? "");
        setVerificationMessage(result.emailSent ? t("auth.verificationSent") : t("auth.verificationCreated"));
      }
    } catch (error) {
      setVerificationMessage(error instanceof Error ? error.message : t("common.error"));
    } finally {
      setPasswordBusy(false);
    }
  }

  function openPublicSupport() {
    setSupportEmail(email.trim());
    setSupportResult("");
    setSupportOpen(true);
  }

  async function submitPublicSupport(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSupportBusy(true);
    setSupportResult("");
    try {
      const ticket = await supportApi.createPublicTicket({
        email: supportEmail.trim(),
        displayName: supportName.trim() || undefined,
        category: supportCategory,
        subject: supportSubject.trim(),
        message: supportMessage.trim(),
        website: botWebsite,
        formStartedAt
      });
      setSupportResult(`${t("support.guestSent")} ${ticket.id}`);
      setSupportSubject("");
      setSupportMessage("");
    } catch (error) {
      setSupportResult(error instanceof Error ? error.message : t("common.error"));
    } finally {
      setSupportBusy(false);
    }
  }

  return (
    <main className="grid min-h-screen place-items-center px-4 py-8">
      <div className="grid w-full max-w-5xl gap-6 lg:grid-cols-[1.05fr_0.95fr]">
        <section className="flex min-h-[32rem] flex-col justify-between rounded-lg border border-white/10 bg-grid bg-[size:28px_28px] p-6 shadow-neon">
          <div>
            <div className="mb-5 inline-flex rounded-md bg-cyanGlow px-3 py-2 text-sm font-black text-ink">
              {t("brand")}
            </div>
            <h1 className="max-w-xl text-5xl font-black leading-tight text-white neon-text sm:text-6xl">
              {t("auth.welcome")}
            </h1>
            <p className="mt-5 max-w-xl text-lg leading-8 text-slate-300">{t("auth.subtitle")}</p>
          </div>
          <div className="grid grid-cols-3 gap-3 text-sm font-bold text-slate-300">
            <div className="rounded-lg border border-white/10 bg-white/5 p-3">{t("auth.featureAccount")}</div>
            <div className="rounded-lg border border-white/10 bg-white/5 p-3">{t("auth.featureSkins")}</div>
            <div className="rounded-lg border border-white/10 bg-white/5 p-3">{t("auth.featureLeaderboard")}</div>
          </div>
        </section>

        <section className="arcade-border rounded-lg p-6">
          <div className="mb-6 flex rounded-md border border-white/10 bg-ink p-1">
            <button
              type="button"
              onClick={() => setMode("login")}
              className={`min-h-10 flex-1 rounded px-3 text-sm font-bold transition ${
                mode === "login" ? "bg-cyanGlow text-ink" : "text-slate-300"
              }`}
            >
              {t("auth.login")}
            </button>
            <button
              type="button"
              onClick={() => setMode("register")}
              className={`min-h-10 flex-1 rounded px-3 text-sm font-bold transition ${
                mode === "register" ? "bg-cyanGlow text-ink" : "text-slate-300"
              }`}
            >
              {t("auth.register")}
            </button>
          </div>

          <form className="grid gap-4" onSubmit={(event) => void submit(event)}>
            <input
              aria-hidden="true"
              autoComplete="off"
              className="hidden"
              tabIndex={-1}
              value={botWebsite}
              onChange={(event) => setBotWebsite(event.target.value)}
              name="website"
            />
            <Input label={t("auth.email")} type="email" value={email} onChange={(event) => setEmail(event.target.value)} required />
            <Input
              label={t("auth.password")}
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
              minLength={mode === "register" ? 8 : 1}
            />
            {mode === "register" ? (
              <>
                <Input
                  label={t("auth.displayName")}
                  value={displayName}
                  onChange={(event) => setDisplayName(event.target.value)}
                  required
                  minLength={3}
                  maxLength={24}
                />
                <label className="flex items-start gap-3 rounded-md border border-white/10 bg-white/5 p-3 text-sm text-slate-300">
                  <input
                    type="checkbox"
                    checked={termsAccepted}
                    onChange={(event) => setTermsAccepted(event.target.checked)}
                    className="mt-1 h-4 w-4 accent-cyanGlow"
                    required
                  />
                  <span>
                    {t("terms.acceptPrefix")}{" "}
                    <button
                      type="button"
                      onClick={() => setTermsOpen(true)}
                      className="font-bold text-cyanGlow underline-offset-4 hover:underline"
                    >
                      {t("terms.title")}
                    </button>
                  </span>
                </label>
                <TurnstileWidget onToken={setCaptchaToken} />
              </>
            ) : null}

            {error ? <div className="rounded-md border border-magentaGlow/40 bg-magentaGlow/10 p-3 text-sm text-pink-200">{error}</div> : null}
            {mode === "login" && error.toLowerCase().includes("not verified") ? (
              <Button type="button" variant="ghost" disabled={passwordBusy || !email.trim()} onClick={() => void resendVerificationCode()}>
                {t("auth.resendCode")}
              </Button>
            ) : null}

            <Button
              type="submit"
              disabled={loading || (mode === "register" && (!termsAccepted || (Boolean(import.meta.env.VITE_TURNSTILE_SITE_KEY) && !captchaToken)))}
              icon={mode === "login" ? <LogIn size={18} /> : <UserPlus size={18} />}
              className="mt-2"
            >
              {mode === "login" ? t("auth.login") : t("auth.createAccount")}
            </Button>

            <Button
              type="button"
              variant="ghost"
              onClick={() => setMode(mode === "login" ? "register" : "login")}
              icon={<ArrowRight size={18} />}
            >
              {mode === "login" ? t("auth.needAccount") : t("auth.haveAccount")}
            </Button>
            {mode === "login" ? (
              <>
                <Button type="button" variant="secondary" onClick={continueAsGuest} icon={<Gamepad2 size={18} />}>
                  {t("guest.continue")}
                </Button>
                <Button type="button" variant="ghost" onClick={() => setForgotOpen(true)}>
                  {t("auth.forgotPassword")}
                </Button>
                <Button type="button" variant="ghost" onClick={openPublicSupport} icon={<LifeBuoy size={18} />}>
                  {t("support.contactWithoutAccount")}
                </Button>
              </>
            ) : null}
            <Button type="button" variant="ghost" onClick={() => setTermsOpen(true)}>
              {t("rulesPage.title")}
            </Button>
          </form>
        </section>
      </div>

      <footer className="mt-5 flex flex-wrap justify-center gap-5 text-xs"><button type="button" className="font-bold text-cyanGlow" onClick={() => setAboutOpen(true)}>{t("aboutPage.title")}</button><button type="button" className="font-bold text-cyanGlow" onClick={() => setTermsOpen(true)}>{t("rulesPage.title")}</button><button type="button" className="font-bold text-cyanGlow" onClick={() => setPolicyOpen("privacy")}>{t("policies.privacy.title")}</button><button type="button" className="font-bold text-cyanGlow" onClick={() => setPolicyOpen("cookies")}>{t("policies.cookies.title")}</button></footer>

      {termsOpen ? (
        <Modal title={t("rulesPage.title")} closeLabel={t("common.close")} onClose={() => setTermsOpen(false)}>
          <div className="grid max-h-[58vh] gap-5 overflow-y-auto pr-2 text-sm leading-6 text-slate-300">
            {gameRuleSections.map((section) => <section key={section.title}><h3 className="font-black text-white">{t(`rulesPage.categories.${section.key}`, section.title)}</h3><ol start={section.start} className="mt-2 grid gap-2">{section.rules.map((rule, index) => <li key={rule} className="ml-6 pl-1">{t(`ruleTexts.${section.key}.${index}`, rule)}</li>)}</ol></section>)}
          </div>
          <Button type="button" className="mt-4 w-full" onClick={() => setTermsOpen(false)}>
            {t("common.close")}
          </Button>
        </Modal>
      ) : null}

      {policyOpen ? <Modal title={t(`policies.${policyOpen}.title`)} closeLabel={t("common.close")} onClose={() => setPolicyOpen(null)}><div className="max-h-[70vh] overflow-y-auto"><PolicyPage type={policyOpen} onClose={() => setPolicyOpen(null)} /></div></Modal> : null}

      {aboutOpen ? <Modal title={t("aboutPage.title")} closeLabel={t("common.close")} onClose={() => setAboutOpen(false)}><div className="max-h-[70vh] overflow-y-auto"><AboutPage onSupport={() => { setAboutOpen(false); openPublicSupport(); }} /></div></Modal> : null}

      {forgotOpen ? (
        <Modal title={t("auth.forgotPassword")} closeLabel={t("common.close")} onClose={() => setForgotOpen(false)}>
          <form className="grid gap-4" onSubmit={(event) => void submitForgotPassword(event)}>
            <input
              aria-hidden="true"
              autoComplete="off"
              className="hidden"
              tabIndex={-1}
              value={botWebsite}
              onChange={(event) => setBotWebsite(event.target.value)}
              name="website"
            />
            <p className="text-sm leading-6 text-slate-300">{t("auth.forgotHelp")}</p>
            <Input label={t("auth.email")} type="email" value={forgotEmail} onChange={(event) => setForgotEmail(event.target.value)} required />
            {forgotMessage ? <div className="rounded-md border border-cyanGlow/30 bg-cyanGlow/10 p-3 text-sm text-slate-100">{forgotMessage}</div> : null}
            <Button type="submit" disabled={passwordBusy}>
              {t("auth.sendReset")}
            </Button>
          </form>
        </Modal>
      ) : null}

      {supportOpen ? (
        <Modal title={t("support.guestTitle")} closeLabel={t("common.close")} onClose={() => setSupportOpen(false)}>
          <form className="grid gap-4" onSubmit={(event) => void submitPublicSupport(event)}>
            <input
              aria-hidden="true"
              autoComplete="off"
              className="hidden"
              tabIndex={-1}
              value={botWebsite}
              onChange={(event) => setBotWebsite(event.target.value)}
              name="website"
            />
            <div className="rounded-md border border-goldGlow/30 bg-goldGlow/10 p-3 text-sm leading-6 text-slate-200">
              {t("support.passwordWarning")}
            </div>
            <Input
              label={t("support.loginEmail")}
              type="email"
              value={supportEmail}
              onChange={(event) => setSupportEmail(event.target.value)}
              required
              maxLength={160}
            />
            <Input
              label={t("support.contactName")}
              value={supportName}
              onChange={(event) => setSupportName(event.target.value)}
              maxLength={60}
            />
            <label className="grid gap-2 text-sm text-slate-300">
              <span>{t("support.category")}</span>
              <select
                value={supportCategory}
                onChange={(event) => setSupportCategory(event.target.value as SupportTicketCategory)}
                className="min-h-11 rounded-md border border-slate-700 bg-ink/70 px-3 py-2 text-slate-50 outline-none transition focus:border-cyanGlow focus:ring-2 focus:ring-cyanGlow/20"
              >
                {publicSupportCategories.map((category) => (
                  <option key={category} value={category}>
                    {t(`support.categories.${category}`)}
                  </option>
                ))}
              </select>
            </label>
            <Input
              label={t("support.subject")}
              value={supportSubject}
              onChange={(event) => setSupportSubject(event.target.value)}
              required
              maxLength={120}
            />
            <label className="grid gap-2 text-sm text-slate-300">
              <span>{t("support.message")}</span>
              <textarea
                value={supportMessage}
                onChange={(event) => setSupportMessage(event.target.value)}
                required
                minLength={10}
                maxLength={2000}
                rows={6}
                className="rounded-md border border-slate-700 bg-ink/70 px-3 py-2 text-slate-50 outline-none transition placeholder:text-slate-500 focus:border-cyanGlow focus:ring-2 focus:ring-cyanGlow/20"
              />
            </label>
            {supportResult ? (
              <div className="rounded-md border border-cyanGlow/30 bg-cyanGlow/10 p-3 text-sm text-slate-100">{supportResult}</div>
            ) : null}
            <Button type="submit" disabled={supportBusy} icon={<Send size={18} />}>
              {t("support.send")}
            </Button>
          </form>
        </Modal>
      ) : null}

      {resetToken ? (
        <Modal title={t("auth.newPassword")} closeLabel={t("common.close")} onClose={() => setResetToken("")}>
          <form className="grid gap-4" onSubmit={(event) => void submitResetPassword(event)}>
            <Input
              label={t("auth.password")}
              type="password"
              value={resetPassword}
              onChange={(event) => setResetPassword(event.target.value)}
              required
              minLength={8}
            />
            {resetMessage ? <div className="rounded-md border border-cyanGlow/30 bg-cyanGlow/10 p-3 text-sm text-slate-100">{resetMessage}</div> : null}
            <Button type="submit" disabled={passwordBusy}>
              {t("auth.savePassword")}
            </Button>
          </form>
        </Modal>
      ) : null}

      {verificationEmail ? (
        <Modal title={t("auth.verifyEmail")} closeLabel={t("common.close")} onClose={() => setVerificationEmail("")}>
          <form className="grid gap-4" onSubmit={(event) => void submitVerificationCode(event)}>
            <div className="rounded-md border border-cyanGlow/30 bg-cyanGlow/10 p-3 text-sm leading-6 text-slate-100">
              {verificationMessage || t("auth.verificationSent")}
              {verificationDevCode ? <div className="mt-2 font-black text-cyanGlow">{t("auth.devCode")} {verificationDevCode}</div> : null}
            </div>
            <Input
              label={t("auth.verificationCode")}
              inputMode="numeric"
              pattern="[0-9]{6}"
              maxLength={6}
              value={verificationCode}
              onChange={(event) => setVerificationCode(event.target.value.replace(/\D/g, "").slice(0, 6))}
              required
            />
            {error ? <div className="rounded-md border border-magentaGlow/40 bg-magentaGlow/10 p-3 text-sm text-pink-200">{error}</div> : null}
            <Button type="submit" disabled={loading || verificationCode.length !== 6} icon={<MailCheck size={18} />}>
              {t("auth.verifyEmail")}
            </Button>
            <Button type="button" variant="ghost" disabled={passwordBusy} onClick={() => void resendVerificationCode()}>
              {t("auth.resendCode")}
            </Button>
          </form>
        </Modal>
      ) : null}
    </main>
  );
}
