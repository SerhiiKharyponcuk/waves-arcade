import { FormEvent, useEffect, useState } from "react";
import { ArrowRight, LogIn, MailCheck, UserPlus } from "lucide-react";
import { useTranslation } from "react-i18next";
import type { SupportedLocale } from "@waves/shared";
import { Button } from "../components/ui/Button";
import { Input } from "../components/ui/Input";
import { Modal } from "../components/ui/Modal";
import { authApi } from "../services/authApi";
import { useAuthStore } from "../store/authStore";

const supportedLocales: readonly SupportedLocale[] = ["en", "nl", "ru", "uk"];

function resolveAccountLocale(language: string): SupportedLocale {
  const locale = language.slice(0, 2) as SupportedLocale;
  return supportedLocales.includes(locale) ? locale : "en";
}

export function AuthPage() {
  const { t, i18n } = useTranslation();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [termsOpen, setTermsOpen] = useState(false);
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
  const [passwordBusy, setPasswordBusy] = useState(false);
  const { login, register, verifyEmail, loading, error } = useAuthStore();

  useEffect(() => {
    const token = new URLSearchParams(window.location.search).get("resetToken");
    if (token) {
      setResetToken(token);
    }
  }, []);

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
              disabled={loading || (mode === "register" && !termsAccepted)}
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
              <Button type="button" variant="ghost" onClick={() => setForgotOpen(true)}>
                {t("auth.forgotPassword")}
              </Button>
            ) : null}
          </form>
        </section>
      </div>

      {termsOpen ? (
        <Modal title={t("terms.title")} closeLabel={t("common.close")} onClose={() => setTermsOpen(false)}>
          <div className="grid max-h-[60vh] gap-3 overflow-y-auto pr-2 text-sm leading-6 text-slate-300">
            {(t("terms.items", { returnObjects: true }) as string[]).map((item) => (
              <p key={item}>{item}</p>
            ))}
          </div>
        </Modal>
      ) : null}

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
