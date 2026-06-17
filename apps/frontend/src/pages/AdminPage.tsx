import { useEffect, useMemo, useState } from "react";
import { Ban, HeartHandshake, Inbox, Search, ShieldCheck, ShieldOff } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "../components/ui/Button";
import { Input } from "../components/ui/Input";
import { Modal } from "../components/ui/Modal";
import { adminApi } from "../services/adminApi";
import { supportApi } from "../services/supportApi";
import type { AdminUserDto, SupportTicketDto, SupportTicketStatus } from "../types/api";

type AdminAction = "ban" | "unban" | "thank";
type SupportAction = { ticket: SupportTicketDto; status: SupportTicketStatus };

const banReasonKeys = [
  "scoreManipulation",
  "botAccount",
  "abusiveSupport",
  "harassment",
  "spam",
  "multiAccount",
  "paymentFraud",
  "devtools",
  "termsViolation"
];

export function AdminPage() {
  const { t } = useTranslation();
  const [users, setUsers] = useState<AdminUserDto[]>([]);
  const [query, setQuery] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [action, setAction] = useState<{ type: AdminAction; user: AdminUserDto } | null>(null);
  const [actionText, setActionText] = useState("");
  const [supportTickets, setSupportTickets] = useState<SupportTicketDto[]>([]);
  const [supportStatus, setSupportStatus] = useState<SupportTicketStatus | "ALL">("ALL");
  const [supportAction, setSupportAction] = useState<SupportAction | null>(null);
  const [supportResponse, setSupportResponse] = useState("");

  const actionTitle = useMemo(() => {
    if (!action) {
      return "";
    }
    return t(`admin.${action.type}`);
  }, [action, t]);

  async function loadUsers(search = query) {
    setBusy(true);
    setError("");
    try {
      setUsers(await adminApi.users(search));
    } catch (error) {
      setError(error instanceof Error ? error.message : t("common.error"));
    } finally {
      setBusy(false);
    }
  }

  async function loadSupportTickets(status = supportStatus) {
    try {
      setSupportTickets(await supportApi.adminTickets(status));
    } catch (error) {
      setError(error instanceof Error ? error.message : t("common.error"));
    }
  }

  useEffect(() => {
    void loadUsers("");
    void loadSupportTickets();
  }, []);

  function openAction(type: AdminAction, user: AdminUserDto) {
    setAction({ type, user });
    setActionText(
      type === "thank"
        ? t("admin.defaultThanks")
        : type === "ban"
          ? t("admin.defaultBanReason")
          : t("admin.defaultUnbanReason")
    );
  }

  async function submitAction() {
    if (!action) {
      return;
    }

    setBusy(true);
    setError("");
    try {
      const updated =
        action.type === "ban"
          ? await adminApi.banUser(action.user.id, actionText)
          : action.type === "unban"
            ? await adminApi.unbanUser(action.user.id, actionText)
            : null;

      if (action.type === "thank") {
        await adminApi.thankUser(action.user.id, actionText);
        await loadUsers(query);
      } else if (updated) {
        setUsers((current) => current.map((user) => (user.id === updated.id ? updated : user)));
      }

      setAction(null);
    } catch (error) {
      setError(error instanceof Error ? error.message : t("common.error"));
    } finally {
      setBusy(false);
    }
  }

  function openSupportAction(ticket: SupportTicketDto, status: SupportTicketStatus) {
    setSupportAction({ ticket, status });
    setSupportResponse(ticket.adminResponse ?? "");
  }

  async function submitSupportAction() {
    if (!supportAction) {
      return;
    }

    setBusy(true);
    setError("");
    try {
      const updated = await supportApi.adminUpdateTicket(supportAction.ticket.id, {
        status: supportAction.status,
        adminResponse: supportResponse.trim() || supportAction.ticket.adminResponse || undefined
      });
      setSupportTickets((current) => current.map((ticket) => (ticket.id === updated.id ? updated : ticket)));
      setSupportAction(null);
    } catch (error) {
      setError(error instanceof Error ? error.message : t("common.error"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="grid gap-6">
      <div>
        <div className="mb-3 inline-flex items-center gap-2 rounded-md bg-cyanGlow px-3 py-2 text-sm font-black text-ink">
          <ShieldCheck size={17} />
          {t("nav.admin")}
        </div>
        <h1 className="text-4xl font-black text-white neon-text">{t("admin.title")}</h1>
        <p className="mt-2 max-w-3xl text-slate-300">{t("admin.subtitle")}</p>
      </div>

      <form
        className="flex flex-col gap-3 rounded-lg border border-white/10 bg-white/5 p-4 sm:flex-row"
        onSubmit={(event) => {
          event.preventDefault();
          void loadUsers(query);
        }}
      >
        <Input label={t("admin.search")} value={query} onChange={(event) => setQuery(event.target.value)} className="w-full" />
        <Button type="submit" disabled={busy} icon={<Search size={18} />}>
          {t("admin.searchButton")}
        </Button>
      </form>

      {error ? <div className="rounded-md border border-magentaGlow/40 bg-magentaGlow/10 p-3 text-sm text-pink-200">{error}</div> : null}

      <div className="arcade-border overflow-hidden rounded-lg">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[58rem] text-left text-sm">
            <thead className="text-slate-400">
              <tr className="border-b border-white/10">
                <th className="p-4">{t("admin.player")}</th>
                <th className="p-4">{t("admin.status")}</th>
                <th className="p-4">{t("admin.score")}</th>
                <th className="p-4">{t("admin.coins")}</th>
                <th className="p-4">{t("admin.lastAction")}</th>
                <th className="p-4">{t("admin.actions")}</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user.id} className="border-b border-white/5">
                  <td className="p-4">
                    <div className="font-bold text-white">{user.displayName}</div>
                    <div className="text-xs text-slate-400">{user.email}</div>
                  </td>
                  <td className="p-4">
                    <span
                      className={`rounded-md px-2 py-1 text-xs font-black ${
                        user.status === "BANNED" ? "bg-magentaGlow/20 text-pink-200" : "bg-cyanGlow/15 text-cyanGlow"
                      }`}
                    >
                      {user.status}
                    </span>
                    {user.banReason ? <div className="mt-2 max-w-xs text-xs text-slate-400">{user.banReason}</div> : null}
                  </td>
                  <td className="p-4 font-bold text-white">{user.highScore}</td>
                  <td className="p-4 text-goldGlow">{user.coins}</td>
                  <td className="p-4 text-slate-300">{user.lastAction?.action ?? "-"}</td>
                  <td className="p-4">
                    <div className="flex flex-wrap gap-2">
                      {user.status === "BANNED" ? (
                        <Button type="button" variant="secondary" onClick={() => openAction("unban", user)} icon={<ShieldCheck size={16} />}>
                          {t("admin.unban")}
                        </Button>
                      ) : (
                        <Button type="button" variant="danger" onClick={() => openAction("ban", user)} icon={<Ban size={16} />}>
                          {t("admin.ban")}
                        </Button>
                      )}
                      <Button type="button" variant="ghost" onClick={() => openAction("thank", user)} icon={<HeartHandshake size={16} />}>
                        {t("admin.thank")}
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
              {!users.length ? (
                <tr>
                  <td className="p-4 text-slate-400" colSpan={6}>
                    {busy ? t("common.loading") : t("admin.empty")}
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>

      <div className="arcade-border rounded-lg p-5">
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className="flex items-center gap-2 text-xl font-black text-white">
            <Inbox size={20} className="text-cyanGlow" />
            {t("admin.supportInbox")}
          </h2>
          <Button type="button" variant="ghost" onClick={() => void loadSupportTickets()}>
            {t("admin.refresh")}
          </Button>
        </div>
        <div className="mb-4 flex flex-wrap gap-2">
          {(["ALL", "OPEN", "ANSWERED", "CLOSED"] as Array<SupportTicketStatus | "ALL">).map((status) => (
            <button
              key={status}
              type="button"
              onClick={() => {
                setSupportStatus(status);
                void loadSupportTickets(status);
              }}
              className={`rounded-md border px-3 py-2 text-xs font-black transition ${
                supportStatus === status
                  ? "border-cyanGlow bg-cyanGlow text-ink"
                  : "border-white/10 bg-white/5 text-slate-300 hover:border-cyanGlow"
              }`}
            >
              {status}
            </button>
          ))}
        </div>
        <div className="grid gap-3">
          {supportTickets.map((ticket) => (
            <article key={ticket.id} className="rounded-lg border border-white/10 bg-white/5 p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <div className="font-black text-white">{ticket.subject}</div>
                  <div className="mt-1 text-xs text-slate-400">
                    {ticket.displayName} · {ticket.userEmail} · {t(`support.categories.${ticket.category}`)}
                  </div>
                </div>
                <span className="rounded-md bg-cyanGlow/15 px-2 py-1 text-xs font-black text-cyanGlow">{ticket.status}</span>
              </div>
              <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-slate-300">{ticket.message}</p>
              {ticket.adminResponse ? (
                <div className="mt-3 rounded-md border border-cyanGlow/30 bg-cyanGlow/10 p-3 text-sm text-slate-100">{ticket.adminResponse}</div>
              ) : null}
              <div className="mt-4 flex flex-wrap gap-2">
                <Button type="button" variant="secondary" onClick={() => openSupportAction(ticket, "ANSWERED")}>
                  {t("admin.reply")}
                </Button>
                <Button type="button" variant="ghost" onClick={() => openSupportAction(ticket, "CLOSED")}>
                  {t("admin.closeTicket")}
                </Button>
              </div>
            </article>
          ))}
          {!supportTickets.length ? <div className="text-sm text-slate-400">{t("admin.noTickets")}</div> : null}
        </div>
      </div>

      {action ? (
        <Modal title={actionTitle} closeLabel={t("common.close")} onClose={() => setAction(null)}>
          <div className="grid gap-4">
            <div className="flex items-center gap-3 rounded-md border border-white/10 bg-white/5 p-3 text-sm text-slate-300">
              <ShieldOff size={18} className="text-cyanGlow" />
              <span>{action.user.displayName}</span>
            </div>
            <label className="grid gap-2 text-sm text-slate-300">
              <span>{action.type === "thank" ? t("admin.message") : t("admin.reason")}</span>
              {action.type === "ban" ? (
                <div className="grid grid-cols-2 gap-2">
                  {banReasonKeys.map((key) => (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setActionText(t(`admin.banReasons.${key}`))}
                      className="rounded-md border border-white/10 bg-white/5 px-3 py-2 text-left text-xs font-bold text-slate-300 hover:border-cyanGlow hover:text-white"
                    >
                      {t(`admin.banReasons.${key}`)}
                    </button>
                  ))}
                </div>
              ) : null}
              <textarea
                value={actionText}
                onChange={(event) => setActionText(event.target.value)}
                rows={5}
                className="rounded-md border border-slate-700 bg-ink/70 px-3 py-2 text-slate-50 outline-none transition placeholder:text-slate-500 focus:border-cyanGlow focus:ring-2 focus:ring-cyanGlow/20"
              />
            </label>
            <Button type="button" disabled={busy} onClick={() => void submitAction()}>
              {t("admin.confirm")}
            </Button>
          </div>
        </Modal>
      ) : null}

      {supportAction ? (
        <Modal title={t("admin.reply")} closeLabel={t("common.close")} onClose={() => setSupportAction(null)}>
          <div className="grid gap-4">
            <div className="rounded-md border border-white/10 bg-white/5 p-3 text-sm text-slate-300">
              <div className="font-black text-white">{supportAction.ticket.subject}</div>
              <div className="mt-2 whitespace-pre-wrap leading-6">{supportAction.ticket.message}</div>
            </div>
            <label className="grid gap-2 text-sm text-slate-300">
              <span>{t("admin.message")}</span>
              <textarea
                value={supportResponse}
                onChange={(event) => setSupportResponse(event.target.value)}
                rows={6}
                className="rounded-md border border-slate-700 bg-ink/70 px-3 py-2 text-slate-50 outline-none transition placeholder:text-slate-500 focus:border-cyanGlow focus:ring-2 focus:ring-cyanGlow/20"
              />
            </label>
            <Button type="button" disabled={busy} onClick={() => void submitSupportAction()}>
              {supportAction.status === "CLOSED" ? t("admin.closeTicket") : t("admin.reply")}
            </Button>
          </div>
        </Modal>
      ) : null}
    </section>
  );
}
