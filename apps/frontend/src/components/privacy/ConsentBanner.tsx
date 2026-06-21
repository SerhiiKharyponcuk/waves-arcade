import { useEffect, useState } from "react";
import { Cookie } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useConsentStore } from "../../store/consentStore";
import { Button } from "../ui/Button";
import { Modal } from "../ui/Modal";

export function ConsentBanner() {
  const { t } = useTranslation();
  const consent = useConsentStore();
  const [analytics, setAnalytics] = useState(consent.analytics);
  const [advertising, setAdvertising] = useState(consent.advertising);

  useEffect(() => {
    if (consent.preferencesOpen) {
      setAnalytics(consent.analytics);
      setAdvertising(consent.advertising);
    }
  }, [consent.advertising, consent.analytics, consent.preferencesOpen]);

  return (
    <>
      {!consent.decided ? (
        <section className="fixed inset-x-3 bottom-[max(0.75rem,env(safe-area-inset-bottom))] z-[80] mx-auto max-w-3xl rounded-lg border border-cyanGlow/30 bg-panel p-4 shadow-neon" aria-label={t("consent.title")}>
          <div className="flex items-start gap-3">
            <Cookie className="mt-1 shrink-0 text-cyanGlow" size={22} />
            <div className="min-w-0 flex-1">
              <h2 className="font-black text-white">{t("consent.title")}</h2>
              <p className="mt-1 text-sm leading-6 text-slate-300">{t("consent.summary")}</p>
              <div className="mt-3 flex flex-wrap gap-2">
                <Button type="button" onClick={consent.acceptAll}>{t("consent.acceptAll")}</Button>
                <Button type="button" variant="secondary" onClick={consent.rejectOptional}>{t("consent.reject")}</Button>
                <Button type="button" variant="ghost" onClick={consent.openPreferences}>{t("consent.customize")}</Button>
              </div>
            </div>
          </div>
        </section>
      ) : null}

      {consent.preferencesOpen ? (
        <Modal title={t("consent.preferences")} closeLabel={t("common.close")} onClose={consent.closePreferences}>
          <div className="grid gap-4">
            <label className="flex items-center justify-between gap-4 rounded-md border border-white/10 bg-white/5 p-3">
              <span><strong className="block text-white">{t("consent.necessary")}</strong><small className="text-slate-400">{t("consent.necessaryHelp")}</small></span>
              <input type="checkbox" checked disabled className="h-5 w-5" />
            </label>
            <label className="flex items-center justify-between gap-4 rounded-md border border-white/10 bg-white/5 p-3">
              <span><strong className="block text-white">{t("consent.analytics")}</strong><small className="text-slate-400">{t("consent.analyticsHelp")}</small></span>
              <input type="checkbox" checked={analytics} onChange={(event) => setAnalytics(event.target.checked)} className="h-5 w-5 accent-cyanGlow" />
            </label>
            <label className="flex items-center justify-between gap-4 rounded-md border border-white/10 bg-white/5 p-3">
              <span><strong className="block text-white">{t("consent.advertising")}</strong><small className="text-slate-400">{t("consent.advertisingHelp")}</small></span>
              <input type="checkbox" checked={advertising} onChange={(event) => setAdvertising(event.target.checked)} className="h-5 w-5 accent-cyanGlow" />
            </label>
            <Button type="button" onClick={() => consent.save({ analytics, advertising })}>{t("consent.save")}</Button>
          </div>
        </Modal>
      ) : null}
    </>
  );
}
