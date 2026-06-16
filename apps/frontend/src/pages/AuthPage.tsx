import { FormEvent, useState } from "react";
import { ArrowRight, LogIn, UserPlus } from "lucide-react";
import { useTranslation } from "react-i18next";
import type { SupportedLocale } from "@waves/shared";
import { Button } from "../components/ui/Button";
import { Input } from "../components/ui/Input";
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
  const { login, register, loading, error } = useAuthStore();

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (mode === "login") {
      await login({ email: email.trim(), password });
      return;
    }

    await register({
      email: email.trim(),
      password,
      displayName: displayName.trim(),
      locale: resolveAccountLocale(i18n.language)
    });
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
              <Input
                label={t("auth.displayName")}
                value={displayName}
                onChange={(event) => setDisplayName(event.target.value)}
                required
                minLength={3}
                maxLength={24}
              />
            ) : null}

            {error ? <div className="rounded-md border border-magentaGlow/40 bg-magentaGlow/10 p-3 text-sm text-pink-200">{error}</div> : null}

            <Button
              type="submit"
              disabled={loading}
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
          </form>
        </section>
      </div>
    </main>
  );
}
