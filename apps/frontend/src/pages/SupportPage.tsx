import { FormEvent, useEffect, useState } from "react";
import { LifeBuoy, Send } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "../components/ui/Button";
import { Input } from "../components/ui/Input";
import { supportApi } from "../services/supportApi";
import type { SupportTicketCategory, SupportTicketDto } from "../types/api";

const categories: SupportTicketCategory[] = ["BUG", "BAN_APPEAL", "ACCOUNT", "PAYMENT", "SHOP", "OTHER"];

export function SupportPage() {
  const { t } = useTranslation();
  const [tickets, setTickets] = useState<SupportTicketDto[]>([]);
  const [category, setCategory] = useState<SupportTicketCategory>("BUG");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function loadTickets() {
    try {
      setTickets(await supportApi.myTickets());
    } catch (error) {
      setError(error instanceof Error ? error.message : t("common.error"));
    }
  }

  useEffect(() => {
    void loadTickets();
  }, []);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      const ticket = await supportApi.createTicket({ category, subject: subject.trim(), message: message.trim() });
      setTickets((current) => [ticket, ...current]);
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
          <Button type="submit" disabled={busy} icon={<Send size={18} />}>
            {t("support.send")}
          </Button>
        </form>
      </div>

      <div className="arcade-border rounded-lg p-5">
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
      </div>
    </section>
  );
}
