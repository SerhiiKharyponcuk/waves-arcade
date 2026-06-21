import { FormEvent, useEffect, useState } from "react";
import { LifeBuoy, Send } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "../components/ui/Button";
import { Input } from "../components/ui/Input";
import { supportApi } from "../services/supportApi";
import type { SupportTicketCategory, SupportTicketDto } from "../types/api";
import { useAuthStore } from "../store/authStore";
import { useGuestStore } from "../store/guestStore";
import { useUiStore } from "../store/uiStore";

const categories: SupportTicketCategory[] = ["APPEAL", "ACCOUNT", "SCORE", "PAYMENT", "SHOP", "BUG", "OTHER"];

export function SupportPage() {
  const { t } = useTranslation();
  const user = useAuthStore((state) => state.user);
  const guestActive = useGuestStore((state) => state.active);
  const isGuest = guestActive && !user;
  const setView = useUiStore((state) => state.setView);
  const [tickets, setTickets] = useState<SupportTicketDto[]>([]);
  const [category, setCategory] = useState<SupportTicketCategory>("BUG");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [botWebsite, setBotWebsite] = useState("");
  const [formStartedAt] = useState(() => Date.now());
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [contactName, setContactName] = useState("");
  const [relatedEntityId, setRelatedEntityId] = useState("");
  const [success, setSuccess] = useState("");

  async function loadTickets() {
    if (isGuest) return;
    try {
      setTickets(await supportApi.myTickets());
    } catch (error) {
      setError(error instanceof Error ? error.message : t("common.error"));
    }
  }

  useEffect(() => {
    void loadTickets();
  }, [isGuest]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    setSuccess("");
    try {
      const payload = { category, subject: subject.trim(), message: message.trim(), relatedEntityId: relatedEntityId.trim() || undefined, website: botWebsite, formStartedAt };
      const ticket = isGuest
        ? await supportApi.createPublicTicket({ ...payload, email: contactEmail.trim(), displayName: contactName.trim() || undefined })
        : await supportApi.createTicket(payload);
      if (!isGuest) setTickets((current) => [ticket, ...current]);
      setSuccess(t("support.ticketCreated", { id: ticket.id }));
      setSubject("");
      setMessage("");
    } catch (error) {
      setError(error instanceof Error ? error.message : t("common.error"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
      <div>
        <div className="mb-3 inline-flex items-center gap-2 rounded-md bg-cyanGlow px-3 py-2 text-sm font-black text-ink">
          <LifeBuoy size={17} />
          {t("nav.support")}
        </div>
        <h1 className="text-4xl font-black text-white neon-text">{t("support.title")}</h1>
        <p className="mt-2 max-w-2xl text-slate-300">{t("support.subtitle")}</p>

        <form className="mt-6 grid gap-4 rounded-lg border border-white/10 bg-white/5 p-4" onSubmit={(event) => void submit(event)}>
          <input
            aria-hidden="true"
            autoComplete="off"
            className="hidden"
            tabIndex={-1}
            value={botWebsite}
            onChange={(event) => setBotWebsite(event.target.value)}
            name="website"
          />
          <div className="rounded-md border border-goldGlow/30 bg-goldGlow/10 p-3 text-sm leading-6 text-slate-200">{t("support.passwordWarning")}</div>
          <button type="button" onClick={() => setView("rules")} className="justify-self-start text-sm font-bold text-cyanGlow hover:text-white">{t("support.readRules")}</button>
          {isGuest ? <><Input label={t("support.replyEmail")} type="email" value={contactEmail} onChange={(event) => setContactEmail(event.target.value)} required maxLength={160} /><Input label={t("support.optionalName")} value={contactName} onChange={(event) => setContactName(event.target.value)} maxLength={60} /></> : null}
          <label className="grid gap-2 text-sm text-slate-300">
            <span>{t("support.category")}</span>
            <select
              value={category}
              onChange={(event) => setCategory(event.target.value as SupportTicketCategory)}
              className="min-h-11 rounded-md border border-slate-700 bg-ink/70 px-3 py-2 text-slate-50 outline-none transition focus:border-cyanGlow focus:ring-2 focus:ring-cyanGlow/20"
            >
              {categories.map((item) => (
                <option key={item} value={item}>
                  {t(`support.categories.${item}`)}
                </option>
              ))}
            </select>
          </label>
          <Input label={t("support.subject")} value={subject} onChange={(event) => setSubject(event.target.value)} required maxLength={120} />
          {(category === "APPEAL" || category === "SCORE") ? <Input label={t("support.relatedId")} value={relatedEntityId} onChange={(event) => setRelatedEntityId(event.target.value)} maxLength={100} /> : null}
          <label className="grid gap-2 text-sm text-slate-300">
            <span>{t("support.message")}</span>
            <textarea
              value={message}
              onChange={(event) => setMessage(event.target.value)}
              required
              minLength={10}
              maxLength={2000}
              rows={7}
              className="rounded-md border border-slate-700 bg-ink/70 px-3 py-2 text-slate-50 outline-none transition placeholder:text-slate-500 focus:border-cyanGlow focus:ring-2 focus:ring-cyanGlow/20"
            />
          </label>
          {error ? <div className="rounded-md border border-magentaGlow/40 bg-magentaGlow/10 p-3 text-sm text-pink-200">{error}</div> : null}
          {success ? <div className="rounded-md border border-cyanGlow/30 bg-cyanGlow/10 p-3 text-sm text-cyanGlow">{success}</div> : null}
          <Button type="submit" disabled={busy} icon={<Send size={18} />}>
            {t("support.send")}
          </Button>
        </form>
      </div>

      {!isGuest ? <div className="arcade-border rounded-lg p-5">
        <h2 className="text-xl font-black text-white">{t("support.myTickets")}</h2>
        <div className="mt-4 grid gap-3">
          {tickets.map((ticket) => (
            <article key={ticket.id} className="rounded-lg border border-white/10 bg-white/5 p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="font-black text-white">{ticket.subject}</div>
                <span className="rounded-md bg-cyanGlow/15 px-2 py-1 text-xs font-black text-cyanGlow">{ticket.status}</span>
              </div>
              <div className="mt-2 text-xs font-bold text-slate-400">{t(`support.categories.${ticket.category}`)}</div>
              <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-slate-300">{ticket.message}</p>
              {ticket.adminResponse ? (
                <div className="mt-4 rounded-md border border-cyanGlow/30 bg-cyanGlow/10 p-3 text-sm leading-6 text-slate-100">
                  <div className="mb-1 font-black text-cyanGlow">{t("support.adminResponse")}</div>
                  {ticket.adminResponse}
                </div>
              ) : null}
            </article>
          ))}
          {!tickets.length ? <div className="text-sm text-slate-400">{t("support.empty")}</div> : null}
        </div>
      </div> : <div className="arcade-border rounded-lg p-5 text-sm leading-7 text-slate-300"><h2 className="text-xl font-black text-white">{t("support.guestRulesTitle")}</h2><p className="mt-3">{t("support.guestRulesBody")}</p></div>}
    </section>
  );
}
