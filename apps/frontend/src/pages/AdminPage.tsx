import { useEffect, useMemo, useState } from "react";
import { Ban, ClipboardCheck, Copy, HeartHandshake, History, Inbox, KeyRound, MailCheck, Search, Send, ShieldAlert, ShieldCheck, ShieldOff, Trophy } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "../components/ui/Button";
import { Input } from "../components/ui/Input";
import { Modal } from "../components/ui/Modal";
import { adminApi } from "../services/adminApi";
import { supportApi } from "../services/supportApi";
import type { AdminAuditLogDto, AdminUserDto, RestrictionType, ScoreReviewDto, SupportTicketDto, SupportTicketSource, SupportTicketStatus } from "../types/api";

type AdminAction = "ban" | "unban" | "thank" | "resetScores";
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
  const [notice, setNotice] = useState("");
  const [action, setAction] = useState<{ type: AdminAction; user: AdminUserDto } | null>(null);
  const [actionText, setActionText] = useState("");
  const [supportTickets, setSupportTickets] = useState<SupportTicketDto[]>([]);
  const [supportStatus, setSupportStatus] = useState<SupportTicketStatus | "ALL">("ALL");
  const [supportSource, setSupportSource] = useState<SupportTicketSource | "ALL">("ALL");
  const [supportAction, setSupportAction] = useState<SupportAction | null>(null);
  const [supportResponse, setSupportResponse] = useState("");
  const [supportInternalNote, setSupportInternalNote] = useState("");
  const [supportAppealStatus, setSupportAppealStatus] = useState("");
  const [emailVerificationUser, setEmailVerificationUser] = useState<AdminUserDto | null>(null);
  const [temporaryPassword, setTemporaryPassword] = useState<{ user: AdminUserDto; value: string } | null>(null);
  const [scores, setScores] = useState<ScoreReviewDto[]>([]);
  const [scoreAction, setScoreAction] = useState<{ score: ScoreReviewDto; status: "valid" | "rejected" | "hidden" } | null>(null);
  const [scoreReason, setScoreReason] = useState("");
  const [auditLogs, setAuditLogs] = useState<AdminAuditLogDto[]>([]);
  const [guestTransfers, setGuestTransfers] = useState<Array<{ id: string; userId: string; status: string; bestScore: number; transferredScore: number; reason?: string | null; createdAt: string }>>([]);
  const [restrictionUser, setRestrictionUser] = useState<AdminUserDto | null>(null);
  const [restrictionType, setRestrictionType] = useState<RestrictionType>("leaderboard_restriction");
  const [restrictionReason, setRestrictionReason] = useState("");

  const actionTitle = useMemo(() => {
    if (!action) {
      return "";
    }
    return action.type === "resetScores" ? "Reset user scores" : t(`admin.${action.type}`);
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

  async function loadSupportTickets(status = supportStatus, source = supportSource) {
    try {
      setSupportTickets(await supportApi.adminTickets(status, source));
    } catch (error) {
      setError(error instanceof Error ? error.message : t("common.error"));
    }
  }

  async function loadModerationData() {
    try {
      const [scoreRows, logs, transfers] = await Promise.all([adminApi.scores("all"), adminApi.auditLogs(), adminApi.guestTransfers()]);
      setScores(scoreRows);
      setAuditLogs(logs);
      setGuestTransfers(transfers);
    } catch (error) {
      setError(error instanceof Error ? error.message : t("common.error"));
    }
  }

  async function copySupportEmail(email?: string) {
    if (!email) {
      return;
    }
    try {
      await navigator.clipboard.writeText(email);
      setNotice(t("admin.emailCopied"));
    } catch {
      setError(t("common.error"));
    }
  }

  useEffect(() => {
    void loadUsers("");
    void loadSupportTickets();
    void loadModerationData();
  }, []);

  function openAction(type: AdminAction, user: AdminUserDto) {
    setAction({ type, user });
    setActionText(
      type === "thank"
        ? t("admin.defaultThanks")
        : type === "ban"
          ? t("admin.defaultBanReason")
          : type === "resetScores"
            ? "Confirmed score manipulation or administrator correction."
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
            : action.type === "resetScores"
              ? await adminApi.resetScores(action.user.id, actionText)
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

  async function resetPassword(user: AdminUserDto) {
    setBusy(true);
    setError("");
    try {
      const result = await adminApi.resetPassword(user.id);
      setTemporaryPassword({ user: result.user, value: result.temporaryPassword });
      setUsers((current) => current.map((item) => item.id === result.user.id ? result.user : item));
      await loadModerationData();
    } catch (error) {
      setError(error instanceof Error ? error.message : t("common.error"));
    } finally {
      setBusy(false);
    }
  }

  async function setTrust(user: AdminUserDto, trusted: boolean) {
    setBusy(true);
    try {
      const updated = await adminApi.setTrust(user.id, trusted ? "TRUSTED" : "SUSPICIOUS", trusted ? "Administrator reviewed the account as trusted." : "Account requires additional anti-cheat review.");
      setUsers((current) => current.map((item) => item.id === updated.id ? updated : item));
      await loadModerationData();
    } catch (error) {
      setError(error instanceof Error ? error.message : t("common.error"));
    } finally {
      setBusy(false);
    }
  }

  async function submitScoreAction() {
    if (!scoreAction) return;
    setBusy(true);
    try {
      const updated = await adminApi.moderateScore(scoreAction.score.id, scoreAction.status, scoreReason.trim());
      setScores((current) => current.map((score) => score.id === updated.id ? updated : score));
      setScoreAction(null);
      await loadModerationData();
    } catch (error) {
      setError(error instanceof Error ? error.message : t("common.error"));
    } finally {
      setBusy(false);
    }
  }

  async function submitRestriction() {
    if (!restrictionUser) return;
    setBusy(true);
    try {
      const restriction = await adminApi.createRestriction(restrictionUser.id, { type: restrictionType, reason: restrictionReason.trim() });
      setUsers((current) => current.map((user) => user.id === restrictionUser.id ? { ...user, activeRestrictions: [restriction, ...user.activeRestrictions] } : user));
      setRestrictionUser(null);
      await loadModerationData();
    } catch (error) {
      setError(error instanceof Error ? error.message : t("common.error"));
    } finally {
      setBusy(false);
    }
  }

  async function removeRestriction(user: AdminUserDto, restrictionId: string) {
    setBusy(true);
    try {
      await adminApi.removeRestriction(restrictionId, "Restriction removed by administrator.");
      setUsers((current) => current.map((item) => item.id === user.id ? { ...item, activeRestrictions: item.activeRestrictions.filter((restriction) => restriction.id !== restrictionId) } : item));
      await loadModerationData();
    } catch (error) {
      setError(error instanceof Error ? error.message : t("common.error"));
    } finally {
      setBusy(false);
    }
  }

  function openSupportAction(ticket: SupportTicketDto, status: SupportTicketStatus) {
    setSupportAction({ ticket, status });
    setSupportResponse(ticket.adminResponse ?? "");
    setSupportInternalNote(ticket.internalNote ?? "");
    setSupportAppealStatus(ticket.appealStatus ?? "");
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
        adminResponse: supportResponse.trim() || supportAction.ticket.adminResponse || undefined,
        internalNote: supportInternalNote.trim() || undefined,
        appealStatus: supportAppealStatus || undefined
      });
      setSupportTickets((current) => current.map((ticket) => (ticket.id === updated.id ? updated : ticket)));
      setSupportAction(null);
    } catch (error) {
      setError(error instanceof Error ? error.message : t("common.error"));
    } finally {
      setBusy(false);
    }
  }

  async function resendEmailVerification(user: AdminUserDto) {
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const result = await adminApi.resendEmailVerification(user.id);
      setUsers((current) => current.map((item) => (item.id === result.user.id ? result.user : item)));
      setNotice(result.emailSent ? t("admin.verificationEmailSent") : t("admin.verificationEmailFailed"));
    } catch (error) {
      setError(error instanceof Error ? error.message : t("common.error"));
    } finally {
      setBusy(false);
    }
  }

  async function verifyEmailManually(user: AdminUserDto) {
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const updated = await adminApi.verifyEmailManually(user.id);
      setUsers((current) => current.map((item) => (item.id === updated.id ? updated : item)));
      setNotice(t("admin.emailVerifiedManually"));
      setEmailVerificationUser(null);
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
      {notice ? <div className="rounded-md border border-cyanGlow/30 bg-cyanGlow/10 p-3 text-sm text-cyanGlow">{notice}</div> : null}

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
                    <div className={`mt-1 text-xs font-bold ${user.emailVerifiedAt ? "text-cyanGlow" : "text-goldGlow"}`}>
                      {user.emailVerifiedAt ? t("admin.emailVerified") : t("admin.emailUnverified")}
                    </div>
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
                    <div className="mt-2 text-xs font-black text-goldGlow">{user.trustStatus}</div>
                    {user.activeRestrictions.length ? <div className="mt-1 text-xs text-pink-200">{user.activeRestrictions.length} active restriction(s)</div> : null}
                    {user.activeRestrictions.map((restriction) => <button key={restriction.id} type="button" disabled={busy} onClick={() => void removeRestriction(user, restriction.id)} className="mt-1 block text-xs font-bold text-cyanGlow hover:text-white">Remove {restriction.type.replaceAll("_", " ")}</button>)}
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
                      <Button type="button" variant="secondary" disabled={busy} onClick={() => void resetPassword(user)} icon={<KeyRound size={16} />}>
                        Reset password
                      </Button>
                      <Button type="button" variant="ghost" onClick={() => openAction("resetScores", user)} icon={<Trophy size={16} />}>
                        Reset scores
                      </Button>
                      <Button type="button" variant="ghost" onClick={() => void setTrust(user, user.trustStatus !== "TRUSTED")} icon={<ClipboardCheck size={16} />}>
                        {user.trustStatus === "TRUSTED" ? "Mark suspicious" : "Mark trusted"}
                      </Button>
                      <Button type="button" variant="ghost" onClick={() => { setRestrictionUser(user); setRestrictionReason(""); }} icon={<ShieldAlert size={16} />}>
                        Restrict
                      </Button>
                      {!user.emailVerifiedAt ? (
                        <>
                          <Button
                            type="button"
                            variant="secondary"
                            disabled={busy}
                            onClick={() => void resendEmailVerification(user)}
                            icon={<Send size={16} />}
                          >
                            {t("admin.resendVerification")}
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            disabled={busy}
                            onClick={() => setEmailVerificationUser(user)}
                            icon={<MailCheck size={16} />}
                          >
                            {t("admin.verifyEmailManually")}
                          </Button>
                        </>
                      ) : null}
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
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h2 className="flex items-center gap-2 text-xl font-black text-white"><Trophy size={20} className="text-goldGlow" /> Score moderation</h2>
          <Button type="button" variant="ghost" onClick={() => void loadModerationData()}>Refresh</Button>
        </div>
        <div className="grid gap-3">
          {scores.filter((score) => score.status !== "valid" || score.reviewReason).map((score) => (
            <article key={score.id} className="rounded-lg border border-white/10 bg-white/5 p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div><div className="font-black text-white">{score.displayName} | {score.score}</div><div className="mt-1 text-xs text-slate-400">{score.status} | {score.durationMs} ms | distance {score.distance}</div></div>
                <span className="rounded-md bg-magentaGlow/15 px-2 py-1 text-xs font-black text-pink-200">{score.status}</span>
              </div>
              <p className="mt-3 text-sm leading-6 text-slate-300">Reason: {score.reviewReason || "No reason recorded"}</p>
              {score.session ? <div className="mt-2 text-xs text-slate-500">Coins {score.session.coinsCollected} | hits {score.session.obstacleHits} | {score.session.antiCheatNotes || "no session flags"}</div> : null}
              <div className="mt-4 flex flex-wrap gap-2">
                <Button type="button" variant="secondary" onClick={() => { setScoreAction({ score, status: "valid" }); setScoreReason("Score reviewed and approved by administrator."); }}>Approve</Button>
                <Button type="button" variant="danger" onClick={() => { setScoreAction({ score, status: "rejected" }); setScoreReason(score.reviewReason || "Score rejected after review."); }}>Reject</Button>
                <Button type="button" variant="ghost" onClick={() => { setScoreAction({ score, status: "hidden" }); setScoreReason("Score hidden by administrator."); }}>Hide</Button>
                {users.find((user) => user.id === score.userId) ? <Button type="button" variant="danger" onClick={() => { const target = users.find((user) => user.id === score.userId); if (target) { openAction("ban", target); setActionText(`Cheating: ${score.reviewReason || "invalid score submission"}`); } }}>Ban for cheating</Button> : null}
              </div>
            </article>
          ))}
          {!scores.some((score) => score.status !== "valid" || score.reviewReason) ? <div className="text-sm text-slate-400">No scores need review.</div> : null}
          <details className="rounded-md border border-white/10 bg-white/5 p-3 text-sm text-slate-300"><summary className="cursor-pointer font-black text-white">Valid score history ({scores.filter((score) => score.status === "valid").length})</summary><div className="mt-3 grid gap-2">{scores.filter((score) => score.status === "valid").slice(0, 30).map((score) => <div key={score.id} className="flex justify-between gap-3 border-t border-white/5 pt-2"><span>{score.displayName}</span><strong className="text-cyanGlow">{score.score}</strong></div>)}</div></details>
        </div>
      </div>

      <div className="grid gap-5 xl:grid-cols-2">
        <div className="arcade-border rounded-lg p-5">
          <h2 className="flex items-center gap-2 text-xl font-black text-white"><History size={20} className="text-cyanGlow" /> Admin audit log</h2>
          <div className="mt-4 grid max-h-[32rem] gap-2 overflow-y-auto pr-2">
            {auditLogs.map((log) => <div key={log.id} className="rounded-md border border-white/10 bg-white/5 p-3 text-xs leading-5 text-slate-300"><strong className="text-white">{log.actionType}</strong><div>{log.reason || "No reason"}</div><div className="text-slate-500">{new Date(log.createdAt).toLocaleString()} | {log.adminEmail || "system"}</div></div>)}
          </div>
        </div>
        <div className="arcade-border rounded-lg p-5">
          <h2 className="text-xl font-black text-white">Guest transfer attempts</h2>
          <div className="mt-4 grid max-h-[32rem] gap-2 overflow-y-auto pr-2">
            {guestTransfers.map((transfer) => <div key={transfer.id} className="rounded-md border border-white/10 bg-white/5 p-3 text-xs leading-5 text-slate-300"><strong className="text-white">{transfer.status}</strong> | local {transfer.bestScore} | moved {transfer.transferredScore}<div>{transfer.reason || "Passed validation"}</div><div className="text-slate-500">{new Date(transfer.createdAt).toLocaleString()}</div></div>)}
            {!guestTransfers.length ? <div className="text-sm text-slate-400">No transfer attempts.</div> : null}
          </div>
        </div>
      </div>

      <div className="arcade-border rounded-lg p-5">
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className="flex items-center gap-2 text-xl font-black text-white">
            <Inbox size={20} className="text-cyanGlow" />
            {t("admin.supportInbox")}
          </h2>
          <Button type="button" variant="ghost" onClick={() => void loadSupportTickets(supportStatus, supportSource)}>
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
                void loadSupportTickets(status, supportSource);
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
        <div className="mb-4 flex flex-wrap gap-2">
          {(["ALL", "GUEST", "ACCOUNT"] as Array<SupportTicketSource | "ALL">).map((source) => (
            <button
              key={source}
              type="button"
              onClick={() => {
                setSupportSource(source);
                void loadSupportTickets(supportStatus, source);
              }}
              className={`rounded-md border px-3 py-2 text-xs font-black transition ${
                supportSource === source
                  ? "border-goldGlow bg-goldGlow text-ink"
                  : "border-white/10 bg-white/5 text-slate-300 hover:border-goldGlow"
              }`}
            >
              {t(`admin.ticketSources.${source}`)}
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
                    {ticket.displayName} | {ticket.userEmail} | {t(`support.categories.${ticket.category}`)}
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  <span className="rounded-md bg-goldGlow/15 px-2 py-1 text-xs font-black text-goldGlow">
                    {t(`admin.ticketSources.${ticket.source}`)}
                  </span>
                  <span className="rounded-md bg-cyanGlow/15 px-2 py-1 text-xs font-black text-cyanGlow">{ticket.status}</span>
                </div>
              </div>
              <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-slate-300">{ticket.message}</p>
              {ticket.relatedEntityId ? <div className="mt-2 text-xs font-bold text-goldGlow">Related: {ticket.relatedEntityId}</div> : null}
              {ticket.appealStatus ? <div className="mt-2 text-xs font-black text-cyanGlow">Appeal: {ticket.appealStatus}</div> : null}
              {ticket.adminResponse ? (
                <div className="mt-3 rounded-md border border-cyanGlow/30 bg-cyanGlow/10 p-3 text-sm text-slate-100">{ticket.adminResponse}</div>
              ) : null}
              <div className="mt-4 flex flex-wrap gap-2">
                {ticket.userEmail ? (
                  <Button type="button" variant="ghost" onClick={() => void copySupportEmail(ticket.userEmail)} icon={<Copy size={16} />}>
                    {t("admin.copyEmail")}
                  </Button>
                ) : null}
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
            {(supportAction.ticket.category === "APPEAL" || supportAction.ticket.category === "BAN_APPEAL") ? (
              <label className="grid gap-2 text-sm text-slate-300">Appeal decision<select value={supportAppealStatus} onChange={(event) => setSupportAppealStatus(event.target.value)} className="min-h-11 rounded-md border border-slate-700 bg-ink px-3 text-white"><option value="UNDER_REVIEW">Under review</option><option value="UPHELD">Keep restriction</option><option value="REMOVED">Remove restriction</option><option value="RESTORED">Restore score</option><option value="REJECTED">Reject appeal</option></select></label>
            ) : null}
            <label className="grid gap-2 text-sm text-slate-300">Internal note (not shown to player)<textarea value={supportInternalNote} onChange={(event) => setSupportInternalNote(event.target.value)} rows={3} className="rounded-md border border-slate-700 bg-ink/70 px-3 py-2 text-slate-50" /></label>
            <Button type="button" disabled={busy} onClick={() => void submitSupportAction()}>
              {supportAction.status === "CLOSED" ? t("admin.closeTicket") : t("admin.reply")}
            </Button>
          </div>
        </Modal>
      ) : null}

      {emailVerificationUser ? (
        <Modal title={t("admin.verifyEmailManually")} closeLabel={t("common.close")} onClose={() => setEmailVerificationUser(null)}>
          <div className="grid gap-4">
            <div className="rounded-md border border-white/10 bg-white/5 p-3">
              <div className="font-black text-white">{emailVerificationUser.displayName}</div>
              <div className="mt-1 text-sm text-slate-300">{emailVerificationUser.email}</div>
            </div>
            <p className="text-sm leading-6 text-slate-300">{t("admin.manualVerifyWarning")}</p>
            <Button type="button" disabled={busy} onClick={() => void verifyEmailManually(emailVerificationUser)} icon={<MailCheck size={18} />}>
              {t("admin.confirm")}
            </Button>
          </div>
        </Modal>
      ) : null}

      {temporaryPassword ? (
        <Modal title="Temporary password" closeLabel="Close permanently" onClose={() => setTemporaryPassword(null)}>
          <div className="grid gap-4">
            <div className="rounded-md border border-goldGlow/30 bg-goldGlow/10 p-3 text-sm leading-6 text-slate-200">
              This password is shown only once. It is never stored or logged as plain text. The user must change it after login.
            </div>
            <div className="rounded-md border border-white/10 bg-ink p-4 font-mono text-lg font-black text-white">{temporaryPassword.value}</div>
            <Button type="button" onClick={() => void navigator.clipboard.writeText(temporaryPassword.value)} icon={<Copy size={18} />}>Copy temporary password</Button>
            <Button type="button" variant="danger" onClick={() => setTemporaryPassword(null)}>Close and hide forever</Button>
          </div>
        </Modal>
      ) : null}

      {scoreAction ? (
        <Modal title={`${scoreAction.status} score`} closeLabel={t("common.close")} onClose={() => setScoreAction(null)}>
          <div className="grid gap-4">
            <div className="rounded-md border border-white/10 bg-white/5 p-3 text-sm text-slate-300">{scoreAction.score.displayName} | {scoreAction.score.score}</div>
            <label className="grid gap-2 text-sm text-slate-300">Reason<textarea value={scoreReason} onChange={(event) => setScoreReason(event.target.value)} rows={5} className="rounded-md border border-slate-700 bg-ink p-3 text-white" /></label>
            <Button type="button" disabled={busy || scoreReason.trim().length < 3} onClick={() => void submitScoreAction()}>Confirm score decision</Button>
          </div>
        </Modal>
      ) : null}

      {restrictionUser ? (
        <Modal title="Add restriction" closeLabel={t("common.close")} onClose={() => setRestrictionUser(null)}>
          <div className="grid gap-4">
            <div className="font-black text-white">{restrictionUser.displayName}</div>
            <label className="grid gap-2 text-sm text-slate-300">Restriction type<select value={restrictionType} onChange={(event) => setRestrictionType(event.target.value as RestrictionType)} className="min-h-11 rounded-md border border-slate-700 bg-ink px-3 text-white"><option value="warning">Warning</option><option value="temporary_restriction">Temporary restriction</option><option value="support_restriction">Support restriction</option><option value="shop_restriction">Shop restriction</option><option value="leaderboard_restriction">Leaderboard restriction</option><option value="score_hidden">Score hidden</option><option value="rewards_removed">Rewards removed</option><option value="temporary_ban">Temporary ban</option><option value="permanent_ban">Permanent ban</option></select></label>
            <label className="grid gap-2 text-sm text-slate-300">Reason<textarea value={restrictionReason} onChange={(event) => setRestrictionReason(event.target.value)} rows={5} className="rounded-md border border-slate-700 bg-ink p-3 text-white" /></label>
            <Button type="button" disabled={busy || restrictionReason.trim().length < 3} onClick={() => void submitRestriction()}>Apply restriction</Button>
          </div>
        </Modal>
      ) : null}
    </section>
  );
}
