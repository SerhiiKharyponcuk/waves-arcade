import { FormEvent, useState } from "react";
import { BadgeDollarSign, Gift, Save, Settings } from "lucide-react";
import { useTranslation } from "react-i18next";
import type { SupportedLocale } from "@waves/shared";
import { LanguageSelector } from "../components/settings/LanguageSelector";
import { Button } from "../components/ui/Button";
import { Input } from "../components/ui/Input";
import { authApi } from "../services/authApi";
import { useAuthStore } from "../store/authStore";

export function SettingsPage() {
  const { t } = useTranslation();
  const { user, patchProfile, logout } = useAuthStore();
  const [displayName, setDisplayName] = useState(user?.profile.displayName ?? "");
  const [locale, setLocale] = useState<SupportedLocale>((user?.profile.locale ?? "en") as SupportedLocale);
  const [saved, setSaved] = useState(false);
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setSaved(false);
    const profile = await authApi.updateProfile({ displayName, locale });
    patchProfile(profile);
    setSaved(true);
    setBusy(false);
  }

  return (
    <section className="grid gap-6 lg:grid-cols-[1fr_0.85fr]">
      <div className="arcade-border rounded-lg p-5">
        <div className="mb-5 inline-flex items-center gap-2 rounded-md bg-cyanGlow px-3 py-2 text-sm font-black text-ink">
          <Settings size={17} />
          {t("settings.title")}
        </div>

        <form className="grid gap-5" onSubmit={(event) => void submit(event)}>
          <Input
            label={t("auth.displayName")}
            value={displayName}
            minLength={3}
            maxLength={24}
            onChange={(event) => setDisplayName(event.target.value)}
          />
          <LanguageSelector value={locale} onChange={setLocale} />
          {saved ? <div className="rounded-md border border-cyanGlow/40 bg-cyanGlow/10 p-3 text-sm text-cyanGlow">{t("settings.saved")}</div> : null}
          <div className="flex flex-wrap gap-3">
            <Button type="submit" disabled={busy} icon={<Save size={18} />}>
              {t("settings.save")}
            </Button>
            <Button type="button" variant="secondary" onClick={() => void logout()}>
              {t("auth.logout")}
            </Button>
          </div>
        </form>
      </div>

      <aside className="grid gap-4">
        <div className="arcade-border rounded-lg p-5">
          <div className="mb-3 flex items-center gap-2 text-goldGlow">
            <BadgeDollarSign size={22} />
            <h2 className="text-xl font-black text-white">{t("settings.payments")}</h2>
          </div>
          <p className="text-sm leading-6 text-slate-300">{t("settings.paymentsNote")}</p>
        </div>
        <div className="arcade-border rounded-lg p-5">
          <div className="mb-3 flex items-center gap-2 text-cyanGlow">
            <Gift size={22} />
            <h2 className="text-xl font-black text-white">{t("settings.ads")}</h2>
          </div>
          <p className="text-sm leading-6 text-slate-300">{t("settings.adsNote")}</p>
        </div>
      </aside>
    </section>
  );
}
