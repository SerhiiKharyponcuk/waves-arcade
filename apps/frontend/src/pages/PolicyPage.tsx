import { Cookie, ShieldCheck, X } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "../components/ui/Button";

interface PolicyPageProps {
  type: "privacy" | "cookies";
  onClose?: () => void;
}

const policySectionKeys = {
  privacy: ["data", "purpose", "legal", "sharing", "retention", "choices", "security", "contact"],
  cookies: ["necessary", "analytics", "advertising", "choices", "thirdParties", "changes"]
} as const;

export function PolicyPage({ type, onClose }: PolicyPageProps) {
  const { t } = useTranslation();
  const isPrivacy = type === "privacy";
  const sections = policySectionKeys[type];
  const Icon = isPrivacy ? ShieldCheck : Cookie;
  return <section className="grid gap-6"><header className="flex items-start justify-between gap-4"><div><div className="mb-3 inline-flex items-center gap-2 rounded-md bg-cyanGlow px-3 py-2 text-sm font-black text-ink"><Icon size={17} />{t("brand")}</div><h1 className="text-4xl font-black text-white neon-text">{t(`policies.${type}.title`)}</h1><p className="mt-2 text-sm text-slate-400">{t("policies.effective")}</p></div>{onClose ? <Button type="button" variant="ghost" onClick={onClose} icon={<X size={18} />}>{t("common.close")}</Button> : null}</header><div className="grid gap-4">{sections.map((key) => <article key={key} className="rounded-md border border-white/10 bg-white/5 p-4"><h2 className="font-black text-white">{t(`policies.${type}.sections.${key}.title`)}</h2><p className="mt-2 text-sm leading-6 text-slate-300">{t(`policies.${type}.sections.${key}.body`)}</p></article>)}</div></section>;
}
